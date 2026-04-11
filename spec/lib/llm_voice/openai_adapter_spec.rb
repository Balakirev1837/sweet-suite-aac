require 'spec_helper'
require 'llm_voice/openai_adapter'

module LlmVoice
  describe OpenaiAdapter do
    let(:fake_api_key) { 'sk-test-fake-key-12345' }
    let(:fake_audio) { 'fake-mp3-binary-data' }

    # ------------------------------------------------------------------
    # Initialization
    # ------------------------------------------------------------------

    describe '#initialize' do
      it 'uses the provided API key' do
        adapter = described_class.new('my-key')
        expect(adapter.api_key).to eq('my-key')
      end

      it 'falls back to OPENAI_API_KEY env variable when no argument given' do
        original = ENV['OPENAI_API_KEY']
        ENV['OPENAI_API_KEY'] = 'env-key-abc'
        adapter = described_class.new
        expect(adapter.api_key).to eq('env-key-abc')
        ENV['OPENAI_API_KEY'] = original
      end

      it 'sets api_key to nil when nothing is provided and env var is unset' do
        original = ENV['OPENAI_API_KEY']
        ENV['OPENAI_API_KEY'] = nil
        adapter = described_class.new
        expect(adapter.api_key).to be_nil
        ENV['OPENAI_API_KEY'] = original
      end
    end

    # ------------------------------------------------------------------
    # #available?
    # ------------------------------------------------------------------

    describe '#available?' do
      it 'returns true when API key is present' do
        adapter = described_class.new('sk-real-key')
        expect(adapter).to be_available
      end

      it 'returns false when API key is nil' do
        adapter = described_class.new(nil)
        expect(adapter).not_to be_available
      end
    end

    # ------------------------------------------------------------------
    # #synthesize
    # ------------------------------------------------------------------

    describe '#synthesize' do
      let(:adapter) { described_class.new(fake_api_key) }

      # ----------------------------------------------------------------
      # Early return when no API key
      # ----------------------------------------------------------------

      it 'returns nil when API key is nil' do
        no_key_adapter = described_class.new(nil)
        result = no_key_adapter.synthesize('Hello world', 'alloy')
        expect(result).to be_nil
      end

      # ----------------------------------------------------------------
      # Successful synthesis
      # ----------------------------------------------------------------

      it 'returns audio binary data on successful response' do
        fake_response = double('response', success?: true, body: fake_audio,
                                     code: 200, timed_out?: false)
        allow(Typhoeus).to receive(:post).and_return(fake_response)

        result = adapter.synthesize('Hello world', 'alloy')
        expect(result).to eq(fake_audio)
      end

      # ----------------------------------------------------------------
      # Request formatting
      # ----------------------------------------------------------------

      it 'POSTs to the OpenAI speech endpoint with correct payload' do
        fake_response = double('response', success?: true, body: fake_audio,
                                     code: 200, timed_out?: false)
        allow(Typhoeus).to receive(:post).with(
          'https://api.openai.com/v1/audio/speech',
          hash_including(
            body: hash_including(
              model: 'tts-1',
              input: 'Hello world',
              voice: 'alloy',
              response_format: 'mp3'
            ),
            timeout: 10
          )
        ).and_return(fake_response)

        result = adapter.synthesize('Hello world', 'alloy')
        expect(result).to eq(fake_audio)
      end

      it 'sends the correct Authorization header' do
        fake_response = double('response', success?: true, body: fake_audio,
                                     code: 200, timed_out?: false)
        captured_headers = nil
        allow(Typhoeus).to receive(:post) do |_url, opts|
          captured_headers = opts[:headers]
          fake_response
        end

        adapter.synthesize('Hello world', 'alloy')
        expect(captured_headers['Authorization']).to eq("Bearer #{fake_api_key}")
      end

      it 'sends Content-Type as application/json' do
        fake_response = double('response', success?: true, body: fake_audio,
                                     code: 200, timed_out?: false)
        captured_headers = nil
        allow(Typhoeus).to receive(:post) do |_url, opts|
          captured_headers = opts[:headers]
          fake_response
        end

        adapter.synthesize('Hello world', 'alloy')
        expect(captured_headers['Content-Type']).to eq('application/json')
      end

      # ----------------------------------------------------------------
      # Voice handling
      # ----------------------------------------------------------------

      it 'uses the requested voice when it is in SUPPORTED_VOICES' do
        fake_response = double('response', success?: true, body: fake_audio,
                                     code: 200, timed_out?: false)
        captured_body = nil
        allow(Typhoeus).to receive(:post) do |_url, opts|
          captured_body = JSON.parse(opts[:body])
          fake_response
        end

        adapter.synthesize('Hello world', 'nova')
        expect(captured_body['voice']).to eq('nova')
      end

      it 'falls back to alloy voice when voice_id is not supported' do
        fake_response = double('response', success?: true, body: fake_audio,
                                     code: 200, timed_out?: false)
        captured_body = nil
        allow(Typhoeus).to receive(:post) do |_url, opts|
          captured_body = JSON.parse(opts[:body])
          fake_response
        end

        adapter.synthesize('Hello world', 'nonexistent_voice')
        expect(captured_body['voice']).to eq('alloy')
      end

      # ----------------------------------------------------------------
      # Model handling
      # ----------------------------------------------------------------

      it 'uses tts-1-hd model when specified' do
        fake_response = double('response', success?: true, body: fake_audio,
                                     code: 200, timed_out?: false)
        captured_body = nil
        allow(Typhoeus).to receive(:post) do |_url, opts|
          captured_body = JSON.parse(opts[:body])
          fake_response
        end

        adapter.synthesize('Hello world', 'alloy', model: 'tts-1-hd')
        expect(captured_body['model']).to eq('tts-1-hd')
      end

      it 'defaults to tts-1 model when unsupported model is given' do
        fake_response = double('response', success?: true, body: fake_audio,
                                     code: 200, timed_out?: false)
        captured_body = nil
        allow(Typhoeus).to receive(:post) do |_url, opts|
          captured_body = JSON.parse(opts[:body])
          fake_response
        end

        adapter.synthesize('Hello world', 'alloy', model: 'gpt-4')
        expect(captured_body['model']).to eq('tts-1')
      end

      # ----------------------------------------------------------------
      # Response format handling
      # ----------------------------------------------------------------

      it 'uses the specified response format' do
        fake_response = double('response', success?: true, body: fake_audio,
                                     code: 200, timed_out?: false)
        captured_body = nil
        allow(Typhoeus).to receive(:post) do |_url, opts|
          captured_body = JSON.parse(opts[:body])
          fake_response
        end

        adapter.synthesize('Hello world', 'alloy', response_format: 'opus')
        expect(captured_body['response_format']).to eq('opus')
      end

      it 'defaults response format to mp3' do
        fake_response = double('response', success?: true, body: fake_audio,
                                     code: 200, timed_out?: false)
        captured_body = nil
        allow(Typhoeus).to receive(:post) do |_url, opts|
          captured_body = JSON.parse(opts[:body])
          fake_response
        end

        adapter.synthesize('Hello world', 'alloy')
        expect(captured_body['response_format']).to eq('mp3')
      end

      # ----------------------------------------------------------------
      # Error handling
      # ----------------------------------------------------------------

      it 'returns nil on 429 rate limit response' do
        fake_response = double('response', success?: false, body: 'rate limited',
                                     code: 429, timed_out?: false)
        allow(Typhoeus).to receive(:post).and_return(fake_response)

        result = adapter.synthesize('Hello world', 'alloy')
        expect(result).to be_nil
      end

      it 'returns nil on 500 server error' do
        fake_response = double('response', success?: false,
                                     body: 'Internal Server Error',
                                     code: 500, timed_out?: false)
        allow(Typhoeus).to receive(:post).and_return(fake_response)

        result = adapter.synthesize('Hello world', 'alloy')
        expect(result).to be_nil
      end

      it 'returns nil on 401 unauthorized' do
        fake_response = double('response', success?: false,
                                     body: 'Invalid API key',
                                     code: 401, timed_out?: false)
        allow(Typhoeus).to receive(:post).and_return(fake_response)

        result = adapter.synthesize('Hello world', 'alloy')
        expect(result).to be_nil
      end

      it 'returns nil on generic non-success response' do
        fake_response = double('response', success?: false,
                                     body: 'Bad Gateway',
                                     code: 502, timed_out?: false)
        allow(Typhoeus).to receive(:post).and_return(fake_response)

        result = adapter.synthesize('Hello world', 'alloy')
        expect(result).to be_nil
      end
    end
  end
end
