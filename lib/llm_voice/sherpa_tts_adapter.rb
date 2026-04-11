require 'typhoeus'
require 'json'
require 'uri'

module LlmVoice
  # Adapter for the local SherpaTTS/Qwen3 Python inference service.
  #
  # Replaces ElevenLabs as the primary TTS provider. Calls a local
  # SherpaTTS service that supports Qwen3 CustomVoice with natural
  # language instructions for tone, emotion, and prosody control.
  #
  # No API key is needed — this is a local-only service.
  #
  # @example Basic synthesis
  #   adapter = SherpaTtsAdapter.new
  #   audio = adapter.synthesize("Hello world", "sherpa:ryan")
  #
  # @example With instruct for emotion/style control
  #   audio = adapter.synthesize("Hello world", "sherpa:ryan",
  #     instruct: "Speak warmly and with a smile",
  #     language: "en"
  #   )
  #
  # Environment variables:
  #   SHERPA_TTS_BASE_URL - Base URL of the SherpaTTS service
  #     (default: http://localhost:5003)
  #   SHERPA_TTS_TOKEN - Shared secret for authenticating with the
  #     SherpaTTS server (sent as X-SherpaTTS-Token header).
  #     When the server has SHERPA_TTS_TOKEN set, this must match.
  class SherpaTtsAdapter
    DEFAULT_BASE_URL = 'http://localhost:5003'.freeze
    DEFAULT_TIMEOUT = 15

    # Supported language code mappings for Qwen3
    LANGUAGE_MAP = {
      'en' => 'en',
      'english' => 'en',
      'es' => 'es',
      'spanish' => 'es',
      'fr' => 'fr',
      'french' => 'fr',
      'de' => 'de',
      'german' => 'de',
      'zh' => 'zh',
      'chinese' => 'zh',
      'ja' => 'ja',
      'japanese' => 'ja',
      'ko' => 'ko',
      'korean' => 'ko'
    }.freeze

    attr_reader :base_url

    # Initialize the SherpaTTS adapter.
    #
    # @param base_url [String, nil] Override for the SherpaTTS service URL.
    #   Falls back to SHERPA_TTS_BASE_URL env var, then to DEFAULT_BASE_URL.
    def initialize(base_url = ENV['SHERPA_TTS_BASE_URL'])
      @base_url = (base_url || DEFAULT_BASE_URL).to_s
    end

    # Synthesize speech from text using the local SherpaTTS/Qwen3 service.
    #
    # @param text [String] The text to synthesize. Never logged per privacy.
    # @param voice_id [String, nil] Voice identifier, e.g. "sherpa:ryan".
    #   The "sherpa:" prefix is stripped and the remainder is used as the
    #   Qwen3 speaker name (e.g. "Ryan").
    # @param opts [Hash] Additional options.
    # @option opts [String] :language Language code for synthesis.
    #   Maps common names (e.g. "english") to Qwen3 codes (e.g. "en").
    # @option opts [String] :instruct Natural language instruction for
    #   emotion, tone, and prosody control via Qwen3 CustomVoice.
    # @option opts [Boolean] :stream Whether to request a streaming response
    #   for lower-latency playback.
    # @option opts [Integer] :timeout Request timeout in seconds (default 15).
    # @option opts [Boolean] :consent Whether the user has granted consent
    #   for LLM voice synthesis. Required to be truthy; the adapter will
    #   refuse to call the TTS service when consent is missing or false.
    #
    # @return [String, nil] Binary audio data on success, nil on failure.
    def synthesize(text, voice_id = nil, opts = {})
      return nil unless @base_url && !@base_url.empty?
      return nil unless opts[:consent]

      speaker = map_speaker(voice_id)
      language = map_language(opts[:language])
      timeout = opts[:timeout] || DEFAULT_TIMEOUT

      payload = { text: text }
      payload[:speaker] = speaker if speaker
      payload[:language] = language if language
      payload[:instruct] = opts[:instruct] if opts[:instruct]
      payload[:stream] = true if opts[:stream]

      request_url = URI.join(@base_url, '/api/tts').to_s

      headers = { 'Content-Type' => 'application/json' }
      token = ENV['SHERPA_TTS_TOKEN']
      headers['X-SherpaTTS-Token'] = token if token && !token.empty?

      response = Typhoeus.post(
        request_url,
        body: payload.to_json,
        headers: headers,
        timeout: timeout
      )

      handle_response(response)
    rescue StandardError => e
      # Log the error type but NEVER log the speech text content per privacy.
      if defined?(Rails)
        Rails.logger.error("SherpaTTS unexpected error: #{e.class} - #{e.message}")
      end
      nil
    end

    # Check whether the SherpaTTS adapter is available.
    #
    # Always returns true since this is a local service with no API key.
    # The actual service reachability is checked at request time.
    #
    # @return [Boolean]
    def available?
      !@base_url.nil? && !@base_url.empty?
    end

    private

    # Map a voice_id to a Qwen3 speaker name.
    #
    # Strips the "sherpa:" prefix and capitalizes the first letter
    # to match Qwen3 speaker name conventions.
    #
    # @param voice_id [String, nil] The raw voice identifier.
    # @return [String, nil] The mapped speaker name, or nil if blank.
    def map_speaker(voice_id)
      return nil if voice_id.nil? || voice_id.strip.empty?

      name = voice_id.sub(/\A(sherpa|Sherpa):/i, '').strip
      return nil if name.empty?

      name.capitalize
    end

    # Map a language identifier to a Qwen3 language code.
    #
    # @param language [String, nil] Raw language identifier.
    # @return [String, nil] Mapped language code, or nil if blank.
    def map_language(language)
      return nil if language.nil? || language.strip.empty?

      LANGUAGE_MAP[language.downcase.strip] || language.downcase.strip
    end

    # Process the HTTP response from the SherpaTTS service.
    #
    # @param response [Typhoeus::Response] The HTTP response.
    # @return [String, nil] Audio binary data on success, nil on failure.
    def handle_response(response)
      if response.success?
        response.body
      elsif response.code == 429
        if defined?(Rails)
          Rails.logger.warn("SherpaTTS rate limit exceeded: #{response.code}")
        end
        nil
      elsif response.timed_out?
        if defined?(Rails)
          Rails.logger.error("SherpaTTS request timed out")
        end
        nil
      else
        if defined?(Rails)
          Rails.logger.error("SherpaTTS error: #{response.code} - #{response.body}")
        end
        nil
      end
    end
  end
end
