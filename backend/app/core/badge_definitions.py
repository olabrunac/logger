from dataclasses import dataclass


@dataclass
class BadgeDef:
    key: str
    title: str
    description: str
    icon: str
    category: str
    threshold: int = 0
    rarity: str = "bronze"
    special: bool = False


BADGE_DEFS: dict[str, BadgeDef] = {}

def _reg(b: BadgeDef):
    BADGE_DEFS[b.key] = b

_reg(BadgeDef("dev", "Dev", "Desenvolvedora do Logger", "Wrench", "special", rarity="cosmico", special=True))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    _reg(BadgeDef(f"movie_{t}", "Cinema", f"{t} filmes assistidos", "Film", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    _reg(BadgeDef(f"series_{t}", "Maratona", f"{t} séries assistidas", "Tv", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    _reg(BadgeDef(f"game_{t}", "Gamer", f"{t} jogos jogados", "Gamepad2", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    _reg(BadgeDef(f"book_{t}", "Leitor", f"{t} livros lidos", "BookOpen", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [1, 5, 10, 25, 50, 100, 250, 500, 1000]:
    _reg(BadgeDef(f"platina_{t}", "Platina", f"{t} jogos platinados", "Trophy", "platinum", t, rarity={1: "bronze", 5: "prata", 10: "ouro", 25: "diamante", 50: "lendario", 100: "imortal", 250: "arcano", 500: "celestial", 1000: "cosmico"}[t]))

for t in [1, 10, 50, 100, 250, 500, 1000]:
    desc = "Primeira review escrita" if t == 1 else f"{t} reviews escritas"
    _reg(BadgeDef(f"review_{t}", "Crítico", desc, "Star", "reviews", t, rarity={1: "bronze", 10: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano"}[t]))

for t in [7, 30, 90, 180, 365, 730, 1095]:
    _reg(BadgeDef(f"streak_{t}", "Daily", f"{t} dias seguidos com log", "Flame", "streak", t, rarity={7: "bronze", 30: "prata", 90: "ouro", 180: "diamante", 365: "lendario", 730: "imortal", 1095: "arcano"}[t]))

_reg(BadgeDef("first_follower", "Famoso", "Primeiro seguidor", "UserPlus", "social", 1, rarity="celestial"))
_reg(BadgeDef("10_followers", "Popular", "10 seguidores", "Users", "social", 10, rarity="prata"))
_reg(BadgeDef("50_followers", "Influencer", "50 seguidores", "Users", "social", 50, rarity="ouro"))
_reg(BadgeDef("100_followers", "Celebridade", "100 seguidores", "Users", "social", 100, rarity="diamante"))
_reg(BadgeDef("250_followers", "Social", "250 seguidores", "Users", "social", 250, rarity="lendario"))
_reg(BadgeDef("500_followers", "Ícone", "500 seguidores", "Users", "social", 500, rarity="imortal"))
_reg(BadgeDef("first_post", "Post", "Primeiro post na timeline", "MessageCircle", "social", 1, rarity="celestial"))

_reg(BadgeDef("first_log", "Log", "Primeiro log criado", "Target", "general", 1, rarity="celestial"))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    _reg(BadgeDef(f"logs_{t}", "Logs", f"{t} logs no total", "Award", "general", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

_reg(BadgeDef("omnivoro", "Omnívoro", "Log de cada tipo de mídia", "Compass", "general", 1, rarity="celestial"))
_reg(BadgeDef("fav_5", "Favorito", "5 favoritos", "Heart", "general", 5, rarity="prata"))
_reg(BadgeDef("fav_25", "Favorito", "25 favoritos", "Heart", "general", 25, rarity="ouro"))
_reg(BadgeDef("fav_100", "Favorito", "100 favoritos", "Heart", "general", 100, rarity="diamante"))
_reg(BadgeDef("fav_250", "Favorito", "250 favoritos", "Heart", "general", 250, rarity="lendario"))
_reg(BadgeDef("hours_332", "332h", "332 horas acumuladas", "Clock", "general", 332, rarity="celestial"))
_reg(BadgeDef("hours_666", "666h", "666 horas acumuladas", "Flame", "general", 666, rarity="cosmico"))

BADGE_CATEGORIES = {
    "special": "Especial",
    "media": "Por Tipo de Mídia",
    "platinum": "Platina",
    "reviews": "Reviews",
    "streak": "Sequência",
    "social": "Social",
    "general": "Gerais",
}

RARITY_ORDER = ["bronze", "prata", "ouro", "diamante", "lendario", "imortal", "arcano", "celestial", "cosmico"]
