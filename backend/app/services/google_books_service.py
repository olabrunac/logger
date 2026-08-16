import re
import requests
import datetime
from app.core.config import settings

BASE_URL = "https://www.googleapis.com/books/v1/volumes"

def _normalize_isbn(value: str) -> str | None:
    digits = re.sub(r"[\- ]", "", (value or "").strip())
    if len(digits) == 10 and digits[:9].isdigit() and digits[-1] in "Xx0123456789":
        return digits[:-1] + digits[-1].upper()
    if len(digits) == 13 and digits.isdigit():
        return digits
    return None


def _looks_like_isbn(value: str) -> bool:
    return _normalize_isbn(value) is not None


def _extract_isbns(vi: dict) -> tuple:
    isbn_13 = None
    isbn_10 = None
    for ident in vi.get("industryIdentifiers", []):
        ident_type = ident.get("type")
        if ident_type == "ISBN_13":
            isbn_13 = ident.get("identifier")
        elif ident_type == "ISBN_10":
            isbn_10 = ident.get("identifier")
    return isbn_13, isbn_10


def _cover_url(vi: dict) -> str | None:
    """Capa do Google Books; sem capa, cai para Open Library (por ISBN)."""
    image_links = vi.get("imageLinks", {})
    cover = image_links.get("thumbnail") or image_links.get("smallThumbnail")
    if cover:
        if cover.startswith("http://"):
            cover = "https://" + cover[7:]
        return cover
    isbn_13, isbn_10 = _extract_isbns(vi)
    isbn = isbn_13 or isbn_10
    if isbn:
        return f"https://covers.openlibrary.org/b/isbn/{_normalize_isbn(isbn)}-L.jpg"
    return None


def search_books(query: str, author: str = None, year: int = None, isbn: str = None, use_intitle: bool = True):
    if not settings.GOOGLE_BOOKS_API_KEY:
        return []
    isbn = _normalize_isbn(isbn) if isbn else (_normalize_isbn(query) if _looks_like_isbn(query) else None)
    if isbn:
        q_str = f"isbn:{isbn}"
    else:
        parts = []
        if query:
            parts.append(f"intitle:{query}" if use_intitle else query)
        if author:
            parts.append(f"inauthor:{author}")
        if not parts:
            return []
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

def discover_books(subject: str, max_results: int = 10):
    """Descobre livros por categoria/assunto (fallback das sugestões)."""
    if not settings.GOOGLE_BOOKS_API_KEY or not subject:
        return []
    params = {
        "q": f"subject:{subject}",
        "maxResults": max_results,
        "printType": "books",
        "key": settings.GOOGLE_BOOKS_API_KEY,
    }
    try:
        response = requests.get(BASE_URL, params=params, timeout=10)
        response.raise_for_status()
        return response.json().get("items", [])[:max_results]
    except requests.exceptions.RequestException as e:
        print(f"Error fetching Google Books discover: {e}")
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
        cover_url = _cover_url(vi)
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
