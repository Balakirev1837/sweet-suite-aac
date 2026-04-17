"""
Open-source and non-profit image source catalog for the AAC interface.

This module documents all available open-source and non-profit image
providers that supply symbols, pictograms, and icons suitable for
Augmentative and Alternative Communication (AAC).  Each provider entry
includes license details, API/base-URL information, and attribution
metadata so that the interface can display proper credits.

The catalog is intentionally provider-agnostic: call-sites look up a
provider by ``id`` and receive a structured dict with everything needed
to search for or render an image.

Currently catalogued providers
------------------------------
- **arasaac**  – ARASAAC (Spain), CC BY-NC-SA 3.0
- **mulberry** – Mulberry Symbols / Paxtoncrafts Charitable Trust, CC BY-SA 2.0 UK
- **tawasol**  – Tawasol Symbols (Mada / HMC / Univ. Southampton), CC BY-SA 4.0
- **twemoji**  – Twemoji by Twitter, CC BY 4.0
- **sclera**   – Sclera Symbols (Belgium), CC BY-NC 2.0
- **openmoji** – OpenMoji project, CC BY-SA 4.0
- **openclipart** – Openclipart, CC0 / public domain
- **nounproject** – The Noun Project, various CC licences
- **opensymbols** – OpenSymbols.org aggregator, various licences

Usage
-----
>>> from tts_service.image_sources import PROVIDERS, core_vocabulary_images
>>> arasaac = PROVIDERS["arasaac"]
>>> arasaac["license_type"]
'CC BY-NC-SA 3.0'
>>> core_vocabulary_images().get("help")["provider"]
'arasaac'
"""

from __future__ import annotations

import json
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Provider catalog
# ---------------------------------------------------------------------------

