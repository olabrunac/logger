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

_reg(BadgeDef("dev", "Dev", "Badge exclusiva para desenvolvedoras do Logger", "Wrench", "special", rarity="cosmico", special=True))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    _reg(BadgeDef(f"movie_{t}", "Cineasta", f"Marque {t} filmes como assistidos", "Film", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    _reg(BadgeDef(f"series_{t}", "Maratonista", f"Marque {t} séries como assistidas", "Tv", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    _reg(BadgeDef(f"game_{t}", "Gamer", f"Marque {t} jogos como jogados", "Gamepad2", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    _reg(BadgeDef(f"book_{t}", "Leitor", f"Marque {t} livros como lidos", "BookOpen", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [1, 5, 10, 25, 50, 100, 250, 500, 1000]:
    _reg(BadgeDef(f"platina_{t}", "Platina", f"Platine {t} jogo marcando como platinado", "Trophy", "platinum", t, rarity={1: "bronze", 5: "prata", 10: "ouro", 25: "diamante", 50: "lendario", 100: "imortal", 250: "arcano", 500: "celestial", 1000: "cosmico"}[t]))

for t in [1, 10, 50, 100, 250, 500, 1000]:
    desc = "Escreva uma review com nota ou texto em qualquer log" if t == 1 else f"Escreva {t} reviews com nota ou texto"
    _reg(BadgeDef(f"review_{t}", "Crítico", desc, "Star", "reviews", t, rarity={1: "bronze", 10: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano"}[t]))

for t in [7, 30, 90, 180, 365, 730, 1095]:
    _reg(BadgeDef(f"streak_{t}", "Fogo", f"Crie logs em {t} dias seguidos", "Flame", "streak", t, rarity={7: "bronze", 30: "prata", 90: "ouro", 180: "diamante", 365: "lendario", 730: "imortal", 1095: "arcano"}[t]))

_reg(BadgeDef("first_follower", "Seguidor", "Receba seu primeiro seguidor no perfil", "UserPlus", "social", 1, rarity="celestial"))
_reg(BadgeDef("10_followers", "Popular", "Receba 10 seguidores no perfil", "Users", "social", 10, rarity="prata"))
_reg(BadgeDef("50_followers", "Influencer", "Receba 50 seguidores no perfil", "Users", "social", 50, rarity="ouro"))
_reg(BadgeDef("100_followers", "Celebridade", "Receba 100 seguidores no perfil", "Users", "social", 100, rarity="diamante"))
_reg(BadgeDef("250_followers", "Social", "Receba 250 seguidores no perfil", "Users", "social", 250, rarity="lendario"))
_reg(BadgeDef("500_followers", "Ícone", "Receba 500 seguidores no perfil", "Users", "social", 500, rarity="imortal"))
_reg(BadgeDef("first_post", "Post", "Publique seu primeiro post na timeline", "MessageCircle", "social", 1, rarity="celestial"))

_reg(BadgeDef("first_log", "Log", "Crie seu primeiro log de qualquer tipo de mídia", "Target", "general", 1, rarity="celestial"))
_reg(BadgeDef("total_100", "Dedicado", "Tenha 100 logs no total (qualquer status exceto wishlist)", "Award", "general", 100, rarity="diamante"))
_reg(BadgeDef("total_500", "Obsecado", "Tenha 500 logs no total (qualquer status exceto wishlist)", "Award", "general", 500, rarity="imortal"))
_reg(BadgeDef("total_1000", "Lenda", "Tenha 1.000 logs no total (qualquer status exceto wishlist)", "Award", "general", 1000, rarity="arcano"))
_reg(BadgeDef("omnivoro", "Omnívoro", "Tenha pelo menos 1 log de cada tipo: filme, série, jogo e livro", "Compass", "general", 1, rarity="celestial"))
_reg(BadgeDef("fav_5", "Favorito", "Marque 5 logs como favoritos (não conta wishlist)", "Heart", "general", 5, rarity="prata"))
_reg(BadgeDef("fav_25", "Favorito", "Marque 25 logs como favoritos", "Heart", "general", 25, rarity="ouro"))
_reg(BadgeDef("fav_100", "Favorito", "Marque 100 logs como favoritos", "Heart", "general", 100, rarity="diamante"))
_reg(BadgeDef("fav_250", "Favorito", "Marque 250 logs como favoritos", "Heart", "general", 250, rarity="lendario"))
_reg(BadgeDef("hours_332", "Horas", "Acumule 332 horas totais de mídia (exceto wishlist)", "Clock", "general", 332, rarity="celestial"))
_reg(BadgeDef("hours_666", "Horas", "Acumule 666 horas totais de mídia (exceto wishlist)", "Flame", "general", 666, rarity="cosmico"))

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
