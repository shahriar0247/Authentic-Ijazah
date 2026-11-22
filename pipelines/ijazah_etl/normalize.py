"""Arabic text normalization for search/matching.

Two levels:
  - `normalize`: light — strip tashkeel/tatwil/punct, unify alef/hamza/ya/ta-marbuta,
    collapse whitespace. Used for `search_text` columns and name matching.
  - `signature`: aggressive — additionally collapses repeated spaces entirely and
    keeps only word chars; used as a match key for cross-dataset joins.
"""

import re
import unicodedata

_TASHKEEL = re.compile(r"[ً-ْٰـ]")
# alef variants, hamza-on-seat variants, alef maqsura, taa marbuta, haa
_ALEF = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ﭐ": "ا"})
_MISC = str.maketrans({
    "ى": "ي",      # alef maqsura -> ya
    "ة": "ه",      # taa marbuta -> haa (match-friendly)
    "ؤ": "و",      # hamza on waw -> waw
    "ئ": "ي",      # hamza on ya -> ya
    "ء": "",       # bare hamza dropped
    "ﻻ": "لا",
})
_NON_WORD = re.compile(r"[^\w\s]+", re.UNICODE)
_WS = re.compile(r"\s+")


def normalize(s: str | None) -> str:
    if not s:
        return ""
    s = unicodedata.normalize("NFC", s)
    s = _TASHKEEL.sub("", s)
    s = s.translate(_ALEF).translate(_MISC)
    s = _NON_WORD.sub(" ", s)
    return _WS.sub(" ", s).strip().lower()


def signature(s: str | None) -> str:
    """Spaceless match key — for text-level joins between corpora."""
    return normalize(s).replace(" ", "")


RANK_NORM_MAP = {
    "صحابي": "sahabi",
    "ثقة ثبت": "thiqa_thabt",
    "ثقة حافظ": "thiqa_hafiz",
    "ثقة": "thiqa",
    "صدوق": "saduq",
    "صدوق سيء الحفظ": "saduq_sayi",
    "مقبول": "maqbul",
    "ضعيف": "daif",
    "ضعيف جدا": "daif_jiddan",
    "متروك": "matruk",
    "كذاب": "kadhdhab",
    "وضاع": "wadda",
    "متهم": "muttaham",
    "مجروح": "majruh",
    "مجهول": "majhul",
    "مدلس": "mudallis",
    "إمام حافظ": "imam_hafiz",
    "حافظ": "hafiz",
    "ثبت": "thabt",
}


def normalize_rank(rank_ar: str | None) -> str | None:
    """Best-effort Arabic rijal verdict -> normalized slug. OWNER-tunable map."""
    if not rank_ar:
        return None
    key = normalize(rank_ar)
    for ar, norm in RANK_NORM_MAP.items():
        if normalize(ar) in key:
            return norm
    return None


TBAQA_ORD = {
    "صحابة": 0,
    "الصحابة": 0,
    "تابعي": 1,
    "التابعون": 1,
    "تابعي التابعين": 2,
    "أتباع التابعين": 2,
}
