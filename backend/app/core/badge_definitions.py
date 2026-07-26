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
    names = {10: ("Cineasta Iniciante", "Marque {t} filmes como assistidos"), 25: ("Cineasta", "Marque {t} filmes como assistidos"), 50: ("Cineasta Expert", "Marque {t} filmes como assistidos"), 100: ("Cineasta Mestre", "Marque {t} filmes como assistidos"), 250: ("Cineasta Lenda", "Marque {t} filmes como assistidos"), 500: ("Cineasta Imortal", "Marque {t} filmes como assistidos"), 1000: ("Cineasta Arcano", "Marque {t} filmes como assistidos"), 2500: ("Cineasta Celestial", "Marque {t} filmes como assistidos"), 5000: ("Cineasta Cósmico", "Marque {t} filmes como assistidos")}
    _reg(BadgeDef(f"movie_{t}", names[t][0], names[t][1].format(t=t), "Film", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    names = {10: ("Maratonista Iniciante", "Marque {t} séries como assistidas"), 25: ("Maratonista", "Marque {t} séries como assistidas"), 50: ("Maratonista Expert", "Marque {t} séries como assistidas"), 100: ("Maratonista Mestre", "Marque {t} séries como assistidas"), 250: ("Maratonista Lenda", "Marque {t} séries como assistidas"), 500: ("Maratonista Imortal", "Marque {t} séries como assistidas"), 1000: ("Maratonista Arcano", "Marque {t} séries como assistidas"), 2500: ("Maratonista Celestial", "Marque {t} séries como assistidas"), 5000: ("Maratonista Cósmico", "Marque {t} séries como assistidas")}
    _reg(BadgeDef(f"series_{t}", names[t][0], names[t][1].format(t=t), "Tv", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    names = {10: ("Gamer Iniciante", "Marque {t} jogos como jogados"), 25: ("Gamer", "Marque {t} jogos como jogados"), 50: ("Gamer Expert", "Marque {t} jogos como jogados"), 100: ("Gamer Mestre", "Marque {t} jogos como jogados"), 250: ("Gamer Lenda", "Marque {t} jogos como jogados"), 500: ("Gamer Imortal", "Marque {t} jogos como jogados"), 1000: ("Gamer Arcano", "Marque {t} jogos como jogados"), 2500: ("Gamer Celestial", "Marque {t} jogos como jogados"), 5000: ("Gamer Cósmico", "Marque {t} jogos como jogados")}
    _reg(BadgeDef(f"game_{t}", names[t][0], names[t][1].format(t=t), "Gamepad2", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [10, 25, 50, 100, 250, 500, 1000, 2500, 5000]:
    names = {10: ("Leitor Iniciante", "Marque {t} livros como lidos"), 25: ("Leitor", "Marque {t} livros como lidos"), 50: ("Leitor Expert", "Marque {t} livros como lidos"), 100: ("Leitor Mestre", "Marque {t} livros como lidos"), 250: ("Leitor Lenda", "Marque {t} livros como lidos"), 500: ("Leitor Imortal", "Marque {t} livros como lidos"), 1000: ("Leitor Arcano", "Marque {t} livros como lidos"), 2500: ("Leitor Celestial", "Marque {t} livros como lidos"), 5000: ("Leitor Cósmico", "Marque {t} livros como lidos")}
    _reg(BadgeDef(f"book_{t}", names[t][0], names[t][1].format(t=t), "BookOpen", "media", t, rarity={10: "bronze", 25: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano", 2500: "celestial", 5000: "cosmico"}[t]))

for t in [1, 5, 10, 25, 50, 100, 250, 500, 1000]:
    names = {1: ("Platinador", "Platine {t} jogo marcando como platinado"), 5: ("Platinador Expert", "Platine {t} jogos marcando como platinado"), 10: ("Platinador Mestre", "Platine {t} jogos marcando como platinado"), 25: ("Platinador Lenda", "Platine {t} jogos marcando como platinado"), 50: ("Platinador Imortal", "Platine {t} jogos marcando como platinado"), 100: ("Platinador Arcano", "Platine {t} jogos marcando como platinado"), 250: ("Platinador Celestial", "Platine {t} jogos marcando como platinado"), 500: ("Platinador Cósmico", "Platine {t} jogos marcando como platinado"), 1000: ("Platinador Transcendental", "Platine {t} jogos marcando como platinado")}
    _reg(BadgeDef(f"platina_{t}", names[t][0], names[t][1].format(t=t), "Trophy", "platinum", t, rarity={1: "bronze", 5: "prata", 10: "ouro", 25: "diamante", 50: "lendario", 100: "imortal", 250: "arcano", 500: "celestial", 1000: "cosmico"}[t]))

for t in [1, 10, 50, 100, 250, 500, 1000]:
    names = {1: ("Crítico", "Escreva uma review com nota ou texto em qualquer log"), 10: ("Crítico Ativo", "Escreva {t} reviews com nota ou texto"), 50: ("Crítico Expert", "Escreva {t} reviews com nota ou texto"), 100: ("Crítico Mestre", "Escreva {t} reviews com nota ou texto"), 250: ("Crítico Imortal", "Escreva {t} reviews com nota ou texto"), 500: ("Crítico Arcano", "Escreva {t} reviews com nota ou texto"), 1000: ("Crítico Celestial", "Escreva {t} reviews com nota ou texto")}
    _reg(BadgeDef(f"review_{t}", names[t][0], names[t][1].format(t=t), "Star", "reviews", t, rarity={1: "bronze", 10: "prata", 50: "ouro", 100: "diamante", 250: "lendario", 500: "imortal", 1000: "arcano"}[t]))

for t in [7, 30, 90, 180, 365, 730, 1095]:
    names = {7: ("Fogo Aceso", "Crie logs em {t} dias seguidos"), 30: ("Em Chamas", "Crie logs em {t} dias seguidos"), 90: ("Incombustível", "Crie logs em {t} dias seguidos"), 180: ("Eterno", "Crie logs em {t} dias seguidos"), 365: ("Lenda Viva", "Crie logs em {t} dias seguidos"), 730: ("Imortal", "Crie logs em {t} dias seguidos"), 1095: ("Arcano", "Crie logs em {t} dias seguidos")}
    _reg(BadgeDef(f"streak_{t}", names[t][0], names[t][1].format(t=t), "Flame", "streak", t, rarity={7: "bronze", 30: "prata", 90: "ouro", 180: "diamante", 365: "lendario", 730: "imortal", 1095: "arcano"}[t]))

_reg(BadgeDef("first_follower", "Primeiro Seguidor", "Receba seu primeiro seguidor no perfil", "UserPlus", "social", 1, rarity="celestial"))
_reg(BadgeDef("10_followers", "Popular", "Receba 10 seguidores no perfil", "Users", "social", 10, rarity="prata"))
_reg(BadgeDef("50_followers", "Influencer", "Receba 50 seguidores no perfil", "Users", "social", 50, rarity="ouro"))
_reg(BadgeDef("100_followers", "Celebridade", "Receba 100 seguidores no perfil", "Users", "social", 100, rarity="diamante"))
_reg(BadgeDef("250_followers", "Lenda Social", "Receba 250 seguidores no perfil", "Users", "social", 250, rarity="lendario"))
_reg(BadgeDef("500_followers", "Ícone", "Receba 500 seguidores no perfil", "Users", "social", 500, rarity="imortal"))
_reg(BadgeDef("first_post", "Primeira Postagem", "Publique seu primeiro post na timeline", "MessageCircle", "social", 1, rarity="celestial"))

_reg(BadgeDef("first_log", "Primeiro Log", "Crie seu primeiro log de qualquer tipo de mídia", "Target", "general", 1, rarity="celestial"))
_reg(BadgeDef("total_100", "Dedicado", "Tenha 100 logs no total (qualquer status exceto wishlist)", "Award", "general", 100, rarity="diamante"))
_reg(BadgeDef("total_500", "Obsecado", "Tenha 500 logs no total (qualquer status exceto wishlist)", "Award", "general", 500, rarity="imortal"))
_reg(BadgeDef("total_1000", "Lenda Viva", "Tenha 1.000 logs no total (qualquer status exceto wishlist)", "Award", "general", 1000, rarity="arcano"))
_reg(BadgeDef("omnivoro", "Omnívoro", "Tenha pelo menos 1 log de cada tipo: filme, série, jogo e livro", "Compass", "general", 1, rarity="celestial"))
_reg(BadgeDef("fav_5", "Fã de Coração", "Marque 5 logs como favoritos (não conta wishlist)", "Heart", "general", 5, rarity="prata"))
_reg(BadgeDef("fav_25", "Colecionador", "Marque 25 logs como favoritos", "Heart", "general", 25, rarity="ouro"))
_reg(BadgeDef("fav_100", "Colecionador Expert", "Marque 100 logs como favoritos", "Heart", "general", 100, rarity="diamante"))
_reg(BadgeDef("fav_250", "Colecionador Lenda", "Marque 250 logs como favoritos", "Heart", "general", 250, rarity="lendario"))
_reg(BadgeDef("hours_332", "332 Horas", "Acumule 332 horas totais de mídia (exceto wishlist)", "Clock", "general", 332, rarity="celestial"))
_reg(BadgeDef("hours_666", "666 Horas", "Acumule 666 horas totais de mídia (exceto wishlist)", "Flame", "general", 666, rarity="cosmico"))

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
