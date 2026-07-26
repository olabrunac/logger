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

_reg(BadgeDef("dev", "Dev", "Criadora do Logger", "Wrench", "special", rarity="cosmico", special=True))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    names = {10: ("Cineasta Iniciante", "Assistiu 10 filmes"), 25: ("Cineasta", "Assistiu 25 filmes"), 50: ("Cineasta Expert", "Assistiu 50 filmes"), 100: ("Cineasta Mestre", "Assistiu 100 filmes"), 250: ("Cineasta Lenda", "Assistiu 250 filmes"), 500: ("Cineasta Imortal", "Assistiu 500 filmes"), 1000: ("Cineasta Arcano", "Assistiu 1.000 filmes"), 2500: ("Cineasta Celestial", "Assistiu 2.500 filmes"), 5000: ("Cineasta Cósmico", "Assistiu 5.000 filmes")}
    _reg(BadgeDef(f"movie_{t}", names[t][0], names[t][1], "Film", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    names = {10: ("Maratonista Iniciante", "Assistiu 10 séries"), 25: ("Maratonista", "Assistiu 25 séries"), 50: ("Maratonista Expert", "Assistiu 50 séries"), 100: ("Maratonista Mestre", "Assistiu 100 séries"), 250: ("Maratonista Lenda", "Assistiu 250 séries"), 500: ("Maratonista Imortal", "Assistiu 500 séries"), 1000: ("Maratonista Arcano", "Assistiu 1.000 séries"), 2500: ("Maratonista Celestial", "Assistiu 2.500 séries"), 5000: ("Maratonista Cósmico", "Assistiu 5.000 séries")}
    _reg(BadgeDef(f"series_{t}", names[t][0], names[t][1], "Tv", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    names = {10: ("Gamer Iniciante", "Jogou 10 jogos"), 25: ("Gamer", "Jogou 25 jogos"), 50: ("Gamer Expert", "Jogou 50 jogos"), 100: ("Gamer Mestre", "Jogou 100 jogos"), 250: ("Gamer Lenda", "Jogou 250 jogos"), 500: ("Gamer Imortal", "Jogou 500 jogos"), 1000: ("Gamer Arcano", "Jogou 1.000 jogos"), 2500: ("Gamer Celestial", "Jogou 2.500 jogos"), 5000: ("Gamer Cósmico", "Jogou 5.000 jogos")}
    _reg(BadgeDef(f"game_{t}", names[t][0], names[t][1], "Gamepad2", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    names = {10: ("Leitor Iniciante", "Leu 10 livros"), 25: ("Leitor", "Leu 25 livros"), 50: ("Leitor Expert", "Leu 50 livros"), 100: ("Leitor Mestre", "Leu 100 livros"), 250: ("Leitor Lenda", "Leu 250 livros"), 500: ("Leitor Imortal", "Leu 500 livros"), 1000: ("Leitor Arcano", "Leu 1.000 livros"), 2500: ("Leitor Celestial", "Leu 2.500 livros"), 5000: ("Leitor Cósmico", "Leu 5.000 livros")}
    _reg(BadgeDef(f"book_{t}", names[t][0], names[t][1], "BookOpen", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [1, 5, 10, 25, 50, 100, 250, 500, 1000]:
    names = {1: ("Platinador", "Platinou 1 jogo"), 5: ("Platinador Expert", "Platinou 5 jogos"), 10: ("Platinador Mestre", "Platinou 10 jogos"), 25: ("Platinador Lenda", "Platinou 25 jogos"), 50: ("Platinador Imortal", "Platinou 50 jogos"), 100: ("Platinador Arcano", "Platinou 100 jogos"), 250: ("Platinador Celestial", "Platinou 250 jogos"), 500: ("Platinador Cósmico", "Platinou 500 jogos"), 1000: ("Platinador Cósmico", "Platinou 1.000 jogos")}
    _reg(BadgeDef(f"platina_{t}", names[t][0], names[t][1], "Trophy", "platinum", t, rarity={1: "bronze", 5: "prata", 10: "ouro", 25: "diamante", 50: "lendario", 100: "imortal", 250: "arcano", 500: "celestial", 1000: "cosmico"}[t]))

for t in [1, 10, 50, 100, 250, 500, 1000]:
    names = {1: ("Crítico", "Escreveu 1ª review"), 10: ("Crítico Ativo", "Escreveu 10 reviews"), 50: ("Crítico Expert", "Escreveu 50 reviews"), 100: ("Crítico Mestre", "Escreveu 100 reviews"), 250: ("Crítico Imortal", "Escreveu 250 reviews"), 500: ("Crítico Arcano", "Escreveu 500 reviews"), 1000: ("Crítico Celestial", "Escreveu 1.000 reviews")}
    _reg(BadgeDef(f"review_{t}", names[t][0], names[t][1], "Star", "reviews", t, rarity={1: "bronze", 10: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano"}[t]))

for t in [7, 30, 90, 180, 365, 730, 1095]:
    names = {7: ("Fogo Aceso", "7 dias seguidos com log"), 30: ("Em Chamas", "30 dias seguidos com log"), 90: ("Incombustível", "90 dias seguidos com log"), 180: ("Eterno", "180 dias seguidos com log"), 365: ("Lenda Viva", "365 dias seguidos com log"), 730: ("Imortal", "730 dias seguidos com log"), 1095: ("Arcano", "1.095 dias seguidos com log")}
    _reg(BadgeDef(f"streak_{t}", names[t][0], names[t][1], "Flame", "streak", t, rarity={7: "bronze", 30: "prata", 90: "ouro", 180: "diamante", 365: "lendario", 730: "imortal", 1095: "arcano"}[t]))

_reg(BadgeDef("first_follower", "Primeiro Seguidor", "Tem 1 seguidor", "UserPlus", "social", 1, rarity="bronze"))
_reg(BadgeDef("10_followers", "Popular", "Tem 10 seguidores", "Users", "social", 10, rarity="prata"))
_reg(BadgeDef("50_followers", "Influencer", "Tem 50 seguidores", "Users", "social", 50, rarity="ouro"))
_reg(BadgeDef("100_followers", "Celebridade", "Tem 100 seguidores", "Users", "social", 100, rarity="diamante"))
_reg(BadgeDef("250_followers", "Lenda Social", "Tem 250 seguidores", "Users", "social", 250, rarity="lendario"))
_reg(BadgeDef("500_followers", "Ícone", "Tem 500 seguidores", "Users", "social", 500, rarity="imortal"))
_reg(BadgeDef("first_post", "Primeira Postagem", "Fez 1º post na timeline", "MessageCircle", "social", 1, rarity="bronze"))

_reg(BadgeDef("first_log", "Primeiro Log", "Criou seu 1º log", "Target", "general", 1, rarity="bronze"))
_reg(BadgeDef("total_100", "Dedicado", "100 logs no total", "Award", "general", 100, rarity="diamante"))
_reg(BadgeDef("total_500", "Obsecado", "500 logs no total", "Award", "general", 500, rarity="imortal"))
_reg(BadgeDef("total_1000", "Lenda Viva", "1.000 logs no total", "Award", "general", 1000, rarity="arcano"))
_reg(BadgeDef("omnivoro", "Omnívoro", "Tem logs de filmes, séries, jogos e livros", "Compass", "general", 1, rarity="prata"))
_reg(BadgeDef("fav_5", "Fã de Coração", "5 favoritos", "Heart", "general", 5, rarity="prata"))
_reg(BadgeDef("fav_25", "Colecionador", "25 favoritos", "Heart", "general", 25, rarity="ouro"))
_reg(BadgeDef("fav_100", "Colecionador Expert", "100 favoritos", "Heart", "general", 100, rarity="diamante"))
_reg(BadgeDef("fav_250", "Colecionador Lenda", "250 favoritos", "Heart", "general", 250, rarity="lendario"))

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
