import { helper } from '@ember/component/helper';

/**
 * Looks up the configured voice ID for a given language code
 * from the user's LLM voice language map.
 *
 * Usage in templates:
 *   {{get-lang-voice "en" pending_preferences.llm_voice_language_map}}
 *
 * @param {string[]} params - [langCode, languageMap]
 * @returns {string|null} The voice ID configured for that language, or null
 */
export default helper(function(params) {
  var langCode = params[0];
  var languageMap = params[1];
  if (!langCode || !languageMap) { return null; }
  var code = langCode.split(/[-_]/)[0].toLowerCase();
  return languageMap[code] || null;
});
