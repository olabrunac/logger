import csv
import io
import json
import re
import time
import unicodedata
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
import datetime
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app import crud, schemas
from app.api import deps
from app.core.config import settings
from app.models.media import MediaType, LogStatus, MediaItem, LogEntry, EpisodeWatched, Achievement
from app.crud.crud_media import CRUDMediaItem
from app.services import tmdb_service, steam_service, igdb_service

router = APIRouter()

_BETA_RE = re.compile(r"public beta", re.IGNORECASE)


def _cover_exists(url: str) -> bool:
    """Check if a cover image URL returns a valid response."""
    try:
        r = requests.head(url, timeout=10, allow_redirects=True)
        return r.status_code == 200
    except Exception:
        return False


def _steam_cover_url(appid: int) -> Optional[str]:
    """Resolve a working Steam cover URL, trying the legacy CDN first with fallback to the new one."""
    urls = [
        f"https://cdn.akamai.steamstatic.com/steam/apps/{appid}/library_600x900.jpg",
        f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900.jpg",
    ]
    for url in urls:
        if _cover_exists(url):
            return url
    return None


def _steam_fallback_cover(appid: int) -> Optional[Dict]:
    """Resolve a cover when Steam has no portrait art: IGDB cover (t_cover_big,
    retrato) primeiro, capsule paisagem do Steam como último recurso."""
    try:
        igdb_id = igdb_service.get_igdb_id_from_steam(appid)
        if igdb_id:
            details = igdb_service.get_game_by_id(igdb_id)
            if details and details.get("cover_image_url"):
                return {"cover": details["cover_image_url"], "igdb_id": igdb_id}
    except Exception:
        pass
    for url in (
        f"https://cdn.akamai.steamstatic.com/steam/apps/{appid}/capsule_616x353.jpg",
        f"https://cdn.akamai.steamstatic.com/steam/apps/{appid}/header.jpg",
    ):
        if _cover_exists(url):
            return {"cover": url, "igdb_id": None}
    return None


class ImportItem(BaseModel):
    title: str
    year: Optional[int] = None
    media_type: Optional[str] = None
    tmdb_id: Optional[int] = None
    appid: Optional[int] = None
    rating: Optional[float] = None
    review: Optional[str] = None
    status: str = "completed"
    hours_spent: Optional[float] = None
    platform: Optional[str] = None
    log_date: Optional[str] = None
    family_share: bool = False


class ImportPreview(BaseModel):
    items: List[ImportItem]
    total: int
    source: str


class SteamImportRequest(BaseModel):
    steam_id: str
    abandoned_days: int = 120


class TraktItem(BaseModel):
    title: str
    year: Optional[int] = None
    rating: Optional[float] = None
    status: str = "completed"
    platform: Optional[str] = None


def _parse_letterboxd_rating(raw: str) -> Optional[float]:
    if not raw:
        return None
    try:
        val = float(raw)
        if val <= 5:
            return val
        if val <= 10:
            return val / 2
    except (ValueError, TypeError):
        pass
    return None


def _resolve_steam_id(steam_input: str) -> Optional[str]:
    steam_input = steam_input.strip()
    if steam_input.isdigit() and len(steam_input) == 17:
        return steam_input
    if "steamcommunity.com/id/" in steam_input:
        vanity = steam_input.rstrip("/").split("/")[-1]
    elif "steamcommunity.com/profiles/" in steam_input:
        sid = steam_input.rstrip("/").split("/")[-1]
        if sid.isdigit():
            return sid
        vanity = sid
    else:
        vanity = steam_input
    if not settings.STEAM_API_KEY:
        return None
    try:
        r = requests.get(
            "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/",
            params={"key": settings.STEAM_API_KEY, "vanityurl": vanity},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json().get("response", {})
        if data.get("success") == 1:
            return data.get("steamid")
    except Exception:
        pass
    return None


@router.post("/letterboxd/preview", response_model=ImportPreview)
async def letterboxd_preview(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...),
):
    content = await file.read()
    text = None

    if file.filename and file.filename.endswith(".zip"):
        try:
            with zipfile.ZipFile(io.BytesIO(content), "r") as zf:
                csv_name = None
                for name in zf.namelist():
                    if name.lower().endswith("diary.csv"):
                        csv_name = name
                        break
                if not csv_name:
                    for name in zf.namelist():
                        if name.lower().endswith(".csv"):
                            csv_name = name
                            break
                if not csv_name:
                    raise HTTPException(status_code=400, detail="No CSV file found inside the ZIP.")
                text = zf.read(csv_name).decode("utf-8-sig", errors="replace")
        except zipfile.BadZipFile:
            raise HTTPException(status_code=400, detail="Invalid ZIP file.")
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Error reading ZIP: {str(e)}")
    elif file.filename and file.filename.endswith(".csv"):
        text = content.decode("utf-8-sig", errors="replace")
    else:
        raise HTTPException(status_code=400, detail="Upload a CSV or ZIP file from Letterboxd.")

    reader = csv.DictReader(io.StringIO(text))

    # Also try to load ratings.csv, reviews.csv and watchlist.csv for merging
    extra_ratings: Dict[str, float] = {}
    extra_reviews: Dict[str, dict] = {}
    watchlist_items: List[dict] = []
    if file.filename and file.filename.endswith(".zip"):
        try:
            with zipfile.ZipFile(io.BytesIO(content if isinstance(content, bytes) else b""), "r") as zf2:
                for zname in zf2.namelist():
                    if zname.lower().endswith("ratings.csv") and "deleted" not in zname.lower() and "orphaned" not in zname.lower():
                        r_text = zf2.read(zname).decode("utf-8-sig", errors="replace")
                        r_reader = csv.DictReader(io.StringIO(r_text))
                        for r_row in r_reader:
                            r_name = (r_row.get("Name") or "").strip()
                            r_rating = (r_row.get("Rating") or "").strip()
                            if r_name and r_rating:
                                try:
                                    extra_ratings[r_name.lower()] = float(r_rating)
                                except (ValueError, TypeError):
                                    pass
                    elif zname.lower().endswith("reviews.csv") and "deleted" not in zname.lower() and "orphaned" not in zname.lower():
                        rv_text = zf2.read(zname).decode("utf-8-sig", errors="replace")
                        rv_reader = csv.DictReader(io.StringIO(rv_text))
                        for rv_row in rv_reader:
                            rv_name = (rv_row.get("Name") or "").strip()
                            rv_review = (rv_row.get("Review") or "").strip()
                            rv_rating = (rv_row.get("Rating") or "").strip()
                            rv_year = None
                            raw_ry = rv_row.get("Year")
                            if raw_ry:
                                try:
                                    rv_year = int(raw_ry)
                                except (ValueError, TypeError):
                                    pass
                            if rv_name:
                                key = rv_name.lower()
                                rv_entry: dict = {"review": rv_review}
                                if rv_rating:
                                    try:
                                        rv_entry["rating"] = float(rv_rating)
                                    except (ValueError, TypeError):
                                        pass
                                if rv_year:
                                    rv_entry["year"] = rv_year
                                extra_reviews[key] = rv_entry
                    elif zname.lower().endswith("watchlist.csv"):
                        w_text = zf2.read(zname).decode("utf-8-sig", errors="replace")
                        w_reader = csv.DictReader(io.StringIO(w_text))
                        for w_row in w_reader:
                            w_name = (w_row.get("Name") or "").strip()
                            w_year = None
                            raw_wy = w_row.get("Year")
                            if raw_wy:
                                try:
                                    w_year = int(raw_wy)
                                except (ValueError, TypeError):
                                    pass
                            if w_name:
                                watchlist_items.append({"title": w_name, "year": w_year})
        except Exception:
            pass

    items: List[ImportItem] = []
    seen = set()
    for row in reader:
        name = row.get("Name") or row.get("name") or ""
        if not name.strip():
            continue
        name_lower = name.strip().lower()
        if name_lower in seen:
            continue
        seen.add(name_lower)
        year = None
        raw_year = row.get("Year") or row.get("year")
        if raw_year:
            try:
                year = int(raw_year)
            except (ValueError, TypeError):
                pass
        rating = _parse_letterboxd_rating(row.get("Rating10") or row.get("Rating") or "")
        log_date = row.get("Watched Date") or row.get("WatchedDate") or row.get("Date") or ""
        is_rewatch = (row.get("Rewatch") or "").strip().lower() == "yes"
        status = "completed"
        items.append(ImportItem(
            title=name.strip(),
            year=year,
            rating=rating,
            status=status,
            log_date=log_date.strip() if log_date else None,
        ))

    # Merge ratings from ratings.csv for items without rating
    for item in items:
        if item.rating is None:
            r = extra_ratings.get(item.title.lower())
            if r is not None:
                item.rating = r

    # Merge reviews from reviews.csv
    for item in items:
        rv = extra_reviews.get(item.title.lower())
        if rv:
            if not item.review and rv.get("review"):
                item.review = rv["review"]
            if item.rating is None and rv.get("rating") is not None:
                item.rating = rv["rating"]

    # Add watchlist items
    for wl in watchlist_items:
        if wl["title"].lower().strip() not in seen:
            items.append(ImportItem(
                title=wl["title"],
                year=wl.get("year"),
                status="wishlist",
            ))

    return ImportPreview(items=items, total=len(items), source="letterboxd")


