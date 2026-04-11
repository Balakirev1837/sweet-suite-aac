/**
 * LLM Voice Provider Abstraction
 *
 * Defines a common interface for LLM-powered voice synthesis backends.
 * This allows swapping between providers like SherpaTTS/Qwen3 (local),
 * OpenAI TTS (cloud), and any future backends without changing consumer code.
 *
 * SherpaTTS is the primary/default provider — it runs locally, requires no
 * API key, and works offline.
 *
 * Each provider must implement:
 *   - listVoices(locale)  → [{id, name, locale, gender, age, preview_url}]
 *   - synthesize(text, voice_id, opts) → Promise<string>  (audio URL or data URI)
 *   - isAvailable()       → boolean
 */

/**
 * Abstract base class for LLM voice providers.
 * Subclasses must override all three interface methods.
 *
 * @example
 *   class MyProvider extends LLMVoiceProvider {
 *     isAvailable() { return true; }
 *     listVoices(locale) { ... }
 *     synthesize(text, voice_id, opts) { ... }
 *   }
 */
class LLMVoiceProvider {
  /**
   * Check whether this provider is currently usable (e.g. model loaded,
   * API key present, network reachable).
   *
   * @returns {boolean} true if the provider can synthesize right now
   */
  isAvailable() {
    throw new Error('LLMVoiceProvider#isAvailable must be implemented by subclass');
  }

  /**
   * List the voices this provider offers, optionally filtered by locale.
   *
   * @param {string} [locale] - BCP-47 locale tag to filter by (e.g. 'en-US').
   *                            If omitted, all voices are returned.
   * @returns {Promise<Array<{id: string, name: string, locale: string, gender: string, age: string, preview_url: string}>>}
   *          Array of voice descriptor objects.
   */
  listVoices(/* locale */) {
    throw new Error('LLMVoiceProvider#listVoices must be implemented by subclass');
  }

  /**
   * Synthesize speech audio for the given text using the specified voice.
   *
   * @param {string} text - The text to speak.
   * @param {string} voice_id - The voice identifier (from listVoices).
   * @param {Object} [opts] - Additional synthesis options.
   * @param {number} [opts.rate=1.0]  - Speaking rate multiplier.
   * @param {number} [opts.pitch=1.0] - Pitch multiplier.
   * @param {number} [opts.volume=1.0] - Volume multiplier.
   * @param {string} [opts.format='mp3'] - Desired audio format ('mp3', 'wav', 'ogg').
   * @returns {Promise<string>} Resolves with a URL or data-URI of the audio.
   */
  synthesize(/* text, voice_id, opts */) {
    throw new Error('LLMVoiceProvider#synthesize must be implemented by subclass');
  }
}

// ---------------------------------------------------------------------------
// SherpaTTS / Qwen3 Provider (local, offline, default)
// ---------------------------------------------------------------------------

/**
 * SherpaTTS provider — runs entirely on-device via a local model (Qwen3 or
 * compatible). Requires no API key and works offline once the model is
 * downloaded.
 *
 * The provider expects `window.sherpa_tts` to be present when running inside
 * the installed app with the native Sherpa engine loaded. When that global is
 * absent the provider reports itself as unavailable.
 */
class SherpaTTSProvider extends LLMVoiceProvider {
  /**
   * @param {Object} [config] - Optional configuration.
   * @param {string} [config.model='qwen3'] - Model identifier for SherpaTTS.
   */
  constructor(config) {
    super();
    var cfg = config || {};
    this.model = cfg.model || 'qwen3';
    this._voicesCache = null;
  }

  /** @returns {boolean} true when the SherpaTTS native bridge is loaded */
  isAvailable() {
    return !!(window.sherpa_tts && window.sherpa_tts.isReady && window.sherpa_tts.isReady());
  }

  /**
   * List SherpaTTS voices. When a locale is given, only voices matching the
   * language portion of the locale are returned.
   *
   * @param {string} [locale]
   * @returns {Promise<Array<{id: string, name: string, locale: string, gender: string, age: string, preview_url: string}>>}
   */
  listVoices(locale) {
    if (!this.isAvailable()) {
      return Promise.resolve([]);
    }
    if (this._voicesCache) {
      return Promise.resolve(this._filterByLocale(this._voicesCache, locale));
    }
    var self = this;
    return new Promise(function(resolve, reject) {
      window.sherpa_tts.listVoices(function(voices) {
        if (!voices) {
          reject(new Error('SherpaTTS returned no voice data'));
          return;
        }
        self._voicesCache = voices;
        resolve(self._filterByLocale(voices, locale));
      }, function(err) {
        reject(err || new Error('SherpaTTS listVoices failed'));
      });
    });
  }