PROVIDERS: Dict[str, Dict[str, Any]] = {
    "arasaac": {
        "id": "arasaac",
        "name": "ARASAAC",
        "full_name": "Portal Aragonés de Comunicación Aumentativa y Alternativa",
        "description": (
            "Free pictographic symbols for AAC, created by Sergio Palao. "
            "Over 40 000 colour and black-and-white symbols covering daily "
            "vocabulary, feelings, actions, places, and more."
        ),
        "url": "https://arasaac.org/",
        "api_url": "https://www.opensymbols.org/api/v1/symbols/search",
        "search_query_template": "q={term} repo:arasaac",
        "license_type": "CC BY-NC-SA 3.0",
        "license_url": "https://creativecommons.org/licenses/by-nc-sa/3.0/",
        "author_name": "Sergio Palao / Gobierno de Aragón",
        "author_url": "https://arasaac.org/condiciones-uso",
        "non_profit": True,
        "open_source": True,
        "content_types": ["image/png"],
        "tags": ["pictograms", "colour", "black-and-white", "spanish-origin"],
    },
    "mulberry": {
        "id": "mulberry",
        "name": "Mulberry Symbols",
        "full_name": "Mulberry Symbol Set (Paxtoncrafts Charitable Trust)",
        "description": (
            "Over 3 000 clean, modern SVG symbols designed for AAC. "
            "Maintained by the Paxtoncrafts Charitable Trust (UK)."
        ),
        "url": "https://mulberrysymbols.org/",
        "api_url": "https://www.opensymbols.org/api/v1/symbols/search",
        "search_query_template": "q={term} repo:mulberry",
        "license_type": "CC BY-SA 2.0 UK",
        "license_url": "https://creativecommons.org/licenses/by-sa/2.0/uk/",
        "author_name": "Paxtoncrafts Charitable Trust",
        "author_url": "http://straight-street.org/lic.php",
        "non_profit": True,
        "open_source": True,
        "content_types": ["image/svg+xml"],
        "tags": ["svg", "modern", "clean-lines"],
    },
    "tawasol": {
        "id": "tawasol",
        "name": "Tawasol Symbols",
        "full_name": "Tawasol Symbol Library (Mada / HMC / Univ. of Southampton)",
        "description": (
            "Bilingual (Arabic/English) symbol set developed by Mada Assistive "
            "Technology Center, Hamad Medical Corporation, and the University of "
            "Southampton. Culturally appropriate symbols for the Arabic-speaking world."
        ),
        "url": "http://www.tawasolsymbols.org/",
        "api_url": "https://www.opensymbols.org/api/v1/symbols/search",
        "search_query_template": "q={term} repo:tawasol",
        "license_type": "CC BY-SA 4.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
        "author_name": "Mada, HMC and University of Southampton",
        "author_url": "http://www.tawasolsymbols.org/",
        "non_profit": True,
        "open_source": True,
        "content_types": ["image/png", "image/jpeg"],
        "tags": ["bilingual", "arabic", "culturally-appropriate"],
    },
    "twemoji": {
        "id": "twemoji",
        "name": "Twemoji",
        "full_name": "Twemoji – Open-Source Emoji by Twitter",
        "description": (
            "A complete, open-source emoji set maintained by Twitter. "
            "Pixel-perfect at any size with consistent, friendly style."
        ),
        "url": "https://github.com/twitter/twemoji",
        "api_url": "https://www.opensymbols.org/api/v1/symbols/search",
        "search_query_template": "q={term} repo:twemoji",
        "license_type": "CC BY 4.0",
        "license_url": "https://creativecommons.org/licenses/by/4.0/",
        "author_name": "Twitter, Inc.",
        "author_url": "https://github.com/twitter/twemoji",
        "non_profit": False,
        "open_source": True,
        "content_types": ["image/svg+xml"],
        "tags": ["emoji", "colour", "friendly"],
    },
    "sclera": {
        "id": "sclera",
        "name": "Sclera Symbols",
        "full_name": "Sclera Pictos",
        "description": (
            "Minimalist black-and-white pictograms from Belgium. "
            "Simple, high-contrast line drawings ideal for users who "
            "prefer low-distraction symbols."
        ),
        "url": "https://www.sclera.be/en/picto/overview",
        "api_url": "https://www.opensymbols.org/api/v1/symbols/search",
        "search_query_template": "q={term} repo:sclera",
        "license_type": "CC BY-NC 2.0",
        "license_url": "https://creativecommons.org/licenses/by-nc/2.0/",
        "author_name": "Sclera vzw",
        "author_url": "https://www.sclera.be/en/picto/copyright",
        "non_profit": True,
        "open_source": True,
        "content_types": ["image/png"],
        "tags": ["black-and-white", "minimalist", "high-contrast"],
    },
    "openmoji": {
        "id": "openmoji",
        "name": "OpenMoji",
        "full_name": "OpenMoji – Open-Source Emojis",
        "description": (
            "A free, open-source emoji set with consistent geometric style. "
            "Over 4 000 emojis designed by students and contributors worldwide. "
            "Great for AAC buttons that need a modern, colourful look."
        ),
        "url": "https://openmoji.org/",
        "api_url": "https://openmoji.org/library",
        "search_query_template": "q={term}",
        "license_type": "CC BY-SA 4.0",
        "license_url": "https://creativecommons.org/licenses/by-sa/4.0/",
        "author_name": "OpenMoji contributors",
        "author_url": "https://openmoji.org/",
        "non_profit": True,
        "open_source": True,
        "content_types": ["image/svg+xml"],
        "tags": ["emoji", "colour", "geometric", "modern"],
    },
    "openclipart": {
        "id": "openclipart",
        "name": "Openclipart",
        "full_name": "Openclipart Library",
        "description": (
            "Over 150 000 public-domain clip-art images. All content is "
            "released into the public domain (CC0), making it ideal for "
            "unrestricted AAC use."
        ),
        "url": "https://openclipart.org/",
        "api_url": "https://openclipart.org/search/json/",
        "search_query_template": "query={term}",
        "license_type": "CC0 / Public Domain",
        "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
        "author_name": "Openclipart contributors",
        "author_url": "https://openclipart.org/",
        "non_profit": True,
        "open_source": True,
        "content_types": ["image/svg+xml", "image/png"],
        "tags": ["clip-art", "public-domain", "varied-styles"],
    },
    "nounproject": {
        "id": "nounproject",
        "name": "The Noun Project",
        "full_name": "The Noun Project – Icons for Everything",
        "description": (
            "Millions of user-created icons. Many are available under "
            "Creative Commons licences. Black-outline style is common, "
            "useful for clean AAC button layouts."
        ),
        "url": "https://thenounproject.com/",
        "api_url": "https://api.thenounproject.com/",
        "search_query_template": "q={term}",
        "license_type": "Various CC (BY, BY-SA)",
        "license_url": "https://thenounproject.com/legal/",
        "author_name": "Various contributors",
        "author_url": "https://thenounproject.com/",
        "non_profit": False,
        "open_source": True,
        "content_types": ["image/svg+xml"],
        "tags": ["icons", "black-outline", "large-catalogue"],
    },
    "opensymbols": {
        "id": "opensymbols",
        "name": "OpenSymbols.org",
        "full_name": "OpenSymbols – Aggregated Free Symbol Search",
        "description": (
            "A search aggregator that indexes multiple free/open symbol "
            "libraries including ARASAAC, Mulberry, Sclera, Twemoji, and "
            "others. The primary search endpoint for Sweet Suite AAC."
        ),
        "url": "https://www.opensymbols.org/",
        "api_url": "https://www.opensymbols.org/api/v1/symbols/search",
        "search_query_template": "q={term}",
        "license_type": "Various (per-result)",
        "license_url": "https://www.opensymbols.org/",
        "author_name": "OpenSymbols",
        "author_url": "https://www.opensymbols.org/about",
        "non_profit": True,
        "open_source": True,
        "content_types": ["image/png", "image/svg+xml", "image/jpeg"],
        "tags": ["aggregator", "search", "multi-library"],
    },
}


