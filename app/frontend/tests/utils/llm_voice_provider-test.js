import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  stub
} from 'frontend/tests/helpers/jasmine';
import {
  LLMVoiceProvider,
  SherpaTTSProvider,
  OpenAITTSProvider,
  llmVoiceProviders,
  llmVoiceConsentGate
} from '../../utils/llm_voice_provider';


describe('LLMVoiceProvider', function() {

  describe('abstract base class', function() {
    it('should throw on isAvailable', function() {
      var base = new LLMVoiceProvider();
      expect(function() { base.isAvailable(); }).toThrow();
    });

    it('should throw on listVoices', function() {
      var base = new LLMVoiceProvider();
      expect(function() { base.listVoices(); }).toThrow();
    });

    it('should throw on synthesize', function() {
      var base = new LLMVoiceProvider();
      expect(function() { base.synthesize('hello', 'v1'); }).toThrow();
    });
  });

  // -------------------------------------------------------------------------

  describe('SherpaTTSProvider', function() {
    var provider;
    var originalSherpa;

    beforeEach(function() {
      originalSherpa = window.sherpa_tts;
      provider = new SherpaTTSProvider();
    });

    afterEach(function() {
      window.sherpa_tts = originalSherpa;
    });

    it('should report unavailable when window.sherpa_tts is missing', function() {
      delete window.sherpa_tts;
      expect(provider.isAvailable()).toEqual(false);
    });

    it('should report unavailable when window.sherpa_tts.isReady returns false', function() {
      window.sherpa_tts = { isReady: function() { return false; } };
      expect(provider.isAvailable()).toEqual(false);
    });

    it('should report available when sherpa_tts is ready', function() {
      window.sherpa_tts = { isReady: function() { return true; } };
      expect(provider.isAvailable()).toEqual(true);
    });

    it('should return empty voices when unavailable', function() {
      delete window.sherpa_tts;
      provider.listVoices().then(function(voices) {
        expect(voices.length).toEqual(0);
      });
    });

    it('should list voices and cache them', function(done) {
      var fakeVoices = [
        { id: 'qwen-en-1', name: 'Qwen English', locale: 'en-US', gender: 'f', age: 'adult', preview_url: '' },
        { id: 'qwen-es-1', name: 'Qwen Spanish', locale: 'es-ES', gender: 'm', age: 'adult', preview_url: '' }
      ];
      window.sherpa_tts = {
        isReady: function() { return true; },
        listVoices: function(success) { success(fakeVoices); }
      };
      provider.listVoices().then(function(voices) {
        expect(voices.length).toEqual(2);
        expect(voices[0].id).toEqual('qwen-en-1');
        // Second call should use cache (no listVoices call)
        provider._voicesCache = null; // reset to test fresh path
        done();
      });
    });

    it('should filter voices by locale', function(done) {
      var fakeVoices = [
        { id: 'qwen-en-1', name: 'Qwen English', locale: 'en-US', gender: 'f', age: 'adult', preview_url: '' },
        { id: 'qwen-es-1', name: 'Qwen Spanish', locale: 'es-ES', gender: 'm', age: 'adult', preview_url: '' },
        { id: 'qwen-en-2', name: 'Qwen English Male', locale: 'en-GB', gender: 'm', age: 'adult', preview_url: '' }
      ];
      window.sherpa_tts = {
        isReady: function() { return true; },
        listVoices: function(success) { success(fakeVoices); }
      };
      provider.listVoices('en-US').then(function(voices) {
        expect(voices.length).toEqual(2);
        done();
      });
    });

    it('should reject synthesize when unavailable', function(done) {
      delete window.sherpa_tts;
      provider.synthesize('hello', 'v1').then(function() {
        expect(true).toEqual(false); // should not resolve
      }, function(err) {
        expect(err.message).toContain('not available');
        done();
      });
    });

    it('should synthesize audio when available', function(done) {
      window.sherpa_tts = {
        isReady: function() { return true; },
        synthesize: function(params, success) {
          success('data:audio/mp3;base64,AAAA');
        }
      };
      provider.synthesize('hello world', 'qwen-en-1', { rate: 1.2 }).then(function(url) {
        expect(url).toEqual('data:audio/mp3;base64,AAAA');
        done();
      });
    });

    it('should reject synthesize on sherpa error', function(done) {
      window.sherpa_tts = {
        isReady: function() { return true; },
        synthesize: function(params, success, error) {
          error(new Error('engine crashed'));
        }
      };
      provider.synthesize('hello', 'v1').then(function() {
        expect(true).toEqual(false);
      }, function(err) {
        expect(err.message).toEqual('engine crashed');
        done();
      });
    });
  });

  // -------------------------------------------------------------------------

  describe('OpenAITTSProvider', function() {
    it('should not require an apiKey in config', function() {
      // Should not throw — the provider no longer requires an API key
      expect(function() { new OpenAITTSProvider(); }).not.toThrow();
      expect(function() { new OpenAITTSProvider({}); }).not.toThrow();
    });

    it('should accept a backendUrl in config', function() {
      var p = new OpenAITTSProvider({ backendUrl: 'http://localhost:5003' });
      expect(p.backendUrl).toEqual('http://localhost:5003');
    });

    it('should default backendUrl to window.location.origin when not provided', function() {
      var p = new OpenAITTSProvider();
      expect(typeof p.backendUrl).toEqual('string');
    });

    it('should not expose any apiKey property', function() {
      var p = new OpenAITTSProvider({ backendUrl: 'http://localhost:5003' });
      expect(p.apiKey).toBeUndefined();
    });

    it('should report available when online and backendUrl is set', function() {
      var p = new OpenAITTSProvider({ backendUrl: 'http://localhost:5003' });
      // navigator.onLine may be true or false in test env
      expect(typeof p.isAvailable()).toEqual('boolean');
    });

    it('should list built-in voices', function(done) {
      var p = new OpenAITTSProvider({ backendUrl: 'http://localhost:5003' });
      p.listVoices().then(function(voices) {
        expect(voices.length).toBeGreaterThan(0);
        expect(voices[0].id).toEqual('alloy');
        expect(voices[0].locale).toEqual('multi');
        done();
      });
    });
  });

  // -------------------------------------------------------------------------

  describe('provider registry', function() {
    var originalProviders;

    beforeEach(function() {
      // Snapshot and clear so each test starts clean
      originalProviders = llmVoiceProviders._providers;
      originalDefault = llmVoiceProviders._defaultProvider;
      llmVoiceProviders._providers = {};
      llmVoiceProviders._defaultProvider = null;
    });

    afterEach(function() {
      llmVoiceProviders._providers = originalProviders;
      llmVoiceProviders._defaultProvider = originalDefault;
    });

    var originalDefault;

    it('should register and retrieve a provider', function() {
      var fake = new SherpaTTSProvider();
      llmVoiceProviders.register('test', fake);
      expect(llmVoiceProviders.getProvider('test')).toBe(fake);
    });

    it('should set default on register with flag', function() {
      var fake = new SherpaTTSProvider();
      llmVoiceProviders.register('myDefault', fake, true);
      expect(llmVoiceProviders._defaultProvider).toEqual('myDefault');
      expect(llmVoiceProviders.getDefaultProvider()).toBe(fake);
    });

    it('should unregister a provider', function() {
      var fake = new SherpaTTSProvider();
      llmVoiceProviders.register('gone', fake);
      llmVoiceProviders.register('keep', fake);
      llmVoiceProviders.unregister('gone');
      expect(llmVoiceProviders.getProvider('gone')).toBeUndefined();
      expect(llmVoiceProviders.getProvider('keep')).toBe(fake);
    });

    it('should fallback default when unregistered', function() {
      var fake = new SherpaTTSProvider();
      llmVoiceProviders.register('first', fake, true);
      llmVoiceProviders.register('second', fake);
      llmVoiceProviders.unregister('first');
      expect(llmVoiceProviders._defaultProvider).toEqual('second');
    });

    it('should throw on setDefaultProvider with unknown id', function() {
      expect(function() {
        llmVoiceProviders.setDefaultProvider('nonexistent');
      }).toThrow();
    });

    it('should list provider ids', function() {
      var fake = new SherpaTTSProvider();
      llmVoiceProviders.register('alpha', fake);
      llmVoiceProviders.register('beta', fake);
      var ids = llmVoiceProviders.listProviderIds();
      expect(ids).toContain('alpha');
      expect(ids).toContain('beta');
    });
  });

  // -------------------------------------------------------------------------

  describe('default registration', function() {
    it('should have sherpa registered as default', function() {
      // This tests the module-level registration that happens on import
      expect(llmVoiceProviders.getDefaultProvider()).toBeDefined();
      expect(llmVoiceProviders._defaultProvider).toEqual('sherpa');
    });

    it('should have a SherpaTTSProvider as the default', function() {
      var p = llmVoiceProviders.getDefaultProvider();
      expect(p instanceof SherpaTTSProvider).toEqual(true);
    });
  });

  // -------------------------------------------------------------------------

  describe('llmVoiceConsentGate', function() {
    describe('isLocalProvider', function() {
      it('should identify sherpa as local', function() {
        expect(llmVoiceConsentGate.isLocalProvider('sherpa')).toEqual(true);
      });

      it('should not identify openai as local', function() {
        expect(llmVoiceConsentGate.isLocalProvider('openai')).toEqual(false);
      });

      it('should not identify unknown providers as local', function() {
        expect(llmVoiceConsentGate.isLocalProvider('unknown')).toEqual(false);
      });
    });

    describe('allowed', function() {
      it('should block when no consent is set', function() {
        expect(llmVoiceConsentGate.allowed('sherpa', {})).toEqual(false);
      });

      it('should block when consent is false', function() {
        expect(llmVoiceConsentGate.allowed('sherpa', { llm_voice_consent: false })).toEqual(false);
      });

      it('should allow local provider with base consent only', function() {
        expect(llmVoiceConsentGate.allowed('sherpa', { llm_voice_consent: true })).toEqual(true);
      });

      it('should allow cloud provider with consent and no supervisors', function() {
        expect(llmVoiceConsentGate.allowed('openai', { llm_voice_consent: true })).toEqual(true);
      });

      it('should block cloud provider for supervised user without supervisor consent', function() {
        var prefs = {
          llm_voice_consent: true,
          supervisor_user_ids: ['sup_1'],
          supervisor_llm_voice_consent: false
        };
        expect(llmVoiceConsentGate.allowed('openai', prefs)).toEqual(false);
      });

      it('should allow cloud provider for supervised user with supervisor consent', function() {
        var prefs = {
          llm_voice_consent: true,
          supervisor_user_ids: ['sup_1'],
          supervisor_llm_voice_consent: true
        };
        expect(llmVoiceConsentGate.allowed('openai', prefs)).toEqual(true);
      });

      it('should allow local provider for supervised user without supervisor consent', function() {
        var prefs = {
          llm_voice_consent: true,
          supervisor_user_ids: ['sup_1'],
          supervisor_llm_voice_consent: false
        };
        expect(llmVoiceConsentGate.allowed('sherpa', prefs)).toEqual(true);
      });

      it('should allow cloud provider for non-supervised user', function() {
        var prefs = {
          llm_voice_consent: true
        };
        expect(llmVoiceConsentGate.allowed('openai', prefs)).toEqual(true);
      });
    });

    describe('consentExplanation', function() {
      it('should mention local/no third-party for sherpa', function() {
        var text = llmVoiceConsentGate.consentExplanation('sherpa');
        expect(text.match(/local/i)).toBeDefined();
        expect(text.match(/third-party/)).toBeFalsy();
      });

      it('should mention third-party for openai', function() {
        var text = llmVoiceConsentGate.consentExplanation('openai');
        expect(text.match(/third-party/)).toBeDefined();
      });
    });

    describe('resolveProvider', function() {
      var originalProviders;
      var originalDefault;

      beforeEach(function() {
        originalProviders = llmVoiceProviders._providers;
        originalDefault = llmVoiceProviders._defaultProvider;
        var fakeProvider = new SherpaTTSProvider();
        llmVoiceProviders._providers = { sherpa: fakeProvider };
        llmVoiceProviders._defaultProvider = 'sherpa';
      });

      afterEach(function() {
        llmVoiceProviders._providers = originalProviders;
        llmVoiceProviders._defaultProvider = originalDefault;
      });

      it('should resolve preferred provider when consented', function() {
        var prefs = { llm_voice_consent: true, llm_voice_provider_preference: 'sherpa' };
        var result = llmVoiceConsentGate.resolveProvider(prefs);
        expect(result.id).toEqual('sherpa');
        expect(result.provider).toBeDefined();
      });

      it('should fall back to sherpa when preferred cloud provider not consented', function() {
        // Register a fake openai provider
        var fakeOpenai = new SherpaTTSProvider(); // reuse for testing
        llmVoiceProviders._providers['openai'] = fakeOpenai;

        var prefs = {
          llm_voice_consent: true,
          llm_voice_provider_preference: 'openai',
          supervisor_user_ids: ['sup_1'],
          supervisor_llm_voice_consent: false
        };
        var result = llmVoiceConsentGate.resolveProvider(prefs);
        // Should fall back to sherpa since openai is blocked
        expect(result.id).toEqual('sherpa');
      });

      it('should return null provider when no consent at all', function() {
        var prefs = { llm_voice_consent: false };
        var result = llmVoiceConsentGate.resolveProvider(prefs);
        expect(result.provider).toBeNull();
        expect(result.id).toBeNull();
      });
    });

    describe('synthesizeWithConsent', function() {
      var originalProviders;
      var originalDefault;
      var originalSherpa;

      beforeEach(function() {
        originalProviders = llmVoiceProviders._providers;
        originalDefault = llmVoiceProviders._defaultProvider;
        originalSherpa = window.sherpa_tts;

        // Set up a fake sherpa provider that's available
        window.sherpa_tts = {
          isReady: function() { return true; },
          synthesize: function(params, success) {
            success('data:audio/mp3;base64,FAKE');
          }
        };
        var fakeProvider = new SherpaTTSProvider();
        llmVoiceProviders._providers = { sherpa: fakeProvider };
        llmVoiceProviders._defaultProvider = 'sherpa';
      });

      afterEach(function() {
        llmVoiceProviders._providers = originalProviders;
        llmVoiceProviders._defaultProvider = originalDefault;
        window.sherpa_tts = originalSherpa;
      });

      it('should reject with consent error when no consent', function(done) {
        llmVoiceConsentGate.synthesizeWithConsent('hello', 'v1', {}).then(function() {
          expect(true).toEqual(false);
        }, function(err) {
          expect(err.message.match(/consent/i)).toBeDefined();
          done();
        });
      });

      it('should synthesize with consent granted', function(done) {
        var prefs = { llm_voice_consent: true };
        llmVoiceConsentGate.synthesizeWithConsent('hello', 'v1', prefs).then(function(url) {
          expect(url).toEqual('data:audio/mp3;base64,FAKE');
          done();
        });
      });
    });
  });
});
