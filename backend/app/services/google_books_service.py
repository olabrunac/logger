import re
import requests
import datetime
from app.core.config import settings

BASE_URL = "https://www.googleapis.com/books/v1/volumes"

def _looks_like_isbn(value: str) -> bool:
    digits = re.sub(r"[\- ]", "", (value or "").strip())
    if len(digits) == 10 and (digits.isdigit() or (digits[:9].isdigit() and digits[-1] in "Xx")):
        return True
    return len(digits) == 13 and digits.isdigit()


def search_books(query: str, author: str = None, year: int = None, isbn: str = None, use_intitle: bool = True):
    if not settings.GOOGLE_BOOKS_API_KEY:
        return []
    isbn = isbn or (query if _looks_like_isbn(query) else None)
    if isbn:
        q_str = f"isbn:{isbn}"
    else:
        if use_intitle:
            parts = [f"intitle:{query}"]
        else:
            parts = [query]
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


def get_book_by_id(volume_id: str) -> dict | None:
    if not settings.GOOGLE_BOOKS_API_KEY or not volume_id:
        return None
    url = f"{BASE_URL}/{volume_id}"
    params = {"key": settings.GOOGLE_BOOKS_API_KEY}
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        vi = response.json().get("volumeInfo", {})
        release_date = None
        if vi.get("publishedDate"):
            try:
                release_date = datetime.datetime.strptime(vi["publishedDate"][:10], '%Y-%m-%d').date()
            except ValueError:
                try:
                    release_date = datetime.datetime.strptime(vi["publishedDate"][:4], '%Y').date()
                except ValueError:
                    release_date = None
        image_links = vi.get("imageLinks", {})
        cover_url = image_links.get("thumbnail") or image_links.get("smallThumbnail")
        return {
            "title": vi.get("title", "Sem título"),
            "cover_image_url": cover_url,
            "release_date": release_date,
            "synopsis": vi.get("description"),
            "page_count": vi.get("pageCount"),
            "publisher": vi.get("publisher"),
            "book_categories": ", ".join(vi.get("categories", [])),
            "book_language": vi.get("language"),
            "book_rating": vi.get("averageRating"),
            "google_books_id": volume_id,
        }
    except requests.exceptions.RequestException as e:
        print(f"Error fetching book by id: {e}")
        return None
