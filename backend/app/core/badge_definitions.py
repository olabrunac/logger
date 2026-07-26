from dataclasses import dataclass


@dataclass
class BadgeDef:
    key: str
    title: str
    description: str
    icon: str
    category: str
    threshold: int = 0
    special: bool = False


BADGE_DEFS: dict[str, BadgeDef] = {}

# --- Special ---
def _reg(b: BadgeDef):
    BADGE_DEFS[b.key] = b

_reg(BadgeDef("dev", "Desenvolvedora", "Criadora do Logger", "🛠️", "special", special=True))

# --- Filmes ---
for t in [10, 25, 50, 100, 250]:
    names = {10: ("Cineasta Iniciante", "Assistiu 10 filmes"), 25: ("Cineasta", "Assistiu 25 filmes"), 50: ("Cineasta Expert", "Assistiu 50 filmes"), 100: ("Cineasta Mestre", "Assistiu 100 filmes"), 250: ("Cineasta Lenda", "Assistiu 250 filmes")}
    _reg(BadgeDef(f"movie_{t}", names[t][0], names[t][1], "🎬", "media", t))

# --- Séries ---
for t in [10, 25, 50, 100, 250]:
    names = {10: ("Maratonista Iniciante", "Assistiu 10 séries"), 25: ("Maratonista", "Assistiu 25 séries"), 50: ("Maratonista Expert", "Assistiu 50 séries"), 100: ("Maratonista Mestre", "Assistiu 100 séries"), 250: ("Maratonista Lenda", "Assistiu 250 séries")}
    _reg(BadgeDef(f"series_{t}", names[t][0], names[t][1], "📺", "media", t))

# --- Jogos ---
for t in [10, 25, 50, 100, 250]:
    names = {10: ("Gamer Iniciante", "Jogou 10 jogos"), 25: ("Gamer", "Jogou 25 jogos"), 50: ("Gamer Expert", "Jogou 50 jogos"), 100: ("Gamer Mestre", "Jogou 100 jogos"), 250: ("Gamer Lenda", "Jogou 250 jogos")}
    _reg(BadgeDef(f"game_{t}", names[t][0], names[t][1], "🎮", "media", t))

# --- Livros ---
for t in [10, 25, 50, 100, 250]:
    names = {10: ("Leitor Iniciante", "Leu 10 livros"), 25: ("Leitor", "Leu 25 livros"), 50: ("Leitor Expert", "Leu 50 livros"), 100: ("Leitor Mestre", "Leu 100 livros"), 250: ("Leitor Lenda", "Leu 250 livros")}
    _reg(BadgeDef(f"book_{t}", names[t][0], names[t][1], "📚", "media", t))

# --- Platina ---
for t in [1, 5, 10, 25]:
    names = {1: ("Platinador", "Platinou 1 jogo"), 5: ("Platinador Expert", "Platinou 5 jogos"), 10: ("Platinador Mestre", "Platinou 10 jogos"), 25: ("Platinador Lenda", "Platinou 25 jogos")}
    _reg(BadgeDef(f"platina_{t}", names[t][0], names[t][1], "🏆", "platinum", t))

# --- Reviews ---
for t in [1, 10, 50, 100]:
    names = {1: ("Crítico", "Escreveu 1ª review"), 10: ("Crítico Ativo", "Escreveu 10 reviews"), 50: ("Crítico Expert", "Escreveu 50 reviews"), 100: ("Crítico Mestre", "Escreveu 100 reviews")}
    _reg(BadgeDef(f"review_{t}", names[t][0], names[t][1], "⭐", "reviews", t))

# --- Streak ---
for t in [7, 30, 90, 365]:
    names = {7: ("Fogo Aceso", "7 dias seguidos com log"), 30: ("Em Chamas", "30 dias seguidos com log"), 90: ("Incombustível", "90 dias seguidos com log"), 365: ("Lenda Viva", "365 dias seguidos com log")}
    _reg(BadgeDef(f"streak_{t}", names[t][0], names[t][1], "🔥", "streak", t))

# --- Social ---
_reg(BadgeDef("first_follower", "Primeiro Seguidor", "Tem 1 seguidor", "👥", "social", 1))
_reg(BadgeDef("10_followers", "Popular", "Tem 10 seguidores", "👥", "social", 10))
_reg(BadgeDef("50_followers", "Influencer", "Tem 50 seguidores", "👥", "social", 50))
_reg(BadgeDef("100_followers", "Celebridade", "Tem 100 seguidores", "👥", "social", 100))
_reg(BadgeDef("first_post", "Primeira Postagem", "Fez 1º post na timeline", "💬", "social", 1))

# --- Gerais ---
_reg(BadgeDef("first_log", "Primeiro Log", "Criou seu 1º log", "🎯", "general", 1))
_reg(BadgeDef("total_100", "Dedicado", "100 logs no total", "🏅", "general", 100))
_reg(BadgeDef("omnivoro", "Omnívoro", "Tem logs de filmes, séries, jogos e livros", "🌀", "general", 1))
_reg(BadgeDef("fav_5", "Fã de Coração", "5 favoritos", "❤️", "general", 5))
_reg(BadgeDef("fav_25", "Colecionador", "25 favoritos", "❤️", "general", 25))

BADGE_CATEGORIES = {
    "special": "Especial",
    "media": "Por Tipo de Mídia",
    "platinum": "Platina",
    "reviews": "Reviews",
    "streak": "Sequência",
    "social": "Social",
    "general": "Gerais",
}