@router.post("/letterboxd/import")
async def letterboxd_import(
    *,
    user_id: int = Form(...),
    items_json: str = Form(...),
):
    try:
        items = json.loads(items_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid items JSON.")

    from app.services.import_jobs import start_job
    job_id = start_job(
        source="letterboxd",
        total=len(items),
        baseline_seconds_per_item=1.0,
        fn=lambda job, db: _run_letterboxd_import(job, db, user_id, items),
    )
    return {"job_id": job_id}


def _run_letterboxd_import(job, db, user_id: int, items: list) -> dict:
    created = 0
    skipped = 0
    enriched = 0
    media_crud = CRUDMediaItem(MediaItem)

    for idx, item in enumerate(items):
        title = item.get("title", "").strip()
        if not title:
            skipped += 1
            job.add_skipped({"title": item.get("title", ""), "reason": "empty_title"})
            job.progress(current=idx + 1, created=created, skipped=skipped)
            continue

        year = item.get("year")
        tmdb_id = item.get("tmdb_id")
        item_status = item.get("status", "completed")
        review_text = (item.get("review") or "").strip() or None

        if not tmdb_id:
            results = tmdb_service.search_media(query=title, media_type="movie", year=year)
            if results:
                best = results[0]
                tmdb_id = best.get("id")

        if not tmdb_id:
            existing = db.query(MediaItem).filter(
                MediaItem.title.ilike(title),
                MediaItem.media_type == MediaType.MOVIE,
            ).first()
            if existing:
                tmdb_id = existing.tmdb_id

        cover_url = None
        if tmdb_id:
            results = tmdb_service.search_media(query=title, media_type="movie", year=year)
            if results:
                poster = results[0].get("poster_path")
                if poster:
                    cover_url = f"https://image.tmdb.org/t/p/w500{poster}"

        if not tmdb_id:
            skipped += 1
            job.add_skipped({"title": title, "reason": "no_api_match"})
            job.progress(current=idx + 1, created=created, skipped=skipped)
            continue

        media_in = schemas.MediaItemCreate(
            title=title,
            media_type=MediaType.MOVIE,
            tmdb_id=tmdb_id,
            cover_image_url=cover_url,
        )
        media_item = media_crud.get_or_create(db, obj_in=media_in)

        if cover_url and not media_item.cover_image_url:
            media_item.cover_image_url = cover_url
            db.add(media_item)

        if not media_item.cover_image_url:
            skipped += 1
            job.add_skipped({"title": title, "reason": "no_cover"})
            job.progress(current=idx + 1, created=created, skipped=skipped)
            continue

        existing_log = db.query(LogEntry).filter(
            LogEntry.user_id == user_id,
            LogEntry.media_item_id == media_item.id,
        ).first()
        if existing_log:
            skipped += 1
            job.add_skipped({"title": title, "reason": "duplicate"})
            job.progress(current=idx + 1, created=created, skipped=skipped)
            continue

        log_date = None
        raw_date = item.get("log_date")
        if raw_date:
            try:
                log_date = datetime.datetime.strptime(raw_date[:10], "%Y-%m-%d")
            except (ValueError, TypeError):
                log_date = datetime.datetime.utcnow()
        else:
            log_date = datetime.datetime.utcnow()

        rating = item.get("rating")
        if rating is not None:
            try:
                rating = float(rating)
            except (ValueError, TypeError):
                rating = None

        try:
            log_status = LogStatus(item_status)
        except ValueError:
            log_status = LogStatus.COMPLETED

        log = LogEntry(
            user_id=user_id,
            media_item_id=media_item.id,
            log_date=log_date,
            rating=rating,
            review=review_text,
            status=log_status,
        )
        db.add(log)
        db.flush()
        created += 1
        job.add_imported({"title": title, "action": "created"})

        if tmdb_id:
            try:
                details = tmdb_service.get_movie_details(tmdb_id)
                if details:
                    for key, value in details.items():
                        if value:
                            setattr(media_item, key, value)
                    db.add(media_item)
                    enriched += 1
            except Exception:
                pass

        # Auto-calc hours from runtime for movies
        if log.hours_spent is None and media_item.runtime and media_item.media_type == MediaType.MOVIE:
            log.hours_spent = round(media_item.runtime / 60, 4)
            db.add(log)

        job.progress(current=idx + 1, created=created, skipped=skipped, enriched=enriched)

    db.commit()

    try:
        from app.crud.crud_user_badge import check_and_unlock
        new_badges = check_and_unlock(db, user_id)
        if new_badges:
            db.commit()
    except Exception:
        pass

    return {
        "created": created,
        "updated": 0,
        "skipped": skipped,
        "enriched": enriched,
        "total": len(items),
        "imported_items": job.imported_items,
        "skipped_items": job.skipped_items,
    }


@router.post("/steam/preview")
async def steam_preview(
    *,
    db: Session = Depends(deps.get_db),
    body: SteamImportRequest,
):
    steam_id = _resolve_steam_id(body.steam_id)
    if not steam_id:
        raise HTTPException(status_code=400, detail="Steam ID invalid or API key not configured.")

    if not settings.STEAM_API_KEY:
        raise HTTPException(status_code=500, detail="STEAM_API_KEY not configured in backend.")

    try:
        r = requests.get(
            "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/",
            params={
                "key": settings.STEAM_API_KEY,
                "steamid": steam_id,
                "include_appinfo": 1,
                "include_played_free_games": 1,
            },
            timeout=15,
        )
        r.raise_for_status()
        owned_data = r.json().get("response", {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching Steam data: {str(e)}")

    # "Family share do nosso jeito": jogos emprestados pela família aparecem nos
    # "jogados recentemente" (GetRecentlyPlayedGames) mesmo sem serem da conta.
    # Merge dedup por appid: comprados (GetOwnedGames) têm prioridade; jogos que
    # só aparecem nos recentes são marcados como compartilhados (sem access token).
    recent_games = {}
    try:
        r2 = requests.get(
            "https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/",
            params={
                "key": settings.STEAM_API_KEY,
                "steamid": steam_id,
                "count": 50,
            },
            timeout=15,
        )
        r2.raise_for_status()
        recent_games = {g.get("appid"): g for g in r2.json().get("response", {}).get("games", []) or []}
    except Exception:
        recent_games = {}

    owned_games = {g.get("appid"): g for g in owned_data.get("games", []) or []}
    all_games = {}
    for appid, g in owned_games.items():
        all_games[appid] = {"game": g, "family_share": False}
    for appid, g in recent_games.items():
        if appid in all_games:
            continue
        all_games[appid] = {"game": g, "family_share": True}

    items: List[ImportItem] = []
    for entry in all_games.values():
        g = entry["game"]
        name = (g.get("name") or "").strip()
        if not name:
            continue
        if _BETA_RE.search(name):
            continue
        appid = g.get("appid")
        playtime_minutes = g.get("playtime_forever", 0)
        hours = round(playtime_minutes / 60, 4) if playtime_minutes > 0 else None
        log_date = None
        rtime = g.get("rtime_last_played")
        ABANDONED_SECONDS = body.abandoned_days * 24 * 3600
        if playtime_minutes > 0 and rtime and (datetime.datetime.now().timestamp() - rtime) > ABANDONED_SECONDS:
            status = "dropped"
        else:
            status = "library"
        if rtime:
            try:
                log_date = datetime.datetime.fromtimestamp(rtime).isoformat()
            except Exception:
                pass
        items.append(ImportItem(
            title=name,
            appid=appid,
            hours_spent=hours,
            status=status,
            platform="Steam",
            log_date=log_date,
            family_share=entry["family_share"],
        ))

    items.sort(key=lambda x: x.hours_spent or 0, reverse=True)
    return ImportPreview(items=items, total=len(items), source="steam")


@router.post("/steam/import")
async def steam_import(
    *,
    user_id: int = Form(...),
    steam_id: str = Form(...),
    items_json: str = Form(...),
):
    try:
        items = json.loads(items_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid items JSON.")

    resolved_steam_id = _resolve_steam_id(steam_id)
    if not resolved_steam_id:
        raise HTTPException(status_code=400, detail="Steam ID invÃ¡lido.")

    from app.services.import_jobs import start_job
    job_id = start_job(
        source="steam",
        total=len(items),
        baseline_seconds_per_item=1.5,
        fn=lambda job, db: _run_steam_import(job, db, user_id, resolved_steam_id, items),
    )
    return {"job_id": job_id}


def _run_steam_import(job, db, user_id: int, resolved_steam_id: str, items: list) -> dict:
    from app.models.media import Achievement
    created = 0
    skipped = 0
    updated = 0
    media_crud = CRUDMediaItem(MediaItem)

    # Pre-resolve cover URLs for all appids in parallel (each HEAD ~1s, so
    # 276 games ≈ 5min serial → ~30s with 10 workers).
    cover_map: Dict[int, Optional[str]] = {}
    appids = [item.get("appid") for item in items if item.get("appid")]
    unique_appids = list(dict.fromkeys(appids))
    with ThreadPoolExecutor(max_workers=10) as executor:
        future_to_appid = {executor.submit(_steam_cover_url, appid): appid for appid in unique_appids}
        for future in as_completed(future_to_appid):
            appid = future_to_appid[future]
            try:
                cover_map[appid] = future.result()
            except Exception:
                cover_map[appid] = None

    for idx, item in enumerate(items):
        title = item.get("title", "").strip()
        if not title:
            skipped += 1
            job.add_skipped({"title": title, "reason": "empty_title"})
            job.progress(current=idx + 1, created=created, skipped=skipped)
            continue

        appid = item.get("appid")
        if not appid:
            skipped += 1
            job.add_skipped({"title": title, "reason": "no_appid"})
            job.progress(current=idx + 1, created=created, skipped=skipped)
            continue

        if _BETA_RE.search(title):
            skipped += 1
            job.add_skipped({"title": title, "reason": "public_beta"})
            job.progress(current=idx + 1, created=created, skipped=skipped)
            continue

        cover_url = cover_map.get(appid)
        fallback_igdb_id = None
        if not cover_url:
            # Tenta ao máximo: capa retrato do IGDB (t_cover_big), depois a
            # capsule paisagem do Steam. Só pula se não existir nenhuma.
            fallback = _steam_fallback_cover(appid)
            if fallback:
                cover_url = fallback["cover"]
                fallback_igdb_id = fallback["igdb_id"]
        if not cover_url:
            skipped += 1
            job.add_skipped({"title": title, "reason": "no_cover"})
            job.progress(current=idx + 1, created=created, skipped=skipped)
            continue
        steam_details = steam_service.get_app_details(appid)
        time.sleep(0.5)

        media_in = schemas.MediaItemCreate(
            title=title,
            media_type=MediaType.GAME,
            steam_appid=appid,
            cover_image_url=cover_url,
        )
        media_item = media_crud.get_or_create(db, obj_in=media_in)

        if cover_url:
            media_item.cover_image_url = cover_url
            db.add(media_item)
        if fallback_igdb_id and not media_item.igdb_id:
            media_item.igdb_id = fallback_igdb_id
            db.add(media_item)

        if steam_details:
            try:
                parsed = steam_service.parse_steam_game_data(steam_details)
                for key, value in parsed.items():
                    if value:
                        setattr(media_item, key, value)
                db.add(media_item)
            except Exception:
                pass

        existing_log = db.query(LogEntry).filter(
            LogEntry.user_id == user_id,
            LogEntry.media_item_id == media_item.id,
        ).first()

        status_str = item.get("status", "completed")
        try:
            log_status = LogStatus(status_str)
        except ValueError:
            log_status = LogStatus.COMPLETED

        hours = item.get("hours_spent")
        new_family_share = bool(item.get("family_share", False))

        if existing_log:
            is_update = True
            log = existing_log
            # Re-import: horas são SUBSTITUÍDAS se o novo import tiver mais horas OU
            # se a diferença for só do arredondamento antigo (round-1, erro ≤ 0.05h) —
            # nesse caso o valor novo (minuto a minuto) é o preciso. Nunca somadas.
            if hours is not None and (
                log.hours_spent is None
                or hours > log.hours_spent
                or abs(hours - log.hours_spent) < 0.06
            ):
                log.hours_spent = hours
            if log.family_share != new_family_share:
                log.family_share = new_family_share
        else:
            is_update = False
            log_date = None
            if item.get("log_date"):
                try:
                    log_date = datetime.datetime.fromisoformat(item["log_date"])
                except (ValueError, TypeError):
                    log_date = datetime.datetime.utcnow()
            else:
                log_date = datetime.datetime.utcnow()

            log = LogEntry(
                user_id=user_id,
                media_item_id=media_item.id,
                log_date=log_date,
                status=log_status,
                hours_spent=hours,
                platform="Steam",
                family_share=new_family_share,
            )
            db.add(log)
            db.flush()

        ach_count = 0
        achievements_checked = False
        unlocked_count = 0
        player_total = 0
        schema_total = 0

        # Import Steam achievements
        if resolved_steam_id and appid:
            try:
                ach_url = "https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/"
                ach_r = requests.get(ach_url, params={
                    "key": settings.STEAM_API_KEY,
                    "steamid": resolved_steam_id,
                    "appid": appid,
                    "l": "pt-br",
                }, timeout=15)
                ach_r.raise_for_status()
                ach_data = ach_r.json().get("playerstats", {})
                achievements = ach_data.get("achievements")
                if isinstance(achievements, list):
                    achievements_checked = True
                    player_total = len(achievements)
                    for a in achievements:
                        if not isinstance(a, dict):
                            continue
                        ext_id = a.get("apiname", "")
                        if not ext_id:
                            continue
                        if a.get("achieved", 0) == 1:
                            unlocked_count += 1
                        existing_ach = db.query(Achievement).filter(
                            Achievement.log_id == log.id,
                            Achievement.external_id == ext_id,
                        ).first()
                        if existing_ach:
                            # Re-import: atualiza o estado de unlocked dos achievements existentes
                            new_unlocked = a.get("achieved", 0) == 1
                            if existing_ach.unlocked != new_unlocked:
                                existing_ach.unlocked = new_unlocked
                            continue
                        ach_count += 1
                        db.add(Achievement(
                            log_id=log.id,
                            external_id=ext_id,
                            name=a.get("name", ext_id),
                            description=a.get("description", ""),
                            unlocked=a.get("achieved", 0) == 1,
                        ))
                time.sleep(0.5)
                # Also fetch schema for achievement icons
                schema_url = "https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v1/"
                schema_r = requests.get(schema_url, params={
                    "key": settings.STEAM_API_KEY,
                    "appid": appid,
                    "l": "pt-br",
                }, timeout=15)
                schema_r.raise_for_status()
                game_data = schema_r.json().get("game", {})
                achievements_list = []
                if isinstance(game_data, dict):
                    stats_data = game_data.get("availableGameStats", {})
                    if isinstance(stats_data, dict):
                        raw_list = stats_data.get("achievements", [])
                        if isinstance(raw_list, list):
                            achievements_list = raw_list
                if isinstance(achievements_list, list):
                    schema_total = len(achievements_list)
                    schema_map = {}
                    for sa in achievements_list:
                        if not isinstance(sa, dict):
                            continue
                        icon = sa.get("icon") or sa.get("icon_gray", "")
                        if icon:
                            schema_map[sa.get("name", "")] = f"https://cdn.akamai.steamstatic.com/steamcommunity/public/images/apps/{appid}/{icon}"
                    if schema_map:
                        for ach in db.query(Achievement).filter(Achievement.log_id == log.id).all():
                            icon_url = schema_map.get(ach.external_id)
                            if icon_url:
                                ach.image_url = icon_url
                        db.flush()
            except requests.HTTPError as e:
                if e.response.status_code not in (400, 403):
                    print(f"Error importing achievements for {title} (appid {appid}): {e}")
            except Exception as e:
                print(f"Error importing achievements for {title} (appid {appid}): {e}")

        # Games with 100% achievements unlocked are platinated
        total_ach = schema_total if schema_total > 0 else player_total
        if total_ach > 0 and unlocked_count >= total_ach:
            log.status = LogStatus.PLATINATED
            db.add(log)

        # Games with <2h and no achievements go to library (apenas na criação;
        # no re-import o status manual do usuário não é rebaixado)
        if not is_update and hours is not None and hours < 2 and achievements_checked and ach_count == 0:
            log.status = LogStatus.LIBRARY
            db.add(log)

        if is_update:
            updated += 1
            job.add_imported({"title": title, "action": "updated"})
        else:
            created += 1
            job.add_imported({"title": title, "action": "created"})

        job.progress(current=idx + 1, created=created, skipped=skipped, updated=updated)

    db.commit()

    try:
        from app.crud.crud_user_badge import check_and_unlock
        new_badges = check_and_unlock(db, user_id)
        if new_badges:
            db.commit()
    except Exception:
        pass

    return {"created": created, "skipped": skipped, "updated": updated, "total": len(items)}


@router.post("/trakt/preview", response_model=ImportPreview)
async def trakt_preview(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...),
):
    content = await file.read()
    text = content.decode("utf-8-sig", errors="replace")

    items: List[ImportItem] = []
    source = "trakt"

    try:
        data = json.loads(text)
        if isinstance(data, dict):
            shows_list = data.get("shows") or data.get("movies") or data.get("data", {}).get("shows", [])
            if isinstance(shows_list, list):
                for entry in shows_list:
                    title = entry.get("title") or entry.get("name", "")
                    if not title.strip():
                        continue
                    year = entry.get("year")
                    rating_val = entry.get("rating")
                    rating = None
                    if rating_val is not None:
                        try:
                            r = float(rating_val)
                            rating = r if r <= 5 else r / 10 * 5
                        except (ValueError, TypeError):
                            pass
                    items.append(ImportItem(
                        title=title.strip(),
                        year=year,
                        rating=rating,
                        status="completed",
                        platform="Trakt",
                    ))
    except json.JSONDecodeError:
        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            name = row.get("Name") or row.get("name") or row.get("title") or ""
            if not name.strip():
                continue
            year = None
            raw_year = row.get("Year") or row.get("year")
            if raw_year:
                try:
                    year = int(raw_year)
                except (ValueError, TypeError):
                    pass
            rating = None
            raw_rating = row.get("Your Rating") or row.get("Rating") or row.get("rating")
            if raw_rating:
                try:
                    rating = float(raw_rating)
                except (ValueError, TypeError):
                    pass
            items.append(ImportItem(
                title=name.strip(),
                year=year,
                rating=rating,
                status="completed",
                platform="Trakt",
            ))

    return ImportPreview(items=items, total=len(items), source="trakt")


@router.post("/trakt/import")
async def trakt_import(
    *,
    user_id: int = Form(...),
    items_json: str = Form(...),
):
    try:
        items = json.loads(items_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid items JSON.")

    from app.services.import_jobs import start_job
    job_id = start_job(
        source="trakt",
        total=len(items),
        baseline_seconds_per_item=1.0,
        fn=lambda job, db: _run_trakt_import(job, db, user_id, items),
    )
    return {"job_id": job_id}


def _run_trakt_import(job, db, user_id: int, items: list) -> dict:
    created = 0
    skipped = 0
    media_crud = CRUDMediaItem(MediaItem)

    for idx, item in enumerate(items):
        title = item.get("title", "").strip()
        if not title:
            skipped += 1
            job.progress(current=idx + 1, created=created, skipped=skipped)
            continue

        year = item.get("year")
        tmdb_id = item.get("tmdb_id")
        cover_url = None

        if not tmdb_id:
            results = tmdb_service.search_media(query=title, media_type="tv", year=year)
            if results:
                best = results[0]
                tmdb_id = best.get("id")
                poster = best.get("poster_path")
                if poster:
                    cover_url = f"https://image.tmdb.org/t/p/w500{poster}"

        if not tmdb_id:
            existing = db.query(MediaItem).filter(
                MediaItem.title.ilike(title),
                MediaItem.media_type == MediaType.SERIES,
            ).first()
            if existing:
                tmdb_id = existing.tmdb_id

        if not tmdb_id:
            skipped += 1
            job.add_skipped({"title": title, "reason": "no_api_match"})
            job.progress(current=idx + 1, created=created, skipped=skipped)
            continue

        media_in = schemas.MediaItemCreate(
            title=title,
            media_type=MediaType.SERIES,
            tmdb_id=tmdb_id,
            cover_image_url=cover_url,
        )
        media_item = media_crud.get_or_create(db, obj_in=media_in)

        if not media_item.cover_image_url:
            skipped += 1
            job.add_skipped({"title": title, "reason": "no_cover"})
            job.progress(current=idx + 1, created=created, skipped=skipped)
            continue

        existing_log = db.query(LogEntry).filter(
            LogEntry.user_id == user_id,
            LogEntry.media_item_id == media_item.id,
        ).first()
        if existing_log:
            skipped += 1
            job.add_skipped({"title": title, "reason": "duplicate"})
            job.progress(current=idx + 1, created=created, skipped=skipped)
            continue

        rating = item.get("rating")
        if rating is not None:
            try:
                rating = float(rating)
            except (ValueError, TypeError):
                rating = None

        item_status = item.get("status", "completed")
        try:
            log_status = LogStatus(item_status)
        except ValueError:
            log_status = LogStatus.COMPLETED

        log = LogEntry(
            user_id=user_id,
            media_item_id=media_item.id,
            log_date=datetime.datetime.utcnow(),
            rating=rating,
            status=log_status,
            platform="Trakt",
        )
        db.add(log)
        db.flush()
        created += 1
        job.add_imported({"title": title, "action": "created"})

        if tmdb_id:
            try:
                details = tmdb_service.get_tv_details(tmdb_id)
                if details:
                    for key, value in details.items():
                        if value:
                            setattr(media_item, key, value)
                    db.add(media_item)
            except Exception:
                pass

        if log.hours_spent is None and media_item.runtime and media_item.total_episodes and log.status == LogStatus.COMPLETED:
            log.hours_spent = round((media_item.runtime / 60) * media_item.total_episodes, 4)
            db.add(log)

        job.progress(current=idx + 1, created=created, skipped=skipped)

    db.commit()

    try:
        from app.crud.crud_user_badge import check_and_unlock
        new_badges = check_and_unlock(db, user_id)
        if new_badges:
            db.commit()
    except Exception:
        pass

    return {
        "created": created,
        "skipped": skipped,
        "total": len(items),
        "imported_items": job.imported_items,
        "skipped_items": job.skipped_items,
    }


def _parse_tvtime_zip(content: bytes) -> dict:
    """Parse TV Time GDPR ZIP export, extract shows, movies, and ratings.

    Actual TV Time ZIP format:
    - tvtime-movies-*.csv: uuid, tvdb_id, imdb_id, title, year, created_at, watched_at, is_watched, rewatch_count
    - tvtime-series-*.csv: uuid, tvdb_id, imdb_id, title, status, created_at
    - tvtime-series-episodes-*.csv: series_tvdb_id, series_imdb_id, series_uuid, title, season, episode, tvdb_id, is_watched, watched_at, rewatch_count, special
    """
    shows: Dict[str, dict] = {}
    movies: List[dict] = []
    wishlist_movies: List[dict] = []

    with zipfile.ZipFile(io.BytesIO(content), "r") as zf:
        names = zf.namelist()

        # Find files by pattern (tvtime-movies-YYYY-MM-DD.csv, etc.)
        csv_movies = None
        csv_episodes = None
        csv_series = None
        for name in names:
            lower = name.lower()
            if "-movies-" in lower and lower.endswith(".csv"):
                csv_movies = name
            elif "-episodes-" in lower and lower.endswith(".csv"):
                csv_episodes = name
            elif "-series-" in lower and lower.endswith(".csv") and "episodes" not in lower:
                csv_series = name

        # Build series name + status lookup from series CSV
        series_names: Dict[str, str] = {}
        series_status: Dict[str, str] = {}
        if csv_series:
            raw = zf.read(csv_series).decode("utf-8-sig", errors="replace")
            reader = csv.DictReader(io.StringIO(raw))
            for row in reader:
                uuid = (row.get("uuid") or "").strip()
                title = (row.get("title") or "").strip()
                status = (row.get("status") or "").strip().lower()
                if uuid and title:
                    series_names[uuid] = title
                    series_status[uuid] = status

        # Parse episodes to build show data
        if csv_episodes:
            raw = zf.read(csv_episodes).decode("utf-8-sig", errors="replace")
            reader = csv.DictReader(io.StringIO(raw))
            for row in reader:
                if (row.get("is_watched") or "").strip().lower() != "true":
                    continue

                series_uuid = (row.get("series_uuid") or "").strip()
                series_title = series_names.get(series_uuid, "")
                if not series_title:
                    series_title = (row.get("title") or "").strip()
                if not series_title:
                    continue

                if series_title not in shows:
                    shows[series_title] = {
                        "title": series_title,
                        "type": "series",
                        "episodes_watched": set(),
                        "episode_reviews": {},
                        "seasons": set(),
                        "last_date": None,
                        "tvdb_id": (row.get("series_tvdb_id") or "").strip(),
                        "imdb_id": (row.get("series_imdb_id") or "").strip(),
                    }
                show = shows[series_title]
                s_num = (row.get("season") or "").strip()
                e_num = (row.get("episode") or "").strip()
                ep_code = f"{s_num}x{e_num}" if s_num and e_num else None
                if ep_code:
                    show["episodes_watched"].add(ep_code)
                    try:
                        show["seasons"].add(int(s_num))
                    except (ValueError, TypeError):
                        pass
                    rating_raw = (row.get("rating") or "").strip()
                    note_raw = (row.get("notes") or row.get("review") or row.get("comment") or "").strip()
                    show["episode_reviews"][ep_code] = {
                        "rating": float(rating_raw) if rating_raw else None,
                        "review_text": note_raw or None,
                    }
                watched_at = (row.get("watched_at") or "").strip()
                if watched_at:
                    try:
                        dt = datetime.datetime.fromisoformat(watched_at.replace("Z", "+00:00"))
                        naive = dt.replace(tzinfo=None)
                        show["episode_reviews"][ep_code]["log_date"] = naive.isoformat()
                        if show["last_date"] is None or naive > show["last_date"]:
                            show["last_date"] = naive
                    except (ValueError, TypeError):
                        pass

        # Parse movies
        if csv_movies:
            raw = zf.read(csv_movies).decode("utf-8-sig", errors="replace")
            reader = csv.DictReader(io.StringIO(raw))
            for row in reader:
                title = (row.get("title") or "").strip()
                if not title:
                    continue
                year = None
                raw_year = (row.get("year") or "").strip()
                if raw_year:
                    try:
                        year = int(raw_year)
                    except (ValueError, TypeError):
                        pass
                is_watched = (row.get("is_watched") or "").strip().lower() == "true"
                if is_watched:
                    log_date = None
                    watched_at = (row.get("watched_at") or "").strip()
                    if watched_at:
                        try:
                            dt = datetime.datetime.fromisoformat(watched_at.replace("Z", "+00:00"))
                            log_date = dt.replace(tzinfo=None)
                        except (ValueError, TypeError):
                            pass
                    movies.append({
                        "title": title,
                        "year": year,
                        "log_date": log_date.isoformat() if log_date else None,
                        "rating": float(rating_raw) if (rating_raw := (row.get("rating") or "").strip()) else None,
                    })
                else:
                    wishlist_movies.append({
                        "title": title,
                        "year": year,
                    })

    # Extract wishlist series (watch_later status, not already in shows)
    wishlist_series = {}
    for uuid, status in series_status.items():
        if status == "watch_later":
            title = series_names.get(uuid, "")
            if title and title not in shows:
                wishlist_series[title] = {"title": title, "type": "series"}

    return {"shows": shows, "movies": movies, "wishlist_series": wishlist_series, "wishlist_movies": wishlist_movies}


@router.post("/tvtime/preview")
async def tvtime_preview(
    *,
    db: Session = Depends(deps.get_db),
    file: UploadFile = File(...),
):
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="Upload a ZIP file exported from TV Time.")

    content = await file.read()
    try:
        data = _parse_tvtime_zip(content)
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="Invalid ZIP file.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error parsing TV Time export: {str(e)}")

    items: List[ImportItem] = []

    for show_name, show_data in data["shows"].items():
        num_watched = len(show_data["episodes_watched"])
        items.append(ImportItem(
            title=show_name,
            media_type="series",
            status="completed",
            log_date=show_data["last_date"].isoformat() if show_data["last_date"] else None,
            hours_spent=float(num_watched),
        ))

    seen_movies = set()
    for movie in data["movies"]:
        key = movie["title"].lower().strip()
        if key in seen_movies:
            continue
        seen_movies.add(key)
        items.append(ImportItem(
            title=movie["title"],
            media_type="movie",
            year=movie.get("year"),
            status="completed",
            log_date=movie.get("log_date"),
            rating=movie.get("rating"),
        ))

    for wl_name in data.get("wishlist_series", {}):
        items.append(ImportItem(
            title=wl_name,
            media_type="series",
            status="wishlist",
        ))

    for wl_movie in data.get("wishlist_movies", []):
        items.append(ImportItem(
            title=wl_movie["title"],
            media_type="movie",
            year=wl_movie.get("year"),
            status="wishlist",
        ))

    return ImportPreview(items=items, total=len(items), source="tvtime")


@router.post("/tvtime/import")
async def tvtime_import(
    *,
    user_id: int = Form(...),
    items_json: str = Form(...),
    media_type_filter: str = Form("all"),
    raw_zip: UploadFile = File(...),
):
    try:
        selected_items = json.loads(items_json)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid items JSON.")

    selected_titles = {item.get("title", "").lower().strip() for item in selected_items if item.get("title")}

    zip_content = await raw_zip.read()
    data = _parse_tvtime_zip(zip_content)

    from app.services.import_jobs import start_job
    job_id = start_job(
        source="tvtime",
        total=len(selected_items),
        baseline_seconds_per_item=1.2,
        fn=lambda job, db: _run_tvtime_import(job, db, user_id, selected_titles, data, media_type_filter),
    )
    return {"job_id": job_id}


def _normalize_title(s: str) -> str:
    """Lowercase, strip accents, keep only alphanumerics (for matching)."""
    n = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode("ascii")
    n = re.sub(r"[^a-z0-9]+", " ", n.lower()).strip()
    return re.sub(r"\s+", " ", n)


def _parse_disambiguation(title: str):
    """Extract (year) and (region) suffixes from a TV Time title.

    e.g. "MasterChef (BR)" -> ("MasterChef", None, "BR")
         "Cosmos (2014)"   -> ("Cosmos", 2014, None)
         "Lost in Space (2018)" -> ("Lost in Space", 2018, None)
    """
    base = title
    year = None
    region = None
    m = re.search(r"\((\d{4})\)", base)
    if m:
        year = int(m.group(1))
        base = base.replace(m.group(0), "")
    m = re.search(r"\(([A-Za-z]{2})\)\s*$", base.strip())
    if m:
        region = m.group(1).upper()
        base = base.replace(m.group(0), "")
    return base.strip(), year, region


def _score_series(result: dict, base: str, year, region) -> float:
    name = _normalize_title(result.get("name") or "")
    base_norm = _normalize_title(base)
    score = 0.0
    if name == base_norm:
        score += 100
    elif name.startswith(base_norm) or base_norm.startswith(name):
        score += 60
    elif base_norm in name or name in base_norm:
        score += 30

    air = result.get("first_air_date") or ""
    if year and air.startswith(str(year)):
        score += 20
    elif year and air[:4].isdigit():
        if abs(int(air[:4]) - year) <= 1:
            score += 10

    if region == "BR":
        if "brasil" in name or "brazil" in name:
            score += 25
        elif " us " in f" {name} " or " uk " in f" {name} " or "united states" in name:
            score -= 30
    elif region:
        if f" {region.lower()} " in f" {name} " or name.endswith(region.lower()):
            score += 15
    return score


def _search_tv_series(title: str):
    """Search TMDB for a series, trying region/year-aware variants.

    TMDB returns 0 results for queries containing parentheses, so we strip
    the (year)/(region) suffix and retry with a year filter and regional hints
    (e.g. "MasterChef (BR)" -> "MasterChef Brasil").
    """
    base, year, region = _parse_disambiguation(title)
    attempts = []
    if base != title:
        attempts.append((base, year))
    attempts.append((title, year))
    if region:
        attempts.append((f"{base} {region}", year))
        if region == "BR":
            attempts.append((f"{base} Brasil", year))
            attempts.append((f"{base} Brazil", year))

    best = None
    best_score = -1.0
    seen = set()
    for q, y in attempts:
        key = (q, y)
        if key in seen:
            continue
        seen.add(key)
        results = tmdb_service.search_media(query=q, media_type="tv", year=y)
        for r in results:
            sc = _score_series(r, base, year, region)
            if sc > best_score:
                best_score = sc
                best = r
    return best


def _resolve_series(show_data: dict, show_name: str):
    """Resolve the best TMDB series for a TV Time show.

    Priority: tvdb_id -> imdb_id -> region/year-aware title search.
    Returns (result_or_None, resolved_exact: bool).
    """
    tvdb_id = (show_data.get("tvdb_id") or "").strip()
    if tvdb_id:
        r = tmdb_service.find_by_external_id(tvdb_id, "tvdb_id")
        if r:
            return r, True

    imdb_id = (show_data.get("imdb_id") or "").strip()
    if imdb_id:
        r = tmdb_service.find_by_external_id(imdb_id, "imdb_id")
        if r:
            return r, True

    r = _search_tv_series(show_name)
    if r:
        base, _year, _region = _parse_disambiguation(show_name)
        exact = _normalize_title(r.get("name") or "") == _normalize_title(base)
        return r, exact
    return None, False


def _effective_episodes(csv_eps: set, tmdb_codes: set, tmdb_total: int, resolved_exact: bool):
    """Decide which episode codes to import.

    Normally the intersection with TMDB's numbering is used. If the show was
    resolved exactly (tvdb/imdb/exact-name) but the CSV numbering doesn't line
    up with TMDB (common for regional versions and renamed shows), fall back to
    the TV Time codes the user actually watched.
    """
    if not tmdb_codes:
        return csv_eps, len(csv_eps)
    inter = csv_eps & tmdb_codes
    if not inter:
        if resolved_exact:
            return csv_eps, len(csv_eps)
        return set(), 0
    csv_count = len(csv_eps)
    if csv_count > len(inter) and resolved_exact:
        return csv_eps, csv_count
    return inter, len(inter)


def _run_tvtime_import(job, db, user_id: int, selected_titles: set, data: dict, media_type_filter: str = "all") -> dict:
    def _skip_filtered(item_type: str) -> bool:
        return media_type_filter in ("series", "movie") and item_type != media_type_filter

    created = 0
    skipped = 0
    updated = 0
    processed = 0
    imported_items = []
    skipped_items = []
    media_crud = CRUDMediaItem(MediaItem)

    for show_name, show_data in data["shows"].items():
        processed += 1
        job.progress(current=processed, created=created, skipped=skipped, updated=updated)
        if show_name.lower().strip() not in selected_titles:
            skipped += 1
            skipped_items.append({"title": show_name, "reason": "not_selected"})
            continue

        if _skip_filtered("series"):
            skipped += 1
            skipped_items.append({"title": show_name, "reason": "filtered"})
            continue

        tmdb_id = None
        cover_url = None
        resolved, resolved_exact = _resolve_series(show_data, show_name)
        if resolved:
            tmdb_id = resolved.get("id")
            poster = resolved.get("poster_path")
            if poster:
                cover_url = f"https://image.tmdb.org/t/p/w500{poster}"

        if not tmdb_id:
            existing = db.query(MediaItem).filter(
                MediaItem.title.ilike(show_name),
                MediaItem.media_type == MediaType.SERIES,
            ).first()
            if existing and existing.tmdb_id:
                tmdb_id = existing.tmdb_id
                cover_url = existing.cover_image_url
                resolved_exact = True

        if not tmdb_id:
            skipped += 1
            skipped_items.append({"title": show_name, "reason": "no_api_match"})
            continue

        total_episodes_from_tmdb = 0
        tmdb_valid_episodes: set = set()
        try:
            seasons_info = tmdb_service.get_tv_seasons(tmdb_id)
            for s in seasons_info:
                total_episodes_from_tmdb += s.get("episode_count", 0)
                for ep_num in range(1, s.get("episode_count", 0) + 1):
                    tmdb_valid_episodes.add(f"{s['season_number']}x{ep_num}")
        except Exception:
            pass

        media_in = schemas.MediaItemCreate(
            title=show_name,
            media_type=MediaType.SERIES,
            tmdb_id=tmdb_id,
            cover_image_url=cover_url,
        )
        media_item = media_crud.get_or_create(db, obj_in=media_in)

        if total_episodes_from_tmdb > 0:
            media_item.total_episodes = total_episodes_from_tmdb
            db.add(media_item)

        if not media_item.cover_image_url:
            skipped += 1
            skipped_items.append({"title": show_name, "reason": "no_cover"})
            continue

        episodes_watched, num_watched = _effective_episodes(
            show_data["episodes_watched"],
            tmdb_valid_episodes,
            total_episodes_from_tmdb,
            resolved_exact,
        )

        existing_log = db.query(LogEntry).filter(
            LogEntry.user_id == user_id,
            LogEntry.media_item_id == media_item.id,
        ).first()

        if existing_log:
            existing_eps = db.query(EpisodeWatched).filter(
                EpisodeWatched.log_id == existing_log.id
            ).all()
            existing_ep_codes = {
                f"{e.season_number}x{e.episode_number}" for e in existing_eps
            }
            new_eps = episodes_watched - existing_ep_codes
            if not new_eps:
                skipped += 1
                skipped_items.append({"title": show_name, "reason": "duplicate"})
                continue

            for ep_code in sorted(new_eps):
                try:
                    parts = ep_code.split("x")
                    s_num = int(parts[0])
                    e_num = int(parts[1])
                except (ValueError, IndexError):
                    continue
                review_data = show_data.get("episode_reviews", {}).get(ep_code, {})
                ep = EpisodeWatched(
                    log_id=existing_log.id,
                    season_number=s_num,
                    episode_number=e_num,
                    watched=True,
                    log_date=review_data.get("log_date"),
                    review_text=review_data.get("review_text"),
                    rating=review_data.get("rating"),
                )
                db.add(ep)

            total_watched_now = len(existing_ep_codes | new_eps)
            if total_episodes_from_tmdb > 0 and total_watched_now >= total_episodes_from_tmdb:
                existing_log.status = LogStatus.COMPLETED
            elif total_watched_now > 0:
                existing_log.status = LogStatus.IN_PROGRESS
            existing_log.log_date = show_data["last_date"] or existing_log.log_date

            db.add(existing_log)
            updated += 1
            imported_items.append({"title": show_name, "action": "updated", "episodes_added": len(new_eps)})
            continue

        rating = None
        ep_reviews = show_data.get("episode_reviews", {})
        ep_ratings = [v["rating"] for v in ep_reviews.values() if v.get("rating")]
        if ep_ratings:
            rating = round(sum(ep_ratings) / len(ep_ratings), 1)

        if num_watched == 0:
            skipped += 1
            skipped_items.append({"title": show_name, "reason": "no_matched_episodes"})
            continue

        if total_episodes_from_tmdb > 0 and num_watched >= total_episodes_from_tmdb:
            log_status = LogStatus.COMPLETED
        elif num_watched > 0:
            log_status = LogStatus.IN_PROGRESS

        log = LogEntry(
            user_id=user_id,
            media_item_id=media_item.id,
            log_date=show_data["last_date"] or datetime.datetime.utcnow(),
            rating=rating,
            status=log_status,
        )
        db.add(log)
        db.flush()

        for ep_code in sorted(episodes_watched):
            try:
                parts = ep_code.split("x")
                s_num = int(parts[0])
                e_num = int(parts[1])
            except (ValueError, IndexError):
                continue
            review_data = show_data.get("episode_reviews", {}).get(ep_code, {})
            ep = EpisodeWatched(
                log_id=log.id,
                season_number=s_num,
                episode_number=e_num,
                watched=True,
                log_date=review_data.get("log_date"),
                review_text=review_data.get("review_text"),
                rating=review_data.get("rating"),
            )
            db.add(ep)

        created += 1
        imported_items.append({"title": show_name, "action": "created"})

        if tmdb_id:
            try:
                details = tmdb_service.get_tv_details(tmdb_id)
                if details:
                    for key, value in details.items():
                        if value:
                            setattr(media_item, key, value)
                    db.add(media_item)
            except Exception:
                pass

        # Auto-calc hours from runtime x watched episodes
        if media_item.runtime and num_watched > 0 and log.hours_spent is None:
            log.hours_spent = round((media_item.runtime / 60) * num_watched, 4)
            db.add(log)

    for movie in data["movies"]:
        processed += 1
        job.progress(current=processed, created=created, skipped=skipped, updated=updated)
        if movie["title"].lower().strip() not in selected_titles:
            skipped += 1
            skipped_items.append({"title": movie["title"], "reason": "not_selected"})
            continue

        if _skip_filtered("movie"):
            skipped += 1
            skipped_items.append({"title": movie["title"], "reason": "filtered"})
            continue

        tmdb_id = None
        cover_url = None
        results = tmdb_service.search_media(query=movie["title"], media_type="movie", year=movie.get("year"))
        if results:
            tmdb_id = results[0].get("id")
            poster = results[0].get("poster_path")
            if poster:
                cover_url = f"https://image.tmdb.org/t/p/w500{poster}"

        if not tmdb_id:
            existing = db.query(MediaItem).filter(
                MediaItem.title.ilike(movie["title"]),
                MediaItem.media_type == MediaType.MOVIE,
            ).first()
            if existing:
                tmdb_id = existing.tmdb_id

        if not tmdb_id:
            skipped += 1
            skipped_items.append({"title": movie["title"], "reason": "no_api_match"})
            continue

        media_in = schemas.MediaItemCreate(
            title=movie["title"],
            media_type=MediaType.MOVIE,
            tmdb_id=tmdb_id,
            cover_image_url=cover_url,
        )
        media_item = media_crud.get_or_create(db, obj_in=media_in)

        if not media_item.cover_image_url:
            skipped += 1
            skipped_items.append({"title": movie["title"], "reason": "no_cover"})
            continue

        log_date = None
        if movie.get("log_date"):
            try:
                log_date = datetime.datetime.fromisoformat(movie["log_date"])
            except (ValueError, TypeError):
                log_date = datetime.datetime.utcnow()
        else:
            log_date = datetime.datetime.utcnow()

        existing_log = db.query(LogEntry).filter(
            LogEntry.user_id == user_id,
            LogEntry.media_item_id == media_item.id,
        ).first()

        if existing_log:
            skipped += 1
            skipped_items.append({"title": movie["title"], "reason": "duplicate"})
            continue

        log = LogEntry(
            user_id=user_id,
            media_item_id=media_item.id,
            log_date=log_date,
            rating=movie.get("rating"),
            status=LogStatus.COMPLETED,
        )
        db.add(log)
        db.flush()
        created += 1
        imported_items.append({"title": movie["title"], "action": "created"})

        if tmdb_id:
            try:
                details = tmdb_service.get_movie_details(tmdb_id)
                if details:
                    for key, value in details.items():
                        if value:
                            setattr(media_item, key, value)
                    db.add(media_item)
            except Exception:
                pass

        if log.hours_spent is None and media_item.runtime:
            log.hours_spent = round(media_item.runtime / 60, 4)
            db.add(log)

    for wl_name, wl_data in data.get("wishlist_series", {}).items():
        processed += 1
        job.progress(current=processed, created=created, skipped=skipped, updated=updated)
        if wl_name.lower().strip() not in selected_titles:
            skipped += 1
            skipped_items.append({"title": wl_name, "reason": "not_selected"})
            continue

        if _skip_filtered("series"):
            skipped += 1
            skipped_items.append({"title": wl_name, "reason": "filtered"})
            continue

        tmdb_id = None
        cover_url = None
        results = tmdb_service.search_media(query=wl_name, media_type="tv")
        if results:
            tmdb_id = results[0].get("id")
            poster = results[0].get("poster_path")
            if poster:
                cover_url = f"https://image.tmdb.org/t/p/w500{poster}"

        if not tmdb_id:
            existing = db.query(MediaItem).filter(
                MediaItem.title.ilike(wl_name),
                MediaItem.media_type == MediaType.SERIES,
            ).first()
            if existing:
                tmdb_id = existing.tmdb_id

        if not tmdb_id:
            skipped += 1
            skipped_items.append({"title": wl_name, "reason": "no_api_match"})
            continue

        media_in = schemas.MediaItemCreate(
            title=wl_name,
            media_type=MediaType.SERIES,
            tmdb_id=tmdb_id,
            cover_image_url=cover_url,
        )
        media_item = media_crud.get_or_create(db, obj_in=media_in)

        existing_log = db.query(LogEntry).filter(
            LogEntry.user_id == user_id,
            LogEntry.media_item_id == media_item.id,
        ).first()
        if existing_log:
            skipped += 1
            skipped_items.append({"title": wl_name, "reason": "duplicate"})
            continue

        log = LogEntry(
            user_id=user_id,
            media_item_id=media_item.id,
            log_date=datetime.datetime.utcnow(),
            status=LogStatus.WISHLIST,
        )
        db.add(log)
        db.flush()

        created += 1
        imported_items.append({"title": wl_name, "action": "created"})

        if tmdb_id:
            try:
                details = tmdb_service.get_tv_details(tmdb_id)
                if details:
                    for key, value in details.items():
                        if value:
                            setattr(media_item, key, value)
                    db.add(media_item)
            except Exception:
                pass

    for wl_movie in data.get("wishlist_movies", []):
        processed += 1
        job.progress(current=processed, created=created, skipped=skipped, updated=updated)
        if wl_movie["title"].lower().strip() not in selected_titles:
            skipped += 1
            skipped_items.append({"title": wl_movie["title"], "reason": "not_selected"})
            continue

        if _skip_filtered("movie"):
            skipped += 1
            skipped_items.append({"title": wl_movie["title"], "reason": "filtered"})
            continue

        tmdb_id = None
        cover_url = None
        results = tmdb_service.search_media(query=wl_movie["title"], media_type="movie", year=wl_movie.get("year"))
        if results:
            tmdb_id = results[0].get("id")
            poster = results[0].get("poster_path")
            if poster:
                cover_url = f"https://image.tmdb.org/t/p/w500{poster}"

        if not tmdb_id:
            existing = db.query(MediaItem).filter(
                MediaItem.title.ilike(wl_movie["title"]),
                MediaItem.media_type == MediaType.MOVIE,
            ).first()
            if existing:
                tmdb_id = existing.tmdb_id

        if not tmdb_id:
            skipped += 1
            skipped_items.append({"title": wl_movie["title"], "reason": "no_api_match"})
            continue

        media_in = schemas.MediaItemCreate(
            title=wl_movie["title"],
            media_type=MediaType.MOVIE,
            tmdb_id=tmdb_id,
            cover_image_url=cover_url,
        )
        media_item = media_crud.get_or_create(db, obj_in=media_in)

        existing_log = db.query(LogEntry).filter(
            LogEntry.user_id == user_id,
            LogEntry.media_item_id == media_item.id,
        ).first()
        if existing_log:
            skipped += 1
            skipped_items.append({"title": wl_movie["title"], "reason": "duplicate"})
            continue

        log = LogEntry(
            user_id=user_id,
            media_item_id=media_item.id,
            log_date=datetime.datetime.utcnow(),
            status=LogStatus.WISHLIST,
        )
        db.add(log)
        db.flush()

        created += 1
        imported_items.append({"title": wl_movie["title"], "action": "created"})

        if tmdb_id:
            try:
                details = tmdb_service.get_movie_details(tmdb_id)
                if details:
                    for key, value in details.items():
                        if value:
                            setattr(media_item, key, value)
                    db.add(media_item)
            except Exception:
                pass

    db.commit()

    try:
        from app.crud.crud_user_badge import check_and_unlock
        new_badges = check_and_unlock(db, user_id)
        if new_badges:
            db.commit()
    except Exception:
        pass

    job.imported_items = imported_items
    job.skipped_items = skipped_items
    return {
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "total": job.total,
        "imported_items": imported_items,
        "skipped_items": skipped_items,
    }


@router.get("/jobs/{job_id}")
def get_import_job(job_id: str):
    from app.services.import_jobs import get_job
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job.to_dict()
