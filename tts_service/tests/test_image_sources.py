"""
Tests for the open-source/non-profit image source catalog.

Validates the provider catalog, core vocabulary mapping, lookup helpers,
and JSON export functionality.
"""

import json
import pytest

from tts_service.image_sources import (
    PROVIDERS,
    attribution_for_image,
    build_opensymbols_search_url,
    core_vocabulary_images,
    export_catalog_json,
    get_provider,
    list_providers,
    lookup_image,
    provider_for_image,
)


# ---------------------------------------------------------------------------
# Provider catalog tests
# ---------------------------------------------------------------------------


class TestProviderCatalog:
    """Validate the structure and completeness of the PROVIDERS dict."""

    EXPECTED_PROVIDERS = [
        "arasaac",
        "mulberry",
        "tawasol",
        "twemoji",
        "sclera",
        "openmoji",
        "openclipart",
        "nounproject",
        "opensymbols",
    ]

    REQUIRED_KEYS = [
        "id",
        "name",
        "full_name",
        "description",
        "url",
        "license_type",
        "license_url",
        "author_name",
        "author_url",
        "non_profit",
        "open_source",
        "content_types",
    ]

    def test_all_expected_providers_present(self):
        """All expected providers must be in the catalog."""
        for pid in self.EXPECTED_PROVIDERS:
            assert pid in PROVIDERS, f"Provider '{pid}' missing from catalog"

    def test_each_provider_has_required_keys(self):
        """Every provider dict must contain all required metadata keys."""
        for pid, provider in PROVIDERS.items():
            for key in self.REQUIRED_KEYS:
                assert key in provider, f"Provider '{pid}' missing key '{key}'"

    def test_provider_id_matches_key(self):
        """The ``id`` field must match the dict key."""
        for pid, provider in PROVIDERS.items():
            assert provider["id"] == pid

    def test_all_providers_have_url(self):
        """Every provider must have a non-empty URL."""
        for pid, provider in PROVIDERS.items():
            assert provider["url"].startswith("http"), (
                f"Provider '{pid}' URL does not start with http"
            )

    def test_all_providers_have_valid_licence_url(self):
        """Every provider must have a licence URL starting with http."""
        for pid, provider in PROVIDERS.items():
            assert provider["license_url"].startswith("http"), (
                f"Provider '{pid}' licence URL is invalid"
            )


class TestGetProvider:
    """Test the ``get_provider`` lookup helper."""

    def test_returns_provider_for_valid_id(self):
        """Should return the provider dict for a known ID."""
        provider = get_provider("arasaac")
        assert provider is not None
        assert provider["name"] == "ARASAAC"

    def test_returns_none_for_unknown_id(self):
        """Should return None for an unknown provider ID."""
        assert get_provider("nonexistent") is None

    def test_returns_none_for_empty_string(self):
        """Should return None for an empty string."""
        assert get_provider("") is None


class TestListProviders:
    """Test the ``list_providers`` filtering helper."""

    def test_returns_all_by_default(self):
        """Without filters, all providers are returned."""
        result = list_providers()
        assert len(result) == len(PROVIDERS)

    def test_non_profit_only(self):
        """When non_profit_only=True, for-profit providers are excluded."""
        result = list_providers(non_profit_only=True)
        for p in result:
            assert p["non_profit"] is True
        # nounproject and twemoji are not non-profit
        ids = {p["id"] for p in result}
        assert "nounproject" not in ids or PROVIDERS["nounproject"]["non_profit"]

    def test_open_source_only(self):
        """When open_source_only=True, all returned providers are open-source."""
        result = list_providers(open_source_only=True)
        for p in result:
            assert p["open_source"] is True

    def test_combined_filters(self):
        """Both filters can be applied simultaneously."""
        result = list_providers(non_profit_only=True, open_source_only=True)
        for p in result:
            assert p["non_profit"] is True
            assert p["open_source"] is True


# ---------------------------------------------------------------------------
# Core vocabulary tests
# ---------------------------------------------------------------------------


class TestCoreVocabulary:
    """Validate the core AAC vocabulary → image mapping."""

    REQUIRED_IMAGE_KEYS = ["url", "provider", "content_type"]

    def test_core_vocabulary_not_empty(self):
        """Core vocabulary must contain entries."""
        vocab = core_vocabulary_images()
        assert len(vocab) > 0

    def test_each_entry_has_required_keys(self):
        """Every image entry must have url, provider, and content_type."""
        vocab = core_vocabulary_images()
        for word, entry in vocab.items():
            for key in self.REQUIRED_IMAGE_KEYS:
                assert key in entry, f"Word '{word}' missing key '{key}'"

    def test_each_entry_url_starts_with_http(self):
        """Every image URL must be a valid HTTP(S) URL."""
        vocab = core_vocabulary_images()
        for word, entry in vocab.items():
            assert entry["url"].startswith("http"), (
                f"Word '{word}' has invalid URL: {entry['url']}"
            )

    def test_each_entry_provider_is_known(self):
        """Every image entry must reference a known provider."""
        vocab = core_vocabulary_images()
        for word, entry in vocab.items():
            assert entry["provider"] in PROVIDERS, (
                f"Word '{word}' references unknown provider '{entry['provider']}'"
            )

    def test_returns_copy(self):
        """core_vocabulary_images must return a copy, not the original."""
        v1 = core_vocabulary_images()
        v2 = core_vocabulary_images()
        assert v1 is not v2
        assert v1 == v2

    def test_essential_words_present(self):
        """Essential AAC core vocabulary must be present."""
        vocab = core_vocabulary_images()
        essential = [
            "I",
            "you",
            "want",
            "help",
            "eat",
            "drink",
            "yes",
            "no",
            "happy",
            "sad",
        ]
        for word in essential:
            assert word in vocab, (
                f"Essential word '{word}' missing from core vocabulary"
            )


