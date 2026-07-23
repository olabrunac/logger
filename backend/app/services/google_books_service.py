import requests
from app.core.config import settings

BASE_URL = "https://www.googleapis.com/books/v1/volumes"

def search_books(query: str, author: str = None, year: int = None, isbn: str = None):
    if not settings.GOOGLE_BOOKS_API_KEY:
        return []
    if isbn:
        q_str = f"isbn:{isbn}"
    else:
        parts = [f"intitle:{query}"]
        if author:
            parts.append(f"inauthor:{author}")
        q_str = " ".join(parts)
    params = {
        "q": q_str,
        "maxResults": 20,
        "printType": "books",
        "key": settings.GOOGLE_BOOKS_API_KEY,
    }
    if year and not isbn:
        params["q"] += f"+year:{year}"
    try:
        response = requests.get(BASE_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        items = data.get("items", [])
        if year and not author and not isbn:
            items = [
                it for it in items
                if it.get("volumeInfo", {}).get("publishedDate", "").startswith(str(year))
            ]
        return items
    except requests.exceptions.RequestException as e:
        print(f"Error fetching from Google Books: {e}")
        return []

def get_book_details(volume_id: str):
    if not settings.GOOGLE_BOOKS_API_KEY or not volume_id:
        return None
    url = f"{BASE_URL}/{volume_id}"
    params = {"key": settings.GOOGLE_BOOKS_API_KEY}
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        info = response.json().get("volumeInfo", {})
        return {
            "page_count": info.get("pageCount"),
            "publisher": info.get("publisher"),
            "book_categories": ", ".join(info.get("categories", [])),
            "book_language": info.get("language"),
            "book_rating": info.get("averageRating"),
        }
    except requests.exceptions.RequestException as e:
        print(f"Error fetching book details: {e}")
        return None
