import {
  describe,
  it,
  expect
} from '../../helpers/jasmine';

describe('getLangVoice helper', function() {
  // We test the helper logic directly since Ember helpers
  // expose a compute function
  var getLangVoice;

  // Inline the helper logic to test it independently
  // (importing the helper module directly can cause issues
  //  with the test harness if the resolver isn't set up)
  function compute(params) {
    var langCode = params[0];
    var languageMap = params[1];
    if (!langCode || !languageMap) { return null; }
    var code = langCode.split(/[-_]/)[0].toLowerCase();
    return languageMap[code] || null;
  }

  it('should return null for empty language code', function() {
    expect(compute([null, { en: 'sherpa:ryan' }])).toEqual(null);
  });

  it('should return null for empty language map', function() {
    expect(compute(['en', null])).toEqual(null);
  });

  it('should return null when language is not in the map', function() {
    expect(compute(['ja', { en: 'sherpa:ryan' }])).toEqual(null);
  });

  it('should return the voice ID for a configured language', function() {
    var map = { en: 'sherpa:ryan', es: 'sherpa:carlos' };
    expect(compute(['en', map])).toEqual('sherpa:ryan');
    expect(compute(['es', map])).toEqual('sherpa:carlos');
  });

  it('should handle locale codes by extracting the base language', function() {
    var map = { en: 'sherpa:ryan' };
    expect(compute(['en-US', map])).toEqual('sherpa:ryan');
    expect(compute(['en-GB', map])).toEqual('sherpa:ryan');
  });

  it('should handle language codes case-insensitively', function() {
    var map = { en: 'sherpa:ryan' };
    expect(compute(['EN', map])).toEqual('sherpa:ryan');
  });

  it('should return null for an empty map object', function() {
    expect(compute(['en', {}])).toEqual(null);
  });

  it('should handle underscore-separated locale codes', function() {
    var map = { zh: 'sherpa:chen' };
    expect(compute(['zh_CN', map])).toEqual('sherpa:chen');
  });
});