class TestLookupImage:
    """Test the ``lookup_image`` helper."""

    def test_finds_exact_word(self):
        """Should find an image for an exact word match."""
        result = lookup_image("help")
        assert result is not None
        assert "url" in result

    def test_case_insensitive(self):
        """Lookup should be case-insensitive."""
        assert lookup_image("HELP") is not None
        assert lookup_image("Help") is not None
        assert lookup_image("help") is not None
        assert lookup_image("HELP") == lookup_image("help")

    def test_strips_whitespace(self):
        """Leading/trailing whitespace should be ignored."""
        assert lookup_image("  help  ") == lookup_image("help")

    def test_returns_none_for_unknown_word(self):
        """Unknown words should return None."""
        assert lookup_image("xylophone_teleport") is None


# ---------------------------------------------------------------------------
# Provider detection tests
# ---------------------------------------------------------------------------


class TestProviderForImage:
    """Test the ``provider_for_image`` URL-based detection."""

    def test_detects_arasaac_url(self):
        """Should detect ARASAAC images by URL pattern."""
        pid = provider_for_image(
            "https://d18vdu4p71yql0.cloudfront.net/libraries/arasaac/I.png"
        )
        assert pid == "arasaac"

    def test_detects_mulberry_url(self):
        """Should detect Mulberry images by URL pattern."""
        pid = provider_for_image(
            "https://d18vdu4p71yql0.cloudfront.net/libraries/mulberry/food.svg"
        )
        assert pid == "mulberry"

    def test_detects_twemoji_url(self):
        """Should detect Twemoji images by URL pattern."""
        pid = provider_for_image(
            "https://d18vdu4p71yql0.cloudfront.net/libraries/twemoji/1f3e0.svg"
        )
        assert pid == "twemoji"

    def test_returns_none_for_unknown_url(self):
        """Unknown URLs should return None."""
        assert provider_for_image("https://example.com/image.png") is None

    def test_detects_from_core_vocab_exact_url(self):
        """Exact URLs from core vocab should be detected."""
        result = lookup_image("stop")
        assert result is not None
        pid = provider_for_image(result["url"])
        assert pid == "sclera"


# ---------------------------------------------------------------------------
# Search URL builder tests
# ---------------------------------------------------------------------------


class TestBuildOpenSymbolsSearchUrl:
    """Test the ``build_opensymbols_search_url`` helper."""

    def test_basic_search_url(self):
        """Should build a valid search URL without a provider filter."""
        url = build_opensymbols_search_url("cat")
        assert "opensymbols.org" in url
        assert "q=cat" in url
        assert "locale=en" in url

    def test_provider_filtered_search_url(self):
        """Should append repo: filter when a provider is specified."""
        url = build_opensymbols_search_url("cat", provider="arasaac")
        assert "repo:arasaac" in url

    def test_custom_locale(self):
        """Should use the provided locale."""
        url = build_opensymbols_search_url("cat", locale="es")
        assert "locale=es" in url

    def test_unknown_provider_ignored(self):
        """An unknown provider should not add a repo filter."""
        url = build_opensymbols_search_url("cat", provider="unknown_provider")
        assert "repo:" not in url


# ---------------------------------------------------------------------------
# Attribution tests
# ---------------------------------------------------------------------------


class TestAttributionForImage:
    """Test the ``attribution_for_image`` helper."""

    def test_returns_attribution_for_known_image(self):
        """Should return attribution metadata for a known image URL."""
        entry = lookup_image("help")
        assert entry is not None
        attr = attribution_for_image(entry["url"])
        assert attr is not None
        assert "license_type" in attr
        assert "author_name" in attr

    def test_returns_none_for_unknown_url(self):
        """Should return None for an unrecognized URL."""
        assert attribution_for_image("https://example.com/img.png") is None

    def test_attribution_fields_are_strings(self):
        """All attribution fields should be strings."""
        entry = lookup_image("home")
        assert entry is not None
        attr = attribution_for_image(entry["url"])
        assert attr is not None
        for key in ["license_type", "license_url", "author_name", "author_url"]:
            assert isinstance(attr[key], str), f"{key} should be a string"


# ---------------------------------------------------------------------------
# JSON export tests
# ---------------------------------------------------------------------------


class TestExportCatalogJson:
    """Test the ``export_catalog_json`` function."""

    def test_produces_valid_json(self):
        """Should produce valid JSON that can be parsed."""
        raw = export_catalog_json()
        data = json.loads(raw)
        assert isinstance(data, dict)

    def test_json_contains_providers(self):
        """Exported JSON must include a 'providers' key."""
        data = json.loads(export_catalog_json())
        assert "providers" in data
        assert isinstance(data["providers"], dict)

    def test_json_contains_core_vocabulary(self):
        """Exported JSON must include a 'core_vocabulary' key."""
        data = json.loads(export_catalog_json())
        assert "core_vocabulary" in data
        assert isinstance(data["core_vocabulary"], dict)

    def test_all_providers_in_json(self):
        """All providers from PROVIDERS must appear in the export."""
        data = json.loads(export_catalog_json())
        for pid in PROVIDERS:
            assert pid in data["providers"]