# ---------------------------------------------------------------------------
# Core AAC vocabulary → curated image mapping
#
# These mappings point to images hosted on the OpenSymbols CDN
# (d18vdu4p71yql0.cloudfront.net).  They are the same sources used
# by the emergency boards in lib/converters/obf-local.rb and are
# extended here to cover essential AAC core vocabulary.
# ---------------------------------------------------------------------------

_CORE_VOCABULARY: Dict[str, Dict[str, Any]] = {
    # -- Pronouns --
    "I": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/I.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "you": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/you.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "he": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/he.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "she": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/she.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "it": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/that_2.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "we": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/we.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    # -- Core actions --
    "want": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/to want.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "like": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/to like.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "go": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/to go_3.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "get": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/to receive.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "make": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/make - do - write.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "help": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/I need help.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "look": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/What are yopu looking at.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "open": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/open.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "put": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/put in a safe place_2.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "turn": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/turn.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "do": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/to do exercise_2.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "stop": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/sclera/stop.png",
        "provider": "sclera",
        "content_type": "image/png",
    },
    # -- Core descriptors --
    "good": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/good.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "more": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/more_1.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "different": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/different.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "same": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/the same_1.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "all": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/all - everything.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "some": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/some_1.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "not": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/former.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "finished": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/finish.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    # -- Prepositions / locations --
    "here": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/here_1.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "there": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/there.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "in": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/mulberry/in.svg",
        "provider": "mulberry",
        "content_type": "image/svg+xml",
    },
    "on": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/turn on the light.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "up": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/mulberry/up.svg",
        "provider": "mulberry",
        "content_type": "image/svg+xml",
    },
    # -- Wh-questions --
    "what": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/what.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "where": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/mulberry/where.svg",
        "provider": "mulberry",
        "content_type": "image/svg+xml",
    },
    "when": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/noun-project/Time-880d4b0e2b.svg",
        "provider": "nounproject",
        "content_type": "image/svg+xml",
    },
    "who": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/who.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "why": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/mulberry/why.svg",
        "provider": "mulberry",
        "content_type": "image/svg+xml",
    },
    "how": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/how.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    # -- Feelings / emotions --
    "happy": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/happy_1.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "sad": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/sad.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "mad": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/to get angry with_4.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "scared": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/scared_1.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "excited": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f604.svg",
        "provider": "twemoji",
        "content_type": "image/svg+xml",
    },
    "tired": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/tired_1.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "sick": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/to%20get%20sick.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    # -- Needs / wants --
    "eat": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/to eat_1.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "drink": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/to have.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "hungry": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/hungry.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "thirsty": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/thirsty_1.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "food": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/mulberry/food.svg",
        "provider": "mulberry",
        "content_type": "image/svg+xml",
    },
    "water": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/drink.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "sleep": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/to sleep_1.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    # -- People / places --
    "home": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f3e0.svg",
        "provider": "twemoji",
        "content_type": "image/svg+xml",
    },
    "school": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/high school - secondary school.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "family": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/family_5.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "friends": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/friends_3.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    # -- Misc high-frequency --
    "yes": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/yes.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "no": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/no_1.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "please": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/please.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "thank you": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/thank you.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "sorry": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/sorry.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
    "bathroom": {
        "url": "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/bathroom.png",
        "provider": "arasaac",
        "content_type": "image/png",
    },
}


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def get_provider(provider_id: str) -> Optional[Dict[str, Any]]:
    """Look up a single image provider by its unique ``id``.

    Args:
        provider_id: The provider identifier (e.g. ``"arasaac"``).

    Returns:
        A dict describing the provider, or ``None`` if not found.
    """
    return PROVIDERS.get(provider_id)


