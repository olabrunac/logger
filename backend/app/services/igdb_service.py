import requests
import os
from app.core.config import settings

BASE_URL = "https://api.igdb.com/v4"
AUTH_URL = "https://id.twitch.tv/oauth2/token"

IGDB_ACCESS_TOKEN = None

def get_access_token():
    global IGDB_ACCESS_TOKEN
    if IGDB_ACCESS_TOKEN:
        return IGDB_ACCESS_TOKEN
    if not settings.IGDB_CLIENT_ID or not settings.IGDB_CLIENT_SECRET:
        return None
    try:
        response = requests.post(AUTH_URL, params={
            "client_id": settings.IGDB_CLIENT_ID,
            "client_secret": settings.IGDB_CLIENT_SECRET,
            "grant_type": "client_credentials",
        })
        response.raise_for_status()
        data = response.json()
        IGDB_ACCESS_TOKEN = data.get("access_token")
        return IGDB_ACCESS_TOKEN
    except requests.exceptions.RequestException as e:
        print(f"Error fetching IGDB access token: {e}")
        return None

def search_games(query: str):
    access_token = get_access_token()
    if not access_token:
        return []
    headers = {"Client-ID": settings.IGDB_CLIENT_ID, "Authorization": f"Bearer {access_token}"}
    data = f'search "{query}"; fields name, cover.url, first_release_date, summary; limit 20;'
    try:
        response = requests.post(f"{BASE_URL}/games", headers=headers, data=data)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching from IGDB: {e}")
        return []

def get_game_achievements(igdb_id: int):
    access_token = get_access_token()
    if not access_token:
        return []
    headers = {"Client-ID": settings.IGDB_CLIENT_ID, "Authorization": f"Bearer {access_token}"}
    data = f'fields name, description, url; where game = {igdb_id}; limit 100;'
    try:
        response = requests.post(f"{BASE_URL}/achievements", headers=headers, data=data)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching IGDB achievements: {e}")
        return []