  /**
   * Synthesize audio locally via SherpaTTS.
   *
   * @param {string} text
   * @param {string} voice_id
   * @param {Object} [opts]
   * @returns {Promise<string>} data-URI or blob URL of the rendered audio
   */
  synthesize(text, voice_id, opts) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('SherpaTTS is not available'));
    }
    opts = opts || {};
    var params = {
      text: text,
      voice_id: voice_id,
      rate: opts.rate || 1.0,
      pitch: opts.pitch || 1.0,
      volume: opts.volume || 1.0,
      format: opts.format || 'mp3'
    };
    return new Promise(function(resolve, reject) {
      window.sherpa_tts.synthesize(params, function(audioUrl) {
        if (audioUrl) {
          resolve(audioUrl);
        } else {
          reject(new Error('SherpaTTS synthesize returned no audio'));
        }
      }, function(err) {
        reject(err || new Error('SherpaTTS synthesize failed'));
      });
    });
  }

  /**
   * Filter a list of voice descriptors by locale prefix.
   *
   * @param {Array} voices
   * @param {string} [locale]
   * @returns {Array}
   * @private
   */
  _filterByLocale(voices, locale) {
    if (!locale) { return voices; }
    var lang = locale.split(/[-_]/)[0].toLowerCase();
    return voices.filter(function(v) {
      var vLang = (v.locale || '').split(/[-_]/)[0].toLowerCase();
      return vLang === lang;
    });
  }
}

// ---------------------------------------------------------------------------
// OpenAI TTS Provider (cloud, proxied through backend)
// ---------------------------------------------------------------------------

/**
 * OpenAI TTS provider — calls the backend proxy to generate audio via the
 * OpenAI speech API. The API key is never exposed to the browser; it lives
 * on the server (LLM_VOICE_API_KEY env var) and the backend forwards the
 * request to OpenAI.
 */
class OpenAITTSProvider extends LLMVoiceProvider {
  /**
   * @param {Object} config
   * @param {string} [config.backendUrl] - Base URL of the backend TTS proxy
   *   (e.g. 'http://localhost:5003'). Defaults to the current origin.
   * @param {string} [config.model='tts-1'] - OpenAI TTS model name
   */
  constructor(config) {
    super();
    var cfg = config || {};
    this.backendUrl = (cfg.backendUrl || (window.location && window.location.origin) || '').replace(/\/+$/, '');
    this.model = cfg.model || 'tts-1';
  }

  /** @returns {boolean} true when the browser is online and a backend URL is set */
  isAvailable() {
    return !!(this.backendUrl && navigator.onLine);
  }

  /**
   * OpenAI provides a fixed set of voices — no locale filtering needed
   * since the model handles any language.
   *
   * @returns {Promise<Array<{id: string, name: string, locale: string, gender: string, age: string, preview_url: string}>>}
   */
  listVoices() {
    // OpenAI TTS offers a fixed set of named voices
    var voices = [
      { id: 'alloy',   name: 'Alloy',   locale: 'multi', gender: 'neutral', age: 'adult', preview_url: '' },
      { id: 'ash',     name: 'Ash',     locale: 'multi', gender: 'neutral', age: 'adult', preview_url: '' },
      { id: 'ballad',  name: 'Ballad',  locale: 'multi', gender: 'neutral', age: 'adult', preview_url: '' },
      { id: 'coral',   name: 'Coral',   locale: 'multi', gender: 'neutral', age: 'adult', preview_url: '' },
      { id: 'echo',    name: 'Echo',    locale: 'multi', gender: 'm',      age: 'adult', preview_url: '' },
      { id: 'fable',   name: 'Fable',   locale: 'multi', gender: 'neutral', age: 'adult', preview_url: '' },
      { id: 'onyx',    name: 'Onyx',    locale: 'multi', gender: 'm',      age: 'adult', preview_url: '' },
      { id: 'nova',    name: 'Nova',    locale: 'multi', gender: 'f',      age: 'adult', preview_url: '' },
      { id: 'sage',    name: 'Sage',    locale: 'multi', gender: 'neutral', age: 'adult', preview_url: '' },
      { id: 'shimmer', name: 'Shimmer', locale: 'multi', gender: 'f',      age: 'adult', preview_url: '' }
    ];
    return Promise.resolve(voices);
  }

