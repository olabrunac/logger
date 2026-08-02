import datetime

import requests
from app.core.config import settings

BASE_URL = "https://api.themoviedb.org/3"

def search_media(query: str, media_type: str, year: int = None):
    if not settings.TMDB_API_KEY:
        return []
    search_url = f"{BASE_URL}/search/{media_type}"
    params = {"api_key": settings.TMDB_API_KEY, "query": query, "language": "en-US", "page": 1}
    if year:
        if media_type == "movie":
            params["year"] = year
        else:
            params["first_air_date_year"] = year
    try:
        response = requests.get(search_url, params=params)
        response.raise_for_status()
        return response.json().get("results", [])
    except requests.exceptions.RequestException as e:
        print(f"Error fetching from TMDb: {e}")
        return []

def get_tv_seasons(tmdb_id: int):
    if not settings.TMDB_API_KEY:
        return []
    url = f"{BASE_URL}/tv/{tmdb_id}"
    params = {"api_key": settings.TMDB_API_KEY, "language": "pt-BR"}
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return [{"season_number": s["season_number"], "name": s["name"], "episode_count": s["episode_count"], "poster_path": s.get("poster_path")} for s in data.get("seasons", []) if s.get("season_number", 0) > 0]
    except requests.exceptions.RequestException as e:
        print(f"Error fetching TMDb seasons: {e}")
        return []

def get_tv_season_episodes(tmdb_id: int, season_number: int):
    if not settings.TMDB_API_KEY:
        return []
    url = f"{BASE_URL}/tv/{tmdb_id}/season/{season_number}"
    params = {"api_key": settings.TMDB_API_KEY, "language": "pt-BR"}
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        return [{"episode_number": e["episode_number"], "season_number": e["season_number"], "name": e["name"], "air_date": e.get("air_date"), "still_path": e.get("still_path")} for e in data.get("episodes", [])]
    except requests.exceptions.RequestException as e:
        print(f"Error fetching TMDb episodes: {e}")
        return []

def get_movie_details(tmdb_id: int):
    if not settings.TMDB_API_KEY:
        return None
    url = f"{BASE_URL}/movie/{tmdb_id}"
    params = {"api_key": settings.TMDB_API_KEY, "language": "pt-BR", "append_to_response": "credits,videos"}
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        director = ""
        for crew in data.get("credits", {}).get("crew", []):
            if crew.get("job") == "Director":
                director = crew.get("name", "")
                break
        trailer = ""
        for v in data.get("videos", {}).get("results", []):
            if v.get("site") == "YouTube" and v.get("type") == "Trailer":
                trailer = f"https://www.youtube.com/watch?v={v['key']}"
                break
        cast = ", ".join([c["name"] for c in data.get("credits", {}).get("cast", [])[:5]])
        cover = data.get("poster_path")
        return {
            "cover_image_url": f"https://image.tmdb.org/t/p/w500{cover}" if cover else None,
            "synopsis": data.get("overview"),
            "genres": ", ".join(g["name"] for g in data.get("genres", [])),
            "runtime": data.get("runtime"),
            "vote_average": data.get("vote_average"),
            "director": director,
            "trailer_url": trailer,
            "cast": cast,
        }
    except requests.exceptions.RequestException as e:
        print(f"Error fetching TMDb movie details: {e}")
        return None

def get_movie_by_id(tmdb_id: int):
    details = get_movie_details(tmdb_id)
    if not details:
        return None
    url = f"{BASE_URL}/movie/{tmdb_id}"
    params = {"api_key": settings.TMDB_API_KEY, "language": "pt-BR"}
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching TMDb movie: {e}")
        data = {}
    details["title"] = data.get("title") or data.get("original_title")
    release_date = None
    rdate = data.get("release_date")
    if rdate:
        try:
            release_date = datetime.datetime.strptime(rdate, '%Y-%m-%d').date()
        except ValueError:
            pass
    details["release_date"] = release_date
    return details

def get_tv_by_id(tmdb_id: int):
    details = get_tv_details(tmdb_id)
    if not details:
        return None
    url = f"{BASE_URL}/tv/{tmdb_id}"
    params = {"api_key": settings.TMDB_API_KEY, "language": "pt-BR"}
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error fetching TMDb TV: {e}")
        data = {}
    details["title"] = data.get("name") or data.get("original_name")
    details["total_episodes"] = sum(
        s.get("episode_count", 0)
        for s in data.get("seasons", [])
        if s.get("season_number", 0) > 0
    )
    details["seasons_count"] = data.get("number_of_seasons")
    return details

def get_tv_details(tmdb_id: int):
    if not settings.TMDB_API_KEY:
        return None
    url = f"{BASE_URL}/tv/{tmdb_id}"
    params = {"api_key": settings.TMDB_API_KEY, "language": "pt-BR", "append_to_response": "credits"}
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        creator = ""
        for c in data.get("created_by", []):
            creator = c.get("name", "")
            break
        runtime = None
        if data.get("episode_run_time"):
            runtime = data["episode_run_time"][0]
        cast = ", ".join([c["name"] for c in data.get("credits", {}).get("cast", [])[:5]])
        cover = data.get("poster_path")
        release_date = None
        first_air = data.get("first_air_date")
        if first_air:
            try:
                release_date = datetime.datetime.strptime(first_air, '%Y-%m-%d').date()
            except ValueError:
                pass
        return {
            "cover_image_url": f"https://image.tmdb.org/t/p/w500{cover}" if cover else None,
            "synopsis": data.get("overview"),
            "genres": ", ".join(g["name"] for g in data.get("genres", [])),
            "runtime": runtime,
            "vote_average": data.get("vote_average"),
            "director": creator,
            "cast": cast,
            "release_date": release_date,
        }
    except requests.exceptions.RequestException as e:
        print(f"Error fetching TMDb TV details: {e}")
        return None
