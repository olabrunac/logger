"""Heurística para detectar se um log de jogo teve a história completa.

O Steam não expõe (via API pública) qual achievement demarca o fim da campanha,
nem a raridade de desbloqueio global (GetGlobalAchievementPercentagesForApp
retorna vazio para quase todos os jogos). Portanto, detectamos o fim da história
pelo texto (nome + descrição) dos achievements desbloqueados, usando padrões em
inglês e português. É heurística: pega os casos explícitos; casos com nomes
temáticos (ex. "Endless Summer" do RDR2) exigem a marcação manual por jogo.
"""

import re

_STORY_END_PATTERN = re.compile(
    r"(?i)\b("
    r"finish(?:ed|ing)?\s+(?:the\s+)?(?:game|story|campaign|main\s+story|main\s+campaign)"
    r"|finish(?:ed|ing)?\s+the\s+(?:campaign|game)"
    r"|complete(?:d)?\s+(?:the\s+)?(?:game|story|campaign|main\s+story|main\s+campaign)"
    r"|completed\s+the\s+(?:game|story|campaign)"
    r"|beat\s+(?:the\s+)?(?:game|story|campaign)"
    r"|story\s+(?:complete(?:d)?|finished|cleared|beaten)"
    r"|campaign\s+(?:complete(?:d)?|finished|cleared|beaten)"
    r"|ending|finale|epilogue"
    r"|final\s+mission|final\s+chapter|last\s+chapter|last\s+mission"
    r"|defeat(?:ed)?\s+the\s+final"
    r"|finish\s+the\s+adventure|completed\s+the\s+adventure"
    r"|conclu(?:iu|a)?\s+o|completou|zerou|venceu\s+o\s+jogo"
    r"|fim\s+da\s+(?:hist[óo]ria|campanha|jornada|aventura)"
    r"|final\s+da\s+(?:hist[óo]ria|campanha)"
    r"|ep[íi]logo|arquivo\s+final|cap[íi]tulo\s+final|miss[ãa]o\s+final"
    r"|derrote\s+o\s+final|derrotou\s+o\s+final"
    r")\b",
)

# Palavras que desqualificam (achievements de side-quest/coleção/online que parecem fim)
_ORIGINALLY_NOT_STORY = re.compile(
    r"(?i)\b(?:100%|collector|collectible|completionist|speedrun|no\s+death|gallery)\b"
    r"|\b(?:online|multiplayer|heist|co-?op|pvp)\b"
    r"|\bcomplete\s+this\s+heist\b|\bfinale\s+without\b"
)


def _looks_like_story_end(text: str | None) -> bool:
    if not text:
        return False
    return bool(_STORY_END_PATTERN.search(text)) and not _ORIGINALLY_NOT_STORY.search(text)


def detect_story_completed(achievements) -> bool:
    """Dada uma lista/iterável de achievements {name, description, unlocked},
    retorna True se o usuário desbloqueou algum achievement que marque o fim da
    história. Apenas achievements desbloqueados contam."""
    for ach in achievements:
        if not ach:
            continue
        unlocked = ach.get("unlocked", False)
        if not unlocked:
            continue
        name = ach.get("name") or ""
        desc = ach.get("description") or ""
        if _looks_like_story_end(name) or _looks_like_story_end(desc):
            return True
    return False


# Palavras-chave também usadas para sugar sugestionar na UI (semântica)
STORY_END_LABEL = "Fim da história"
