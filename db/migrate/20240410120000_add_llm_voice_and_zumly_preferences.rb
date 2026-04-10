class AddLlmVoiceAndZumlyPreferences < ActiveRecord::Migration[5.0]
  # Migrates user settings to include LLM voice and Zumly preference defaults.
  # Uses the existing User.settings serialized hash pattern — no raw columns added.
  #
  # New preference keys added to settings['preferences']:
  #   llm_voice_consent               (boolean, default false)
  #   llm_voice_provider_preference   (string,  default 'sherpa')
  #   scanning_voice_id               (string,  default nil / nullable)
  #   zumly_enabled                   (boolean, default false)
  #   zumly_max_depth                 (integer, default 3)
  #   llm_voice_usage_count           (integer, default 0)
  #   llm_voice_usage_reset_at        (integer, default nil / nullable epoch)
  def up
    User.find_each(batch_size: 50) do |user|
      user.settings ||= {}
      user.settings['preferences'] ||= {}

      prefs = user.settings['preferences']

      prefs['llm_voice_consent'] = false if prefs['llm_voice_consent'].nil?
      prefs['llm_voice_provider_preference'] ||= 'sherpa'
      # scanning_voice_id stays nil (nullable) — no explicit default needed
      prefs['zumly_enabled'] = false if prefs['zumly_enabled'].nil?
      prefs['zumly_max_depth'] = 3 if prefs['zumly_max_depth'].nil?
      prefs['llm_voice_usage_count'] = 0 if prefs['llm_voice_usage_count'].nil?
      # llm_voice_usage_reset_at stays nil (nullable) — no explicit default needed

      user.save(validate: false)
    end
  end

  def down
    User.find_each(batch_size: 50) do |user|
      next unless user.settings && user.settings['preferences']

      prefs = user.settings['preferences']
      %w[
        llm_voice_consent
        llm_voice_provider_preference
        scanning_voice_id
        zumly_enabled
        zumly_max_depth
        llm_voice_usage_count
        llm_voice_usage_reset_at
      ].each { |key| prefs.delete(key) }

      user.save(validate: false)
    end
  end
end
