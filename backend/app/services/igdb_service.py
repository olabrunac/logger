import requests
import os
from app.core.config import settings

BASE_URL = "https://api.igdb.com/v4"
AUTH_URL = "https://id.twitch.tv/oauth2/token"

# In a production app, this token should be cached (e.g., in Redis or a simple file)
# until it expires to avoid requesting a new one for every search.
IGDB_ACCESS_TOKEN = None

def get_access_token():
    """
    Retrieves an access token from Twitch for IGDB API access.
    """
    global IGDB_ACCESS_TOKEN
    if IGDB_ACCESS_TOKEN:
        # Here you would also check if the token is expired
        return IGDB_ACCESS_TOKEN

    if not settings.IGDB_CLIENT_ID or not settings.IGDB_CLIENT_SECRET:
        return None

    try:
        response = requests.post(
            AUTH_URL,
            params={
                "client_id": settings.IGDB_CLIENT_ID,
                "client_secret": settings.IGDB_CLIENT_SECRET,
                "grant_type": "client_credentials",
            },
        )
        response.raise_for_status()
        data = response.json()
        IGDB_ACCESS_TOKEN = data.get("access_token")
        return IGDB_ACCESS_TOKEN
    except requests.exceptions.RequestException as e:
        print(f"Error fetching IGDB access token: {e}")
        return None


def search_games(query: str):
    """
    Searches for games on IGDB.
    """
    access_token = get_access_token()
    if not access_token:
        return []

    headers = {
        "Client-ID": settings.IGDB_CLIENT_ID,
        "Authorization": f"Bearer {access_token}",
    }
    
    # Using the IGDB API query language (APICalypse)
    data = f'search "{query}"; fields name, cover.url, first_release_date, summary; limit 20;'

    try:
        response = requests.post(f"{BASE_URL}/games", headers=headers, data=data)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching from IGDB: {e}")
        return []

