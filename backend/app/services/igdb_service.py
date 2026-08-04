import requests
from app.core.config import settings

IGDB_BASE_URL = "https://api.igdb.com/v4"
TWITCH_AUTH_URL = "https://id.twitch.tv/oauth2/token"
STEAM_API_URL = "https://api.steampowered.com"

_igdb_token = None


def _get_igdb_token():
    global _igdb_token
    if _igdb_token:
        return _igdb_token
    if not settings.IGDB_CLIENT_ID or not settings.IGDB_CLIENT_SECRET:
        return None
    try:
        r = requests.post(TWITCH_AUTH_URL, params={
            "client_id": settings.IGDB_CLIENT_ID,
            "client_secret": settings.IGDB_CLIENT_SECRET,
            "grant_type": "client_credentials",
        }, timeout=10)
        r.raise_for_status()
        _igdb_token = r.json().get("access_token")
        return _igdb_token
    except Exception as e:
        print(f"Error fetching IGDB token: {e}")
        return None


def _igdb_post(endpoint: str, query: str):
    token = _get_igdb_token()
    if not token:
        return []
    headers = {
        "Client-ID": settings.IGDB_CLIENT_ID,
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
    }
    try:
        r = requests.post(f"{IGDB_BASE_URL}/{endpoint}", headers=headers, data=query, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"Error fetching from IGDB {endpoint}: {e}")
        return []


def search_games(query: str):
    return _igdb_post("games", f'search "{query}"; fields name, cover.url, first_release_date, summary; limit 20;')


def get_game_extra_data(igdb_id: int) -> dict:
    """Fetch time_to_beat and similar_games (with covers) for a game."""
    time_to_beat = {"hastily": None, "normally": None, "completely": None}
    ttb = _igdb_post(
        "game_time_to_beats",
        f"fields hastily, normally, completely; where game_id = {igdb_id}; limit 1;",
    )
    if ttb:
        time_to_beat = {
            "hastily": ttb[0].get("hastily"),
            "normally": ttb[0].get("normally"),
            "completely": ttb[0].get("completely"),
        }
    similar = []
    results = _igdb_post(
        "games",
        f"fields similar_games.name, similar_games.cover.url; where id = {igdb_id}; limit 1;",
    )
    if results:
        for g in results[0].get("similar_games", []):
            cover = None
            if g.get("cover") and g["cover"].get("url"):
                cover = g["cover"]["url"].replace("t_thumb", "t_cover_big").lstrip("/")
                cover = f"https://{cover}"
            similar.append({"id": g.get("id"), "name": g.get("name"), "cover_image_url": cover})
    return {"time_to_beat": time_to_beat, "similar_games": similar}


def get_game_by_id(igdb_id: int) -> dict | None:
    results = _igdb_post("games", f"fields name, cover.url, first_release_date, summary, genres.name, platforms.name; where id = {igdb_id}; limit 1;")
    if not results:
        return None
    item = results[0]
    release_date = None
    if item.get("first_release_date"):
        try:
            import datetime
            release_date = datetime.datetime.fromtimestamp(item["first_release_date"]).date()
        except Exception:
            release_date = None
    cover_url = None
    if item.get("cover") and item["cover"].get("url"):
        cover_url = item["cover"]["url"].replace("t_thumb", "t_cover_big").lstrip("/")
        cover_url = f"https://{cover_url}"
    genres = ", ".join(g.get("name", "") for g in item.get("genres", []))
    result = {
        "title": item.get("name"),
        "cover_image_url": cover_url,
        "release_date": release_date,
        "synopsis": item.get("summary"),
        "genres": genres,
        "igdb_id": igdb_id,
    }
    result.update(get_game_extra_data(igdb_id))
    return result


def get_steam_appid(igdb_id: int) -> int | None:
    """Find the Steam AppID for a game via IGDB's external_games endpoint (source 1 = Steam)."""
    results = _igdb_post("external_games", f"fields uid; where game = {igdb_id} & external_game_source = 1; limit 1;")
    if results and len(results) > 0:
        uid = results[0].get("uid")
        return int(uid) if uid else None
    return None


def get_igdb_id_from_steam(steam_appid: int) -> int | None:
    """Find the IGDB game ID for a Steam AppID via IGDB's external_games endpoint (source 1 = Steam)."""
    results = _igdb_post("external_games", f'fields game; where external_game_source = 1 & uid = "{steam_appid}"; limit 1;')
    if results and len(results) > 0:
        return results[0].get("game")
    return None


def get_steam_achievements(steam_appid: int) -> list:
    """Fetch achievement definitions from Steam's GetSchemaForGame endpoint."""
    if not settings.STEAM_API_KEY:
        return _get_steam_achievements_no_key(steam_appid)

    try:
        r = requests.get(
            f"{STEAM_API_URL}/ISteamUserStats/GetSchemaForGame/v2/",
            params={"appid": steam_appid, "key": settings.STEAM_API_KEY},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        game_data = data.get("game", {})
        stats = game_data.get("availableGameStats")
        if not stats:
            return []
        achievements = stats.get("achievements", [])
        return [
            {
                "external_id": a.get("name", ""),
                "name": a.get("displayName", a.get("name", "")),
                "description": a.get("description", ""),
                "image_url": a.get("icon", ""),
                "unlock_percentage": None,
            }
            for a in achievements
        ]
    except Exception as e:
        print(f"Error fetching Steam schema achievements: {e}")
        return _get_steam_achievements_no_key(steam_appid)


def _get_steam_achievements_no_key(steam_appid: int) -> list:
    """Fallback: fetch achievement names and global unlock percentages (no API key needed)."""
    try:
        r = requests.get(
            f"{STEAM_API_URL}/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/",
            params={"gameid": steam_appid},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        achievements = data.get("achievementpercentages", {}).get("achievements", [])
        return [
            {
                "external_id": a.get("name", ""),
                "name": a.get("name", ""),
                "description": "",
                "image_url": "",
                "unlock_percentage": round(float(a.get("percent", 0)), 1),
            }
            for a in achievements
        ]
    except Exception as e:
        print(f"Error fetching Steam global achievements: {e}")
        return []