  /**
   * Synthesize via the backend OpenAI proxy endpoint.
   *
   * The request is sent to /api/tts/openai_proxy on the backend which
   * injects the API key and forwards to OpenAI. The audio blob is
   * returned as an object URL.
   *
   * @param {string} text
   * @param {string} voice_id - One of the OpenAI voice names.
   * @param {Object} [opts]
   * @returns {Promise<string>} Object URL for the audio blob
   */
  synthesize(text, voice_id, opts) {
    if (!this.isAvailable()) {
      return Promise.reject(new Error('OpenAI TTS is not available (offline or no backend URL)'));
    }
    opts = opts || {};
    var format = opts.format || 'mp3';
    var responseFormat = format === 'wav' ? 'wav' : format === 'ogg' ? 'opus' : 'mp3';
    var body = JSON.stringify({
      model: this.model,
      input: text,
      voice: voice_id,
      response_format: responseFormat,
      speed: opts.rate || 1.0
    });

    return fetch(this.backendUrl + '/api/tts/openai_proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: body
    }).then(function(response) {
      if (!response.ok) {
        throw new Error('OpenAI TTS proxy request failed: ' + response.status);
      }
      return response.blob();
    }).then(function(blob) {
      return URL.createObjectURL(blob);
    });
  }
}

// ---------------------------------------------------------------------------
// Provider Registry
// ---------------------------------------------------------------------------

/**
 * Registry of available LLM voice providers. The default provider is
 * SherpaTTS (local, offline). Additional providers can be registered and
 * selected at runtime.
 */
var llmVoiceProviders = {
  /** @type {Object<string, LLMVoiceProvider>} provider id → instance */
  _providers: {},

  /** @type {string} key of the default/active provider */
  _defaultProvider: 'sherpa',

  /**
   * Register a provider instance under the given id.
   *
   * @param {string} id - Unique provider identifier
   * @param {LLMVoiceProvider} provider - Provider instance
   * @param {boolean} [makeDefault=false] - Set as the default provider
   */
  register: function(id, provider, makeDefault) {
    this._providers[id] = provider;
    if (makeDefault) {
      this._defaultProvider = id;
    }
  },

  /**
   * Unregister a provider by id.
   *
   * @param {string} id
   */
  unregister: function(id) {
    delete this._providers[id];
    if (this._defaultProvider === id) {
      // Fall back to sherpa if available, otherwise first remaining key
      var keys = Object.keys(this._providers);
      this._defaultProvider = keys.length > 0 ? keys[0] : null;
    }
  },

  /**
   * Get a provider instance by id.
   *
   * @param {string} id
   * @returns {LLMVoiceProvider|undefined}
   */
  getProvider: function(id) {
    return this._providers[id];
  },

  /**
   * Get the currently selected default provider.
   *
   * @returns {LLMVoiceProvider|undefined}
   */
  getDefaultProvider: function() {
    return this._providers[this._defaultProvider];
  },

  /**
   * Set the default provider by id.
   *
   * @param {string} id
   */
  setDefaultProvider: function(id) {
    if (!this._providers[id]) {
      throw new Error('Unknown LLM voice provider: ' + id);
    }
    this._defaultProvider = id;
  },

  /**
   * List all registered provider ids.
   *
   * @returns {string[]}
   */
  listProviderIds: function() {
    return Object.keys(this._providers);
  }
};

// ---------------------------------------------------------------------------
// LLM Voice Consent Gate
// ---------------------------------------------------------------------------

/**
 * Consent gate for LLM voice synthesis. Enforces the requirement that users
 * must opt in before any LLM voice provider is used. For cloud providers
 * (e.g. OpenAI), supervised users additionally need supervisor approval.
 *
 * SherpaTTS (local) has a simplified consent flow because no data leaves the
 * server infrastructure. Cloud providers require explicit acknowledgment that
 * text is sent to a third-party API.
 *
 * Usage:
 *   // Check before calling synthesize
 *   if (llmVoiceConsentGate.allowed('openai', userPreferences)) { ... }
 *
 *   // Get a safe provider (falls back to sherpa when consent is missing)
 *   var provider = llmVoiceConsentGate.resolveProvider(userPreferences);
 *   provider.synthesize(text, voiceId).then(...)
 */
