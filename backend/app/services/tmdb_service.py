import requests
from app.core.config import settings

BASE_URL = "https://api.themoviedb.org/3"

def search_media(query: str, media_type: str):
    """
    Searches for movies or series on TMDb.
    media_type can be 'movie' or 'tv'.
    """
    if not settings.TMDB_API_KEY:
        return []

    search_url = f"{BASE_URL}/search/{media_type}"
    params = {
        "api_key": settings.TMDB_API_KEY,
        "query": query,
        "language": "en-US",
        "page": 1,
    }

    try:
        response = requests.get(search_url, params=params)
        response.raise_for_status()  # Raise an exception for bad status codes
        return response.json().get("results", [])
    except requests.exceptions.RequestException as e:
        print(f"Error fetching from TMDb: {e}")
        return []
