import json

import requests

STORE_API_URL = "https://store.steampowered.com/api"


def get_app_details(steam_appid: int) -> dict | None:
    """Fetch game details from Steam Store API (no key required)."""
    try:
        r = requests.get(f"{STORE_API_URL}/appdetails", params={
            "appids": steam_appid,
            "cc": "br",
            "l": "br",
        }, timeout=15)
        r.raise_for_status()
        data = r.json()
        app_data = data.get(str(steam_appid), {})
        if not app_data.get("success"):
            return None
        return app_data.get("data")
    except Exception as e:
        print(f"Error fetching Steam app details: {e}")
        return None


def get_app_prices(appids: list) -> dict:
    """Fetch price overviews for multiple Steam appids in one request (no key required).
    Returns {appid: {"discount_percent": int, "final_formatted": str}} only for apps
    that expose price data (any value, including 0% discount = full price)."""
    result = {}
    if not appids:
        return result
    try:
        r = requests.get(f"{STORE_API_URL}/appdetails", params={
            "appids": ",".join(str(a) for a in appids),
            "cc": "br",
            "l": "br",
            "filters": "price_overview",
        }, timeout=20)
        r.raise_for_status()
        data = r.json()
        for appid in appids:
            entry = data.get(str(appid), {})
            if not entry.get("success"):
                continue
            info = entry.get("data") or {}
            price = info.get("price_overview")
            if not price:
                continue
            result[int(appid)] = {
                "discount_percent": int(price.get("discount_percent") or 0),
                "final_formatted": price.get("final_formatted") or "",
            }
    except Exception as e:
        print(f"Error fetching Steam app prices: {e}")
    return result


def parse_steam_game_data(steam_data: dict) -> dict:
    """Parse raw Steam Store API response into a clean dict for storage."""
    genres = [g.get("description", "") for g in steam_data.get("genres", [])]
    categories = [c.get("description", "") for c in steam_data.get("categories", [])]

    price_data = steam_data.get("price_overview")
    price = None
    if price_data:
        price = price_data.get("final_formatted", "")

    pc_req = steam_data.get("pc_requirements", {})
    if isinstance(pc_req, dict):
        pc_requirements = pc_req.get("minimum", "")
    else:
        pc_requirements = ""

    return {
        "header_image": steam_data.get("header_image", ""),
        "metacritic_score": steam_data.get("metacritic", {}).get("score"),
        "steam_genres": ", ".join(genres),
        "steam_categories": ", ".join(categories),
        "steam_price": price,
        "screenshots": json.dumps([s.get("path_full", s.get("path_thumbnail", "")) for s in steam_data.get("screenshots", [])[:6]]),
        "pc_requirements": pc_requirements,
        "short_description": steam_data.get("short_description", ""),
    }