var llmVoiceConsentGate = {
  /**
   * Provider types that run locally and do not send data to third parties.
   * These require only the simplified consent flow.
   *
   * @type {string[]}
   * @private
   */
  _localProviders: ['sherpa'],

  /**
   * Check whether a given provider type is considered local (no data leaves
   * the server).
   *
   * @param {string} providerId
   * @returns {boolean}
   */
  isLocalProvider: function(providerId) {
    return this._localProviders.indexOf(providerId) !== -1;
  },

  /**
   * Determine whether the user has granted the consent required for the
   * given provider. Local providers only need the base consent flag; cloud
   * providers additionally require that the user is not a supervised user
   * without supervisor approval.
   *
   * @param {string} providerId - Provider identifier ('sherpa', 'openai', etc.)
   * @param {Object} userPreferences - The user's preferences object
   * @param {boolean} [userPreferences.llm_voice_consent] - Base consent flag
   * @param {boolean} [userPreferences.supervisor_llm_voice_consent] - Supervisor approval flag
   * @param {string[]} [userPreferences.supervisor_user_ids] - List of supervisor IDs (truthy = supervised)
   * @returns {boolean} true if the provider may be used
   */
  allowed: function(providerId, userPreferences) {
    var prefs = userPreferences || {};
    if (!prefs.llm_voice_consent) {
      return false;
    }
    // Cloud providers require supervisor approval for supervised users
    if (!this.isLocalProvider(providerId)) {
      var hasSupervisors = !!(prefs.supervisor_user_ids && prefs.supervisor_user_ids.length > 0);
      if (hasSupervisors && !prefs.supervisor_llm_voice_consent) {
        return false;
      }
    }
    return true;
  },

  /**
   * Get a human-readable explanation of what the consent covers for the
   * given provider type. Useful for displaying consent prompts.
   *
   * @param {string} providerId
   * @returns {string}
   */
  consentExplanation: function(providerId) {
    if (this.isLocalProvider(providerId)) {
      return 'LLM voice synthesis runs on this server using a local model ' +
        '(SherpaTTS). No text or audio data is sent to any third-party ' +
        'service. Your words stay within this app\'s infrastructure.';
    } else {
      return 'This voice provider sends your text to a third-party cloud API ' +
        'to generate speech audio. By consenting, you acknowledge that your ' +
        'text will be transmitted to an external service and processed ' +
        'according to that service\'s privacy policy.';
    }
  },

  /**
   * Resolve the best available provider for the user, falling back to
   * SherpaTTS (local) when the preferred cloud provider is not consented to.
   *
   * @param {Object} userPreferences - The user's preferences object
   * @param {string} [userPreferences.llm_voice_provider_preference] - Preferred provider
   * @returns {{provider: LLMVoiceProvider, id: string}} The resolved provider and its id
   */
  resolveProvider: function(userPreferences) {
    var prefs = userPreferences || {};
    var preferred = prefs.llm_voice_provider_preference || 'sherpa';

    if (this.allowed(preferred, prefs)) {
      var provider = llmVoiceProviders.getProvider(preferred);
      if (provider && provider.isAvailable()) {
        return { provider: provider, id: preferred };
      }
    }

    // Fall back to sherpa if consented and available
    if (this.allowed('sherpa', prefs)) {
      var sherpa = llmVoiceProviders.getProvider('sherpa');
      if (sherpa && sherpa.isAvailable()) {
        return { provider: sherpa, id: 'sherpa' };
      }
    }

    return { provider: null, id: null };
  },

  /**
   * Synthesize speech, respecting the consent gate. If the user's preferred
   * provider is not consented to, falls back to SherpaTTS. Rejects with a
   * descriptive error when no consented provider is available.
   *
   * @param {string} text - Text to speak
   * @param {string} voiceId - Voice identifier
   * @param {Object} userPreferences - User preferences for consent checking
   * @param {Object} [opts] - Synthesis options
   * @returns {Promise<string>} Audio URL or data-URI
   */
  synthesizeWithConsent: function(text, voiceId, userPreferences, opts) {
    var resolved = this.resolveProvider(userPreferences);
    if (!resolved.provider) {
      var prefId = (userPreferences || {}).llm_voice_provider_preference || 'sherpa';
      if (!this.allowed(prefId, userPreferences)) {
        return Promise.reject(new Error(
          'LLM voice consent not granted. Please grant consent in user preferences.'
        ));
      }
      return Promise.reject(new Error(
        'No LLM voice provider available. Consent may be required or providers are unavailable.'
      ));
    }
    return resolved.provider.synthesize(text, voiceId, opts);
  }
};

// Register the built-in providers
llmVoiceProviders.register('sherpa', new SherpaTTSProvider(), true);

// OpenAI is registered lazily — call llmVoiceProviders.register('openai', ...)
// with the backend URL when the user opts in. The API key is kept server-side
// and never reaches the browser.

export { LLMVoiceProvider, SherpaTTSProvider, OpenAITTSProvider, llmVoiceProviders, llmVoiceConsentGate };
export default llmVoiceProviders;