def list_providers(
    *,
    non_profit_only: bool = False,
    open_source_only: bool = False,
) -> List[Dict[str, Any]]:
    """Return the full list of available image providers.

    Args:
        non_profit_only: If ``True``, exclude for-profit providers.
        open_source_only: If ``True``, exclude providers that are not
            explicitly open-source.

    Returns:
        A list of provider dicts, filtered as requested.
    """
    results: List[Dict[str, Any]] = list(PROVIDERS.values())
    if non_profit_only:
        results = [p for p in results if p.get("non_profit")]
    if open_source_only:
        results = [p for p in results if p.get("open_source")]
    return results


def core_vocabulary_images() -> Dict[str, Dict[str, Any]]:
    """Return the curated core AAC vocabulary → image mapping.

    The mapping maps lowercase English words (e.g. ``"help"``,
    ``"hungry"``) to dicts with ``url``, ``provider``, and
    ``content_type`` keys.

    Returns:
        A copy of the core vocabulary dict (safe to mutate).
    """
    return dict(_CORE_VOCABULARY)


def lookup_image(word: str) -> Optional[Dict[str, Any]]:
    """Look up a curated image for an AAC vocabulary word.

    The lookup is case-insensitive and strips leading/trailing whitespace.

    Args:
        word: The vocabulary word to look up (e.g. ``"Help"``).

    Returns:
        A dict with ``url``, ``provider``, and ``content_type``, or
        ``None`` if the word is not in the curated set.
    """
    return _CORE_VOCABULARY.get(word.strip().lower())


def provider_for_image(image_url: str) -> Optional[str]:
    """Determine which provider an image URL belongs to.

    This is useful for attribution when displaying images in the
    interface.

    Args:
        image_url: The full URL of an image.

    Returns:
        The provider ``id`` string, or ``None`` if the URL does not
        match any known provider CDN pattern.
    """
    for word, entry in _CORE_VOCABULARY.items():
        if entry.get("url") == image_url:
            return entry.get("provider")
    # Fall back to URL pattern matching for providers
    if "arasaac" in image_url:
        return "arasaac"
    if "mulberry" in image_url:
        return "mulberry"
    if "tawasol" in image_url:
        return "tawasol"
    if "twemoji" in image_url:
        return "twemoji"
    if "sclera" in image_url:
        return "sclera"
    if "openmoji" in image_url:
        return "openmoji"
    if "openclipart" in image_url:
        return "openclipart"
    if "noun-project" in image_url:
        return "nounproject"
    return None


def build_opensymbols_search_url(
    term: str,
    *,
    provider: Optional[str] = None,
    locale: str = "en",
) -> str:
    """Build a URL for the OpenSymbols.org search API.

    Args:
        term: The search term.
        provider: Optional provider to restrict the search to
            (e.g. ``"arasaac"``).  If ``None``, all libraries are
            searched.
        locale: The locale code for results.

    Returns:
        A fully-formed URL string for the search API.
    """
    base = "https://www.opensymbols.org/api/v1/symbols/search"
    q = term
    if provider and provider in PROVIDERS:
        tmpl = PROVIDERS[provider].get("search_query_template", "")
        if "repo:" in tmpl:
            q = f"{term} repo:{provider}"
    return f"{base}?q={q}&locale={locale}"


def attribution_for_image(image_url: str) -> Optional[Dict[str, str]]:
    """Return attribution metadata for an image URL.

    Useful for displaying licence credits in the AAC interface.

    Args:
        image_url: The URL of the image to attribute.

    Returns:
        A dict with ``license_type``, ``license_url``, ``author_name``,
        and ``author_url`` keys, or ``None`` if the provider cannot be
        determined.
    """
    pid = provider_for_image(image_url)
    if not pid:
        return None
    provider = PROVIDERS.get(pid, {})
    return {
        "license_type": provider.get("license_type", "unknown"),
        "license_url": provider.get("license_url", ""),
        "author_name": provider.get("author_name", "unknown"),
        "author_url": provider.get("author_url", ""),
    }


def export_catalog_json() -> str:
    """Export the full provider catalog and core vocabulary as JSON.

    Returns:
        A JSON string with ``providers`` and ``core_vocabulary`` keys.
    """
    return json.dumps(
        {
            "providers": PROVIDERS,
            "core_vocabulary": _CORE_VOCABULARY,
        },
        indent=2,
    )
