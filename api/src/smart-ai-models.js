/**
 * SmΔrt Collection - AI Models Configuration
 * ============================================
 * Centralized model definitions for all Collection apps.
 * 
 * USAGE:
 * 1. Include this script in your app: <script src="path/to/smart-ai-models.js"></script>
 * 2. Access models via: SmartAIModels.text.openai, SmartAIModels.image.dalle, etc.
 * 
 * UPDATING MODELS:
 * 1. Update this file with new model names
 * 2. Run: node scripts/sync-models.js (from Collection Library)
 * 3. Or manually update apps that have embedded configs
 * 
 * @version 1.0.0
 * @updated 2025-11-30
 */

const SmartAIModels = {
    // Version for cache busting and sync verification
    version: '1.0.0',
    lastUpdated: '2025-11-30',

    // ===== TEXT GENERATION MODELS =====
    text: {
        // OpenAI
        openai: {
            default: 'gpt-4o',  // Most broadly available GPT-4 model
            models: ['gpt-4o', 'gpt-4o-mini', 'gpt-5-mini', 'gpt-5.1', 'gpt-5.1-chat-latest'],
            recommended: 'gpt-4o'
        },
        // Anthropic
        anthropic: {
            default: 'claude-sonnet-4-20250514',
            models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
            recommended: 'claude-sonnet-4-20250514'
        },
        // Google
        google: {
            default: 'gemini-2.0-flash',
            models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
            recommended: 'gemini-2.0-flash'
        },
        // DeepSeek
        deepseek: {
            default: 'deepseek-chat',
            models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
            recommended: 'deepseek-chat'
        },
        // Groq (fast inference)
        groq: {
            default: 'llama-3.3-70b-versatile',
            models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
            recommended: 'llama-3.3-70b-versatile'
        },
        // xAI
        xai: {
            default: 'grok-beta',
            models: ['grok-beta', 'grok-2'],
            recommended: 'grok-beta'
        },
        // Mistral
        mistral: {
            default: 'mistral-large-latest',
            models: ['mistral-large-latest', 'mistral-small-latest', 'codestral-latest'],
            recommended: 'mistral-large-latest'
        },
        // Together AI
        'together-ai': {
            default: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
            models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'mistralai/Mixtral-8x22B-Instruct-v0.1'],
            recommended: 'meta-llama/Llama-3.3-70B-Instruct-Turbo'
        },
        // Fireworks AI
        'fireworks-ai': {
            default: 'accounts/fireworks/models/llama-v3p3-70b-instruct',
            models: ['accounts/fireworks/models/llama-v3p3-70b-instruct'],
            recommended: 'accounts/fireworks/models/llama-v3p3-70b-instruct'
        },
        // SambaNova
        sambanova: {
            default: 'Meta-Llama-3.3-70B-Instruct',
            models: ['Meta-Llama-3.3-70B-Instruct'],
            recommended: 'Meta-Llama-3.3-70B-Instruct'
        },
        // Cerebras
        cerebras: {
            default: 'llama3.3-70b',
            models: ['llama3.3-70b', 'llama3.1-8b'],
            recommended: 'llama3.3-70b'
        },
        // Cohere
        cohere: {
            default: 'command-r-plus',
            models: ['command-r-plus', 'command-r', 'command'],
            recommended: 'command-r-plus'
        },
        // HuggingFace
        huggingface: {
            default: 'mistralai/Mistral-7B-Instruct-v0.2',
            models: ['mistralai/Mistral-7B-Instruct-v0.2', 'meta-llama/Llama-2-7b-chat-hf'],
            recommended: 'mistralai/Mistral-7B-Instruct-v0.2'
        },
        // Ollama (local)
        ollama: {
            default: 'llama3.2',
            models: ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'phi3'],
            recommended: 'llama3.2'
        }
    },

    // ===== IMAGE GENERATION MODELS =====
    image: {
        // OpenAI DALL-E
        'openai-dalle': {
            default: 'dall-e-3',
            models: ['dall-e-3', 'dall-e-2'],
            recommended: 'dall-e-3',
            sizes: {
                '1:1': '1024x1024',
                '16:9': '1792x1024',
                '9:16': '1024x1792'
            }
        },
        // Stability AI
        'stable-diffusion': {
            default: 'stable-diffusion-xl-1024-v1-0',
            models: ['stable-diffusion-xl-1024-v1-0', 'stable-diffusion-v1-6'],
            recommended: 'stable-diffusion-xl-1024-v1-0',
            sizes: {
                '1:1': '1024x1024',
                '16:9': '1344x768',
                '9:16': '768x1344',
                '4:3': '1152x896',
                '3:4': '896x1152'
            }
        },
        // Leonardo AI
        'leonardo-ai': {
            default: 'leonardo-diffusion-xl',
            models: ['leonardo-diffusion-xl', 'leonardo-vision-xl'],
            recommended: 'leonardo-diffusion-xl'
        },
        // Replicate
        replicate: {
            default: 'stability-ai/sdxl',
            models: ['stability-ai/sdxl', 'black-forest-labs/flux-schnell'],
            recommended: 'stability-ai/sdxl'
        },
        // Free providers
        pollinations: {
            default: 'default',
            models: ['default'],
            recommended: 'default',
            note: 'Free, no API key required'
        },
        prodia: {
            default: 'sdxl',
            models: ['sdxl', 'sd-1.5'],
            recommended: 'sdxl'
        },
        dezgo: {
            default: 'sdxl',
            models: ['sdxl'],
            recommended: 'sdxl'
        }
    },

    // ===== VIDEO GENERATION MODELS =====
    video: {
        // OpenAI Sora
        'openai-sora': {
            default: 'sora-2',
            models: ['sora-2', 'sora-1'],
            recommended: 'sora-2'
        },
        // Runway
        runway: {
            default: 'gen-3',
            models: ['gen-3', 'gen-2'],
            recommended: 'gen-3'
        },
        // Pika
        pika: {
            default: 'pika-1.0',
            models: ['pika-1.0'],
            recommended: 'pika-1.0'
        },
        // Replicate video
        replicate: {
            default: 'stability-ai/stable-video-diffusion',
            models: ['stability-ai/stable-video-diffusion'],
            recommended: 'stability-ai/stable-video-diffusion'
        }
    },

    // ===== TEXT-TO-SPEECH MODELS =====
    tts: {
        // OpenAI TTS
        'openai-tts': {
            default: 'tts-1-hd',
            models: ['tts-1-hd', 'tts-1'],
            voices: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
            recommended: 'tts-1-hd'
        },
        // ElevenLabs
        elevenlabs: {
            default: 'eleven_multilingual_v2',
            models: ['eleven_multilingual_v2', 'eleven_monolingual_v1'],
            recommended: 'eleven_multilingual_v2'
        }
    },

    // ===== HELPER METHODS =====
    
    /**
     * Get default model for a provider
     * @param {string} category - 'text', 'image', 'video', 'tts'
     * @param {string} provider - Provider name (e.g., 'openai', 'anthropic')
     * @returns {string} Default model name
     */
    getDefault(category, provider) {
        return this[category]?.[provider]?.default || null;
    },

    /**
     * Get all models for a provider
     * @param {string} category - 'text', 'image', 'video', 'tts'
     * @param {string} provider - Provider name
     * @returns {string[]} Array of model names
     */
    getModels(category, provider) {
        return this[category]?.[provider]?.models || [];
    },

    /**
     * Check if a model is valid for a provider
     * @param {string} category - 'text', 'image', 'video', 'tts'
     * @param {string} provider - Provider name
     * @param {string} model - Model name to check
     * @returns {boolean}
     */
    isValidModel(category, provider, model) {
        const models = this.getModels(category, provider);
        return models.includes(model);
    },

    /**
     * Get configuration summary for logging
     * @returns {object} Summary of all configurations
     */
    getSummary() {
        return {
            version: this.version,
            lastUpdated: this.lastUpdated,
            textProviders: Object.keys(this.text),
            imageProviders: Object.keys(this.image),
            videoProviders: Object.keys(this.video),
            ttsProviders: Object.keys(this.tts)
        };
    }
};

// Export for Node.js (sync script)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SmartAIModels;
}

// Log when loaded
console.log('🤖 SmartAIModels v' + SmartAIModels.version + ' loaded (' + SmartAIModels.lastUpdated + ')');
