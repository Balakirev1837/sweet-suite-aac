import {
  describe,
  it,
  expect
} from 'frontend/tests/helpers/jasmine';
import voices from '../../utils/tts_voices';

describe('tts_voices LLM voice registry', function() {

  // -------------------------------------------------------------------------
  // SherpaTTS voices
  // -------------------------------------------------------------------------

  describe('SherpaTTS voices', function() {

    it('should include sherpa:ryan as an adult male English voice', function() {
      var voice = voices.find_voice('sherpa:ryan');
      expect(voice).toBeDefined();
      expect(voice).not.toBeNull();
      expect(voice.voice_id).toEqual('sherpa:ryan');
      expect(voice.name).toEqual('Ryan');
      expect(voice.locale).toEqual('en-US');
      expect(voice.gender).toEqual('m');
      expect(voice.age).toEqual('adult');
      expect(voice.provider).toEqual('SherpaTTS');
      expect(voice.llm).toEqual(true);
      expect(voice.requires_internet).toEqual(false);
    });

    it('should include sherpa:vivian as an adult female English voice', function() {
      var voice = voices.find_voice('sherpa:vivian');
      expect(voice).toBeDefined();
      expect(voice).not.toBeNull();
      expect(voice.voice_id).toEqual('sherpa:vivian');
      expect(voice.gender).toEqual('f');
      expect(voice.provider).toEqual('SherpaTTS');
      expect(voice.requires_internet).toEqual(false);
    });

    it('should include gender-neutral SherpaTTS voice (sherpa:quinn)', function() {
      var voice = voices.find_voice('sherpa:quinn');
      expect(voice).toBeDefined();
      expect(voice).not.toBeNull();
      expect(voice.gender).toEqual('neutral');
      expect(voice.requires_internet).toEqual(false);
    });

    it('should include child SherpaTTS voices for English', function() {
      var alex = voices.find_voice('sherpa:alex_child');
      expect(alex).toBeDefined();
      expect(alex).not.toBeNull();
      expect(alex.age).toEqual('child');
      expect(alex.gender).toEqual('m');

      var ellie = voices.find_voice('sherpa:ellie_child');
      expect(ellie).toBeDefined();
      expect(ellie).not.toBeNull();
      expect(ellie.age).toEqual('child');
      expect(ellie.gender).toEqual('f');

      var jordan = voices.find_voice('sherpa:jordan_child');
      expect(jordan).toBeDefined();
      expect(jordan).not.toBeNull();
      expect(jordan.age).toEqual('child');
      expect(jordan.gender).toEqual('neutral');
    });

    it('should include SherpaTTS voices across all 10 Qwen3 languages', function() {
      var expectedLocales = [
        'en-US', 'zh-CN', 'ja-JP', 'ko-KR', 'fr-FR',
        'de-DE', 'es-ES', 'pt-BR', 'it-IT', 'ru-RU'
      ];
      var allVoices = voices.get('voices');
      var sherpaVoices = allVoices.filter(function(v) {
        return v.voice_id && v.voice_id.indexOf('sherpa:') === 0;
      });

      var foundLocales = {};
      sherpaVoices.forEach(function(v) {
        foundLocales[v.locale] = true;
      });

      expectedLocales.forEach(function(locale) {
        expect(foundLocales[locale]).toEqual(true,
          'Expected SherpaTTS voice for locale ' + locale + ' but none found');
      });
    });

    it('should mark all SherpaTTS voices as not requiring internet', function() {
      var allVoices = voices.get('voices');
      var sherpaVoices = allVoices.filter(function(v) {
        return v.voice_id && v.voice_id.indexOf('sherpa:') === 0;
      });

      expect(sherpaVoices.length).toBeGreaterThan(0);

      sherpaVoices.forEach(function(v) {
        expect(v.requires_internet).toEqual(false);
        expect(v.provider).toEqual('SherpaTTS');
        expect(v.llm).toEqual(true);
        expect(v.voice_url).toEqual('llm:local');
      });
    });

    it('should include Chinese SherpaTTS voices', function() {
      var chen = voices.find_voice('sherpa:chen');
      expect(chen).toBeDefined();
      expect(chen).not.toBeNull();
      expect(chen.locale).toEqual('zh-CN');

      var mei = voices.find_voice('sherpa:mei');
      expect(mei).toBeDefined();
      expect(mei).not.toBeNull();
      expect(mei.locale).toEqual('zh-CN');
    });

    it('should include a gender-neutral child voice in French', function() {
      var camille = voices.find_voice('sherpa:camille_child');
      expect(camille).toBeDefined();
      expect(camille).not.toBeNull();
      expect(camille.locale).toEqual('fr-FR');
      expect(camille.gender).toEqual('neutral');
      expect(camille.age).toEqual('child');
    });
  });

  // -------------------------------------------------------------------------
  // OpenAI voices
  // -------------------------------------------------------------------------

  describe('OpenAI voices', function() {

    it('should include llm:openai:nova as an adult female voice', function() {
      var voice = voices.find_voice('llm:openai:nova');
      expect(voice).toBeDefined();
      expect(voice).not.toBeNull();
      expect(voice.voice_id).toEqual('llm:openai:nova');
      expect(voice.name).toEqual('Nova');
      expect(voice.locale).toEqual('multi');
      expect(voice.gender).toEqual('f');
      expect(voice.age).toEqual('adult');
      expect(voice.provider).toEqual('OpenAI');
      expect(voice.llm).toEqual(true);
      expect(voice.requires_internet).toEqual(true);
    });

    it('should include llm:openai:echo as an adult male voice', function() {
      var voice = voices.find_voice('llm:openai:echo');
      expect(voice).toBeDefined();
      expect(voice).not.toBeNull();
      expect(voice.gender).toEqual('m');
    });

    it('should include gender-neutral OpenAI voices', function() {
      var neutralIds = [
        'llm:openai:alloy', 'llm:openai:ash', 'llm:openai:ballad',
        'llm:openai:coral', 'llm:openai:fable', 'llm:openai:sage'
      ];
      neutralIds.forEach(function(id) {
        var voice = voices.find_voice(id);
        expect(voice).toBeDefined();
        expect(voice).not.toBeNull();
        expect(voice.gender).toEqual('neutral',
          'Expected ' + id + ' to be gender-neutral');
      });
    });

    it('should mark all OpenAI voices as requiring internet', function() {
      var allVoices = voices.get('voices');
      var openaiVoices = allVoices.filter(function(v) {
        return v.voice_id && v.voice_id.indexOf('llm:openai:') === 0;
      });

      expect(openaiVoices.length).toBeGreaterThan(0);

      openaiVoices.forEach(function(v) {
        expect(v.requires_internet).toEqual(true);
        expect(v.provider).toEqual('OpenAI');
        expect(v.llm).toEqual(true);
        expect(v.voice_url).toEqual('llm:cloud');
      });
    });

    it('should include all 10 OpenAI TTS voices', function() {
      var expectedIds = [
        'llm:openai:alloy', 'llm:openai:ash', 'llm:openai:ballad',
        'llm:openai:coral', 'llm:openai:echo', 'llm:openai:fable',
        'llm:openai:onyx', 'llm:openai:nova', 'llm:openai:sage',
        'llm:openai:shimmer'
      ];
      expectedIds.forEach(function(id) {
        var voice = voices.find_voice(id);
        expect(voice).toBeDefined();
        expect(voice).not.toBeNull();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Cross-cutting requirements
  // -------------------------------------------------------------------------

  describe('OpenAAC requirements', function() {

    it('should include child/youth voice options across LLM voices', function() {
      var allVoices = voices.get('voices');
      var llmChildVoices = allVoices.filter(function(v) {
        return v.llm && v.age === 'child';
      });
      expect(llmChildVoices.length).toBeGreaterThan(0);
      llmChildVoices.forEach(function(v) {
        expect(v.age).toEqual('child');
      });
    });

    it('should include gender-neutral voice options across LLM voices', function() {
      var allVoices = voices.get('voices');
      var neutralVoices = allVoices.filter(function(v) {
        return v.llm && v.gender === 'neutral';
      });
      expect(neutralVoices.length).toBeGreaterThan(0);
    });

    it('should not break existing acapela voice lookups', function() {
      var ella = voices.find_voice('acap:Ella');
      expect(ella).toBeDefined();
      expect(ella).not.toBeNull();
      expect(ella.name).toEqual('Ella');
      expect(ella.locale).toEqual('en-US');
    });
  });
});
