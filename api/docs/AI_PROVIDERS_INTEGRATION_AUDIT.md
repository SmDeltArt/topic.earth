# 🤖 SmΔrt Collection - AI Providers & API Settings Integration Audit

> **Date:** December 19, 2025  
> **Version:** 2.0.0  
> **Scope:** Complete AI provider documentation + Cross-app API settings architecture  
> **Updated:** Added STT, Audio/SFX generation, Video HTTPS APIs

---

## 📑 Table of Contents

1. [Model Selection System](#-model-selection-system)
2. [AI Text Providers](#-ai-text-providers)
3. [AI Image Providers](#-ai-image-providers)
4. [AI Video Providers](#-ai-video-providers) ⭐ UPDATED
5. [AI TTS Providers](#-ai-tts-providers)
6. [AI STT Providers](#-ai-stt-providers-speech-to-text) ⭐ NEW
7. [AI Audio/SFX Generation](#-ai-audiosfx-generation) ⭐ NEW
8. [Audio AI Concepts Explained](#-audio-ai-concepts-explained) ⭐ NEW
9. [API Settings Architecture](#-api-settings-architecture)
10. [Cross-App Integration Guide](#-cross-app-integration-guide)
11. [Shared Library Reference](#-shared-library-reference)

---

## 🎯 Model Selection System

### How Model Selection Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                     API SETTINGS (api-settings.html)                 │
│  User selects provider + model in UI                                 │
├─────────────────────────────────────────────────────────────────────┤
│  Text:  [OpenAI ▼] → Model: [gpt-4o ▼] [gpt-4o-mini] [gpt-4-turbo]  │
│  Image: [OpenAI ▼] → Model: [gpt-image-1 ▼] [dall-e-3]              │
│  TTS:   [OpenAI ▼] → Model: [tts-1 ▼] [tts-1-hd]                    │
│  Local: [Ollama ▼] → Model: [llama3.1:latest ▼] (from /api/tags)    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Saves to localStorage
┌─────────────────────────────────────────────────────────────────────┐
│  smdeltartApiSettings = {                                            │
│      openaiTextModel: "gpt-4o-mini",     // User's choice           │
│      openaiImageModel: "gpt-image-1",    // User's choice           │
│      openaiTtsModel: "tts-1-hd",         // User's choice           │
│      ollamaModel: "llama3.1:latest",     // User's choice           │
│      ...                                                             │
│  }                                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ Read by clipboard-manager
┌─────────────────────────────────────────────────────────────────────┐
│  getModelForProvider(category, provider)                             │
│  ├─ 1. Check Ollama special case → ollamaModel                      │
│  ├─ 2. Check SmartWidgetSync → sync.getModel()                      │
│  ├─ 3. Check localStorage → openaiTextModel, openaiImageModel, etc  │
│  ├─ 4. Check SmartAIModels library                                  │
│  └─ 5. Fallback to hardcoded defaults                               │
└─────────────────────────────────────────────────────────────────────┘
```

### Model Settings in localStorage

| Setting Key | Category | Options | Default |
|-------------|----------|---------|---------|
| `openaiTextModel` | Text | gpt-5.1-chat-latest, gpt-5.1, gpt-5, gpt-5-mini, gpt-4.1-mini, gpt-4o | `gpt-5.1-chat-latest` |
| `openaiImageModel` | Image | gpt-image-1, gpt-image-1-mini, dall-e-3, dall-e-2 | `gpt-image-1` |
| `openaiTtsModel` | TTS | tts-1-hd, tts-1 | `tts-1-hd` |
| `openaiSttModel` | STT | gpt-4o-transcribe, gpt-4o-mini-transcribe, gpt-4o-transcribe-diarize, whisper-1 | `whisper-1` |
| `openaiVideoModel` | Video | sora-2-pro, sora-2 | `sora-2` |
| `openaiAudioModel` | Audio | gpt-audio-2025-08-28, gpt-audio-mini, gpt-4o-audio-preview, gpt-4o-mini-audio-preview | `gpt-audio-2025-08-28` |
| `openaiRealtimeModel` | Realtime | gpt-realtime, gpt-realtime-mini, gpt-4o-realtime-preview, gpt-4o-mini-realtime-preview | `gpt-realtime` |
| `openaiSearchModel` | Search | gpt-5-search-api-2025-10-14, gpt-5-search-api | `gpt-5-search-api` |
| `openaiCodexModel` | Codex | gpt-5.1-codex-max, gpt-5.1-codex-mini, gpt-5-codex | `gpt-5.1-codex-max` |
| `openaiEmbeddingModel` | Embeddings | text-embedding-3-large, text-embedding-3-small | `text-embedding-3-small` |
| `ollamaModel` | Text | (from local Ollama `/api/tags`) | `llama3.1:latest` |

### Provider Model Selectors in api-settings.html

```html
<!-- OpenAI Text Model Selector -->
<div id="openaiTextModelSelector">
    <select id="openaiTextModel">
        <option value="gpt-5.1-chat-latest" selected>GPT-5.1 Chat (Latest)</option>
        <option value="gpt-5.1">GPT-5.1</option>
        <option value="gpt-5">GPT-5</option>
        <option value="gpt-5-mini">GPT-5 Mini (Faster)</option>
        <option value="gpt-4.1-mini">GPT-4.1 Mini</option>
        <option value="gpt-4o">GPT-4o (Legacy)</option>
    </select>
</div>

<!-- OpenAI Image Model Selector -->
<div id="openaiImageModelSelector">
    <select id="openaiImageModel">
        <option value="gpt-image-1" selected>GPT Image 1 (Best)</option>
        <option value="gpt-image-1-mini">GPT Image 1 Mini (Faster)</option>
        <option value="dall-e-3">DALL-E 3</option>
        <option value="dall-e-2">DALL-E 2 (Legacy)</option>
    </select>
</div>

<!-- Ollama Model Selector (populated dynamically) -->
<div id="ollamaModelSelector">
    <select id="ollamaModel">
        <!-- Populated from http://127.0.0.1:11434/api/tags -->
    </select>
</div>
```

### Code: How clipboard-manager reads models

```javascript
// getModelForProvider() in clipboard-manager.html
function getModelForProvider(category, provider) {
    // Helper to read from localStorage
    const getSettings = () => {
        const smdeltart = localStorage.getItem('smdeltartApiSettings');
        return smdeltart ? JSON.parse(smdeltart) : {};
    };
    
    // Special handling for Ollama
    if (provider === 'ollama') {
        const settings = getSettings();
        return settings.ollamaModel || 'llama3.1:latest';
    }
    
    // Check user-selected model from api-settings
    const settings = getSettings();
    
    if (category === 'text' && provider === 'openai') {
        return settings.openaiTextModel || 'gpt-5.1-chat-latest';
    }
    if (category === 'image' && provider === 'openai-dalle') {
        return settings.openaiImageModel || 'gpt-image-1';
    }
    if (category === 'tts' && provider === 'openai-tts') {
        return settings.openaiTtsModel || 'tts-1-hd';
    }
    if (category === 'stt' && provider === 'openai-whisper') {
        return settings.openaiSttModel || 'whisper-1';
    }
    if (category === 'video' && provider === 'openai-sora') {
        return settings.openaiVideoModel || 'sora-2';
    }
    if (category === 'audio' && provider === 'openai-audio') {
        return settings.openaiAudioModel || 'gpt-audio-2025-08-28';
    }
    if (category === 'realtime' && provider === 'openai-realtime') {
        return settings.openaiRealtimeModel || 'gpt-realtime';
    }
    
    // Fallback to defaults
    const defaults = {
        'openai': 'gpt-5.1-chat-latest',
        'anthropic': 'claude-sonnet-4-20250514',
        'groq': 'llama-3.3-70b-versatile',
        // ...
    };
    return defaults[provider] || 'gpt-5.1-chat-latest';
}
```

### ✅ Model Selection Status

| App | Reads Models | Status |
|-----|-------------|--------|
| api-settings.html | N/A (saves) | ✅ Saves all model selections |
| clipboard-manager.html | ✅ Yes | ✅ Fixed - reads from `smdeltartApiSettings` |
| streaming-studio | ❌ No | 🔴 Not implemented |
| images-suite | ❌ No | 🔴 Not implemented |

---

## 📝 AI Text Providers

### Provider Matrix

| Provider | API Key Format | Endpoint | Free Tier | Quality | Speed |
|----------|---------------|----------|-----------|---------|-------|
| **OpenAI** | `sk-...` | `api.openai.com/v1/chat/completions` | ❌ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Anthropic** | `sk-ant-...` | `api.anthropic.com/v1/messages` | ❌ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Google** | API key | `generativelanguage.googleapis.com` | ✅ Limited | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Groq** | `gsk_...` | `api.groq.com/openai/v1/chat/completions` | ✅ Generous | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **DeepSeek** | API key | `api.deepseek.com/v1/chat/completions` | ✅ Limited | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **xAI (Grok)** | `xai-...` | `api.x.ai/v1/chat/completions` | ❌ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Mistral** | API key | `api.mistral.ai/v1/chat/completions` | ✅ Limited | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Together AI** | API key | `api.together.xyz/v1/chat/completions` | ✅ $25 credit | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Fireworks AI** | API key | `api.fireworks.ai/inference/v1/chat/completions` | ✅ Limited | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **SambaNova** | API key | `api.sambanova.ai/v1/chat/completions` | ✅ Limited | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Cerebras** | API key | `api.cerebras.ai/v1/chat/completions` | ✅ Limited | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Cohere** | API key | `api.cohere.ai/v1/chat` | ✅ Limited | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **HuggingFace** | `hf_...` | `api-inference.huggingface.co/models/...` | ✅ Limited | ⭐⭐⭐ | ⭐⭐⭐ |
| **Ollama** | ❌ None | `127.0.0.1:11434/api/chat` | ✅ FREE | ⭐⭐⭐⭐ | ⭐⭐⭐ |

### Response Format Compatibility

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenAI-Compatible Format                      │
│  (Same request/response structure)                               │
├─────────────────────────────────────────────────────────────────┤
│  openai, groq, deepseek, xai, mistral, together-ai,             │
│  fireworks-ai, sambanova, cerebras                               │
│                                                                  │
│  Request: { model, messages: [{role, content}] }                │
│  Response: data.choices[0].message.content                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Custom Format Providers                       │
├─────────────────────────────────────────────────────────────────┤
│  anthropic:   Request: { model, system, messages }              │
│               Response: data.content[0].text                     │
│                                                                  │
│  google:      Request: { contents: [{parts: [{text}]}] }        │
│               Response: data.candidates[0].content.parts[0].text │
│                                                                  │
│  cohere:      Request: { model, message, preamble }             │
│               Response: data.text                                │
│                                                                  │
│  huggingface: Request: { inputs }                               │
│               Response: data[0].generated_text                   │
│                                                                  │
│  ollama:      Request: { model, messages, stream: false }       │
│               Response: data.message.content                     │
└─────────────────────────────────────────────────────────────────┘
```

### Default Models per Provider

| Provider | Default Model | Alternative Models |
|----------|--------------|-------------------|
| openai | `gpt-5.1-chat-latest` | gpt-5.1, gpt-5, gpt-5-mini, gpt-4.1-mini, gpt-4o |
| anthropic | `claude-3-5-sonnet-20241022` | claude-3-opus, claude-3-haiku |
| google | `gemini-1.5-flash` | gemini-1.5-pro, gemini-pro |
| groq | `llama-3.3-70b-versatile` | mixtral-8x7b, llama-3.1-8b |
| deepseek | `deepseek-chat` | deepseek-coder |
| xai | `grok-beta` | - |
| mistral | `mistral-large-latest` | mistral-medium, mistral-small |
| together-ai | `meta-llama/Llama-3-70b-chat-hf` | many open models |
| fireworks-ai | `accounts/fireworks/models/llama-v3p1-70b-instruct` | - |
| sambanova | `Meta-Llama-3.1-8B-Instruct` | - |
| cerebras | `llama3.1-8b` | - |
| cohere | `command-r-plus` | command-r, command |
| huggingface | `mistralai/Mistral-7B-Instruct-v0.2` | many models |
| ollama | `llama3.1:latest` | user's installed models |

---

## 🖼️ AI Image Providers

### Provider Matrix

| Provider | API Key Format | Free Tier | Max Resolution | Quality | Cost |
|----------|---------------|-----------|----------------|---------|------|
| **OpenAI DALL-E 3** | `sk-...` | ❌ | 1792x1024 | ⭐⭐⭐⭐⭐ | $$$$ |
| **Stability AI** | API key | ❌ | 2048x2048 | ⭐⭐⭐⭐⭐ | $$$ |
| **Replicate** | `r8_...` | ✅ Limited | Varies | ⭐⭐⭐⭐ | $$ |
| **HuggingFace** | `hf_...` | ✅ Limited | 1024x1024 | ⭐⭐⭐ | $ |
| **GetImg.ai** | API key | ✅ 100/mo | 1024x1024 | ⭐⭐⭐⭐ | $$ |
| **Pollinations** | ❌ None | ✅ FREE | 1024x1024 | ⭐⭐⭐ | FREE |

### API Request Formats

```javascript
// ══════════════════════════════════════════════════════════════
// DALL-E 3 (OpenAI)
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api.openai.com/v1/images/generations',
    headers: { 'Authorization': 'Bearer sk-...', 'Content-Type': 'application/json' },
    body: {
        model: 'dall-e-3',
        prompt: '...',
        n: 1,
        size: '1024x1024',           // 1024x1024, 1792x1024, 1024x1792
        quality: 'standard',          // standard, hd
        response_format: 'b64_json'   // url or b64_json
    },
    response: data.data[0].b64_json || data.data[0].url
}

// ══════════════════════════════════════════════════════════════
// Stability AI (SDXL)
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
    headers: { 'Authorization': 'Bearer ...', 'Content-Type': 'application/json' },
    body: {
        text_prompts: [{ text: '...', weight: 1 }],
        cfg_scale: 7,
        height: 1024,
        width: 1024,
        samples: 1,
        steps: 30
    },
    response: `data:image/png;base64,${data.artifacts[0].base64}`
}

// ══════════════════════════════════════════════════════════════
// Replicate (SDXL)
// ══════════════════════════════════════════════════════════════
{
    // Step 1: Create prediction
    url: 'https://api.replicate.com/v1/predictions',
    headers: { 'Authorization': 'Token r8_...', 'Content-Type': 'application/json' },
    body: {
        version: 'ac732df83cea7fff18b8472768c88ad041fa750ff7682a21affe81863cbe77e4',
        input: { prompt: '...', width: 1024, height: 1024 }
    },
    // Step 2: Poll prediction.urls.get until status === 'succeeded'
    response: status.output[0]  // URL to image
}

// ══════════════════════════════════════════════════════════════
// HuggingFace (SDXL)
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
    headers: { 'Authorization': 'Bearer hf_...', 'Content-Type': 'application/json' },
    body: { inputs: '...' },
    response: URL.createObjectURL(await response.blob())  // Returns image blob directly
}

// ══════════════════════════════════════════════════════════════
// GetImg.ai
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api.getimg.ai/v1/stable-diffusion-xl/text-to-image',
    headers: { 'Authorization': 'Bearer ...', 'Content-Type': 'application/json' },
    body: {
        prompt: '...',
        width: 1024,
        height: 1024,
        steps: 30,
        output_format: 'png'
    },
    response: `data:image/png;base64,${data.image}`
}

// ══════════════════════════════════════════════════════════════
// Pollinations (FREE - No API Key!)
// ══════════════════════════════════════════════════════════════
{
    // Direct URL - no API call needed!
    url: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`,
    response: url  // The URL itself is the image
}
```

### Size Presets

| Aspect Ratio | DALL-E 3 | Stability/Others |
|--------------|----------|------------------|
| 1:1 (Square) | 1024x1024 | 1024x1024 |
| 16:9 (Wide) | 1792x1024 | 1344x768 |
| 9:16 (Portrait) | 1024x1792 | 768x1344 |

---

## 🎬 AI Video Providers

> **Updated December 2025** - HTTPS APIs accessible from browser/localhost

### Provider Matrix

| Provider | API Key | Free Tier | Max Duration | HTTPS API | Localhost OK | Status |
|----------|---------|-----------|--------------|-----------|--------------|--------|
| **Fal.ai** | `fal-...` | ✅ Limited | 10s | ✅ Yes | ✅ Yes | ⭐ RECOMMENDED |
| **Replicate** | `r8_...` | ✅ Limited | Varies | ✅ Yes | ✅ Yes | ✅ Available |
| **Luma AI** | API key | ✅ Limited | 5s | ✅ Yes | ✅ Yes | ✅ Available |
| **Runway Gen-3** | API key | ❌ Paid | 10s | ✅ Yes | ✅ Yes | ✅ Available |
| **Kling AI** | API key | ✅ Limited | 5s | ✅ Yes | ✅ Yes | ✅ Available |
| **Pika Labs** | API key | ✅ Limited | 3s | ✅ Yes | ⚠️ CORS | ✅ Available |
| **HuggingFace** | `hf_...` | ✅ FREE | Short | ✅ Yes | ✅ Yes | ✅ Available |
| **OpenAI Sora** | `sk-...` | ❌ | 60s | ⚠️ Beta | ⚠️ Limited | ⚠️ API limited |

### 🌐 HTTPS-Accessible Video APIs (for Clipboard Manager)

#### 1. Fal.ai (RECOMMENDED for localhost)
```javascript
// ══════════════════════════════════════════════════════════════
// Fal.ai - Multiple video models, CORS-friendly
// Models: minimax-video, kling-video, cogvideox, wan-t2v
// ══════════════════════════════════════════════════════════════
{
    url: 'https://queue.fal.run/fal-ai/minimax-video/video-01-live',
    headers: { 
        'Authorization': 'Key fal-...',
        'Content-Type': 'application/json'
    },
    body: {
        prompt: 'A cat playing piano in a jazz club',
        aspect_ratio: '16:9'
    },
    // Returns: { request_id: '...' }
    // Poll: GET https://queue.fal.run/fal-ai/minimax-video/requests/{request_id}/status
    // Result: { video: { url: 'https://...' } }
}
```

#### 2. Replicate (Versatile, many models)
```javascript
// ══════════════════════════════════════════════════════════════
// Replicate - Stable Video Diffusion, AnimateDiff, etc.
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api.replicate.com/v1/predictions',
    headers: { 
        'Authorization': 'Token r8_...',
        'Content-Type': 'application/json'
    },
    body: {
        version: 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
        input: {
            input_image: 'https://url-to-image.jpg',  // Image-to-Video
            // OR for text-to-video models:
            prompt: 'A futuristic city at sunset'
        }
    },
    // Poll: GET prediction.urls.get
}
```

#### 3. Luma Dream Machine
```javascript
// ══════════════════════════════════════════════════════════════
// Luma AI Dream Machine - High quality video
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api.lumalabs.ai/dream-machine/v1/generations',
    headers: { 
        'Authorization': 'Bearer luma-...',
        'Content-Type': 'application/json'
    },
    body: {
        prompt: 'Cinematic drone shot over mountains at golden hour',
        aspect_ratio: '16:9',
        loop: false
    },
    // Poll: GET /generations/{id}
}
```

#### 4. HuggingFace Inference API (FREE with limits)
```javascript
// ══════════════════════════════════════════════════════════════
// HuggingFace - Free tier, various video models
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api-inference.huggingface.co/models/ali-vilab/text-to-video-ms-1.7b',
    headers: { 
        'Authorization': 'Bearer hf_...',
        'Content-Type': 'application/json'
    },
    body: {
        inputs: 'A person walking on the beach at sunset'
    },
    // May return: { error: 'Model is loading...' } - retry after wait
}
```

### Video Generation Notes

- **All video APIs are async** - submit job, poll for completion
- **Typical wait:** 30 seconds to 5 minutes
- **Cost:** $0.01-$0.50 per generation
- **Best for localhost:** Fal.ai, Replicate, HuggingFace (CORS-friendly)
- **Free options:** HuggingFace (rate limited), Fal.ai free tier

---

## 🔊 AI TTS Providers

### Provider Matrix

| Provider | API Key | Free Tier | Voices | Quality | WebSim OK |
|----------|---------|-----------|--------|---------|-----------|
| **Browser Speech** | ❌ None | ✅ FREE | OS voices | ⭐⭐⭐ | ✅ Yes |
| **Edge TTS** | ❌ None | ✅ FREE | 300+ | ⭐⭐⭐⭐ | ⚠️ Proxy |
| **OpenAI TTS** | `sk-...` | ❌ | 6 | ⭐⭐⭐⭐ | ✅ Yes |
| **ElevenLabs** | API key | ✅ 10k/mo | 100+ | ⭐⭐⭐⭐⭐ | ✅ Yes |
| **Google TTS** | API key | ✅ 4M/mo | 200+ | ⭐⭐⭐⭐ | ✅ Yes |
| **Azure TTS** | API key | ✅ 5h/mo | 400+ | ⭐⭐⭐⭐⭐ | ✅ Yes |
| **Amazon Polly** | AWS creds | ✅ 5M/12mo | 60+ | ⭐⭐⭐⭐ | ⚠️ SDK |
| **Play.ht** | API key | ✅ Limited | Clone | ⭐⭐⭐⭐⭐ | ✅ Yes |

### API Request Formats

```javascript
// ══════════════════════════════════════════════════════════════
// OpenAI TTS
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api.openai.com/v1/audio/speech',
    headers: { 'Authorization': 'Bearer sk-...', 'Content-Type': 'application/json' },
    body: {
        model: 'tts-1',        // tts-1 (fast) or tts-1-hd (quality)
        input: 'text...',
        voice: 'alloy',        // alloy, echo, fable, onyx, nova, shimmer
        response_format: 'mp3'
    },
    response: URL.createObjectURL(await response.blob())
}

// ══════════════════════════════════════════════════════════════
// ElevenLabs
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api.elevenlabs.io/v1/text-to-speech/{voice_id}',
    headers: { 'xi-api-key': '...', 'Content-Type': 'application/json' },
    body: {
        text: '...',
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.5 }
    },
    response: URL.createObjectURL(await response.blob())
}

// ══════════════════════════════════════════════════════════════
// Google Cloud TTS
// ══════════════════════════════════════════════════════════════
{
    url: 'https://texttospeech.googleapis.com/v1/text:synthesize?key=...',
    headers: { 'Content-Type': 'application/json' },
    body: {
        input: { text: '...' },
        voice: { languageCode: 'en-US', name: 'en-US-Neural2-F' },
        audioConfig: { audioEncoding: 'MP3' }
    },
    response: `data:audio/mp3;base64,${data.audioContent}`
}
```

---

## � AI STT Providers (Speech-to-Text)

> **STT = Speech-to-Text** - Converting audio/voice into text (transcription)

### Provider Matrix

| Provider | API Key | Free Tier | Languages | Real-time | Quality | Localhost OK |
|----------|---------|-----------|-----------|-----------|---------|--------------|
| **Browser Web Speech** | ❌ None | ✅ FREE | OS langs | ✅ Yes | ⭐⭐⭐ | ✅ Yes |
| **OpenAI Whisper** | `sk-...` | ❌ | 100+ | ❌ File | ⭐⭐⭐⭐⭐ | ✅ Yes |
| **OpenAI gpt-4o-transcribe** | `sk-...` | ❌ | 100+ | ✅ Stream | ⭐⭐⭐⭐⭐ | ✅ Yes |
| **Groq Whisper** | `gsk_...` | ✅ FREE | 100+ | ❌ File | ⭐⭐⭐⭐⭐ | ✅ Yes |
| **Deepgram** | API key | ✅ 12k min | 36 | ✅ Yes | ⭐⭐⭐⭐⭐ | ✅ Yes |
| **AssemblyAI** | API key | ✅ 5h/mo | 10+ | ✅ Yes | ⭐⭐⭐⭐⭐ | ✅ Yes |
| **Google Speech** | API key | ✅ 60min/mo | 125+ | ✅ Yes | ⭐⭐⭐⭐ | ⚠️ SDK |
| **Azure Speech** | API key | ✅ 5h/mo | 100+ | ✅ Yes | ⭐⭐⭐⭐⭐ | ✅ Yes |
| **ElevenLabs Scribe** | API key | ✅ Limited | 32 | ✅ Yes | ⭐⭐⭐⭐⭐ | ✅ Yes |

### API Request Formats

#### 1. Browser Web Speech API (FREE - No API key!)
```javascript
// ══════════════════════════════════════════════════════════════
// Browser SpeechRecognition - Built-in, FREE, Real-time
// ══════════════════════════════════════════════════════════════
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = true;
recognition.lang = 'en-US';

recognition.onresult = (event) => {
    const transcript = event.results[event.results.length - 1][0].transcript;
    console.log('Heard:', transcript);
};

recognition.start();
```

#### 2. OpenAI Whisper (File-based transcription)
```javascript
// ══════════════════════════════════════════════════════════════
// OpenAI Whisper - High accuracy, 100+ languages
// Models: whisper-1 (classic), gpt-4o-transcribe, gpt-4o-mini-transcribe
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api.openai.com/v1/audio/transcriptions',
    method: 'POST',
    headers: { 'Authorization': 'Bearer sk-...' },
    body: FormData({
        file: audioBlob,           // mp3, mp4, wav, webm (max 25MB)
        model: 'whisper-1',        // or 'gpt-4o-transcribe'
        language: 'en',            // optional
        response_format: 'json'    // json, text, srt, vtt
    }),
    response: { text: 'Transcribed text here...' }
}
```

#### 3. OpenAI Streaming Transcription (Real-time)
```javascript
// ══════════════════════════════════════════════════════════════
// OpenAI gpt-4o-transcribe with streaming
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api.openai.com/v1/audio/transcriptions',
    headers: { 'Authorization': 'Bearer sk-...' },
    body: FormData({
        file: audioBlob,
        model: 'gpt-4o-mini-transcribe',
        stream: true
    }),
    // Returns Server-Sent Events with deltas
}
```

#### 4. Groq Whisper (FREE & FAST!)
```javascript
// ══════════════════════════════════════════════════════════════
// Groq Whisper - Same as OpenAI but FREE and faster
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api.groq.com/openai/v1/audio/transcriptions',
    method: 'POST',
    headers: { 'Authorization': 'Bearer gsk_...' },
    body: FormData({
        file: audioBlob,
        model: 'whisper-large-v3',
        language: 'en'
    }),
    response: { text: 'Transcribed text...' }
}
```

#### 5. Deepgram (Real-time streaming)
```javascript
// ══════════════════════════════════════════════════════════════
// Deepgram - Real-time WebSocket transcription
// ══════════════════════════════════════════════════════════════
const socket = new WebSocket('wss://api.deepgram.com/v1/listen', [
    'token',
    'YOUR_DEEPGRAM_API_KEY'
]);

socket.onopen = () => {
    // Send audio chunks as they're recorded
    mediaRecorder.ondataavailable = (e) => socket.send(e.data);
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Transcript:', data.channel.alternatives[0].transcript);
};
```

### STT Use Cases for Clipboard Manager

| Feature | Best Provider | Why |
|---------|---------------|-----|
| **Quick voice notes** | Browser Web Speech | Free, instant, no API key |
| **Transcribe recordings** | Groq Whisper | Free, accurate, fast |
| **Multi-language** | OpenAI Whisper | 100+ languages |
| **Real-time captions** | Deepgram | WebSocket streaming |
| **Speaker diarization** | OpenAI gpt-4o-transcribe-diarize | Who said what |

---

## 🎵 AI Audio/SFX Generation

> **⚠️ Important Distinction:**
> - **TTS** = Text → Human Speech Voice
> - **Audio/SFX** = Text → Sound Effects, Music, Ambience
> - These are DIFFERENT APIs!

### Provider Matrix

| Provider | API Key | Free Tier | Output Types | Quality | Localhost OK |
|----------|---------|-----------|--------------|---------|--------------|
| **ElevenLabs SFX** | API key | ✅ Limited | Sound effects | ⭐⭐⭐⭐⭐ | ✅ Yes |
| **Stability Audio** | API key | ✅ Limited | Music, SFX | ⭐⭐⭐⭐ | ✅ Yes |
| **Replicate Audio** | `r8_...` | ✅ Limited | Various | ⭐⭐⭐⭐ | ✅ Yes |
| **Suno AI** | API key | ✅ 50/day | Music | ⭐⭐⭐⭐⭐ | ⚠️ No public API |
| **Udio** | API key | ✅ Limited | Music | ⭐⭐⭐⭐⭐ | ⚠️ No public API |
| **Meta AudioCraft** | HF token | ✅ FREE | Music | ⭐⭐⭐⭐ | ✅ HuggingFace |

### API Request Formats

#### 1. ElevenLabs Sound Effects (RECOMMENDED)
```javascript
// ══════════════════════════════════════════════════════════════
// ElevenLabs Text-to-Sound Effects
// Generate: explosions, footsteps, ambience, sci-fi sounds, etc.
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api.elevenlabs.io/v1/sound-generation',
    method: 'POST',
    headers: { 
        'xi-api-key': '...',
        'Content-Type': 'application/json'
    },
    body: {
        text: 'Spacious braam suitable for high-impact movie trailer moments',
        duration_seconds: 5,        // 0.5 to 30 seconds
        prompt_influence: 0.3,      // 0-1, higher = closer to prompt
        model_id: 'eleven_text_to_sound_v2'
    },
    response: Blob (MP3 audio file)
}

// Examples of prompts:
// "Thunder rolling in the distance with light rain"
// "Laser gun firing in a spaceship corridor"
// "Wooden door creaking open slowly"
// "Crowd cheering at a sports event"
// "Typing on a mechanical keyboard"
```

#### 2. Stability Audio
```javascript
// ══════════════════════════════════════════════════════════════
// Stability AI - Stable Audio
// Generate: music, sound effects, soundscapes
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api.stability.ai/v1/generation/stable-audio',
    method: 'POST',
    headers: { 
        'Authorization': 'Bearer sk-...',
        'Content-Type': 'application/json'
    },
    body: {
        prompt: 'Upbeat electronic music with synth pads and drums',
        duration: 30,
        output_format: 'mp3'
    }
}
```

#### 3. Replicate (AudioCraft/MusicGen)
```javascript
// ══════════════════════════════════════════════════════════════
// Replicate - Meta's MusicGen
// Generate: music from text descriptions
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api.replicate.com/v1/predictions',
    headers: { 
        'Authorization': 'Token r8_...',
        'Content-Type': 'application/json'
    },
    body: {
        version: 'meta/musicgen:b05b1dff1d8c6dc63d14b0cdb42135378dcb87f6373b0d3d341ede46e59e2b38',
        input: {
            prompt: 'Lo-fi hip hop beat with vinyl crackle and soft piano',
            duration: 15,
            model_version: 'stereo-melody-large'
        }
    }
}
```

#### 4. HuggingFace AudioCraft (FREE)
```javascript
// ══════════════════════════════════════════════════════════════
// HuggingFace - AudioCraft (Free with rate limits)
// ══════════════════════════════════════════════════════════════
{
    url: 'https://api-inference.huggingface.co/models/facebook/musicgen-small',
    headers: { 
        'Authorization': 'Bearer hf_...',
        'Content-Type': 'application/json'
    },
    body: {
        inputs: 'Ambient electronic soundscape with soft pads'
    }
}
```

### Audio/SFX Prompt Examples

| Category | Example Prompt |
|----------|----------------|
| **Trailer/Cinematic** | "Deep bass impact hit with reverb tail" |
| **UI/App Sounds** | "Soft notification chime, friendly and minimal" |
| **Game SFX** | "8-bit coin pickup sound with sparkle" |
| **Ambience** | "Coffee shop background with soft chatter and espresso machine" |
| **Nature** | "Forest morning with birds chirping and gentle wind" |
| **Sci-Fi** | "Spaceship engine hum with occasional beeps" |
| **Horror** | "Creepy whispers with distant metallic scraping" |
| **Music** | "Upbeat jazz with walking bass and brushed drums" |

---

## 🎧 Audio AI Concepts Explained

### The Audio AI Family Tree

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AUDIO AI TECHNOLOGIES                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────┐    ┌────────────────┐    ┌────────────────────────┐    │
│  │    TTS         │    │    STT         │    │  AUDIO GENERATION      │    │
│  │ Text-to-Speech │    │ Speech-to-Text │    │  (Sound/Music)         │    │
│  └───────┬────────┘    └───────┬────────┘    └───────────┬────────────┘    │
│          │                     │                         │                  │
│          ▼                     ▼                         ▼                  │
│  Text → Voice          Voice → Text            Text → Sound/Music          │
│  "Hello" → 🔊          🎤 → "Hello"           "explosion" → 💥🔊           │
│                                                                              │
│  Providers:            Providers:              Providers:                   │
│  • OpenAI TTS          • OpenAI Whisper        • ElevenLabs SFX            │
│  • ElevenLabs          • Groq Whisper          • Stability Audio           │
│  • Google TTS          • Deepgram              • Replicate MusicGen        │
│  • Azure TTS           • AssemblyAI            • Suno AI                   │
│  • Browser Speech      • Browser Web Speech    • Udio                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Common Confusion: STT vs Audio Effects

> **"I heard AI audio sound effects are managed by STT"** - This is a misunderstanding!

| What You Want | Technology | API |
|---------------|------------|-----|
| Convert my voice to text | **STT** (Speech-to-Text) | Whisper, Deepgram |
| Generate a robot voice | **TTS** (Text-to-Speech) | ElevenLabs, OpenAI TTS |
| Create explosion sound | **Audio Generation** | ElevenLabs SFX |
| Make background music | **Music Generation** | MusicGen, Suno |
| Transcribe a podcast | **STT** | Whisper |
| Clone someone's voice | **Voice Cloning** (TTS variant) | ElevenLabs, Play.ht |

### How They Work Together in an App

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    STREAMING STUDIO / CLIPBOARD MANAGER                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  [🎤 Record Voice] ──► STT (Whisper) ──► Text ──► [Process/Edit]        │
│                                                    │                      │
│                           ┌────────────────────────┴────────────────┐    │
│                           │                                          │    │
│                           ▼                                          ▼    │
│                    TTS (Voice)                              Audio Gen     │
│                    "Read this back"                         "Add SFX"     │
│                           │                                          │    │
│                           ▼                                          ▼    │
│                    🔊 Human Voice                            🔊 Sound FX  │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

### Whisper Models Comparison

| Model | Provider | Speed | Accuracy | Cost | Best For |
|-------|----------|-------|----------|------|----------|
| `whisper-1` | OpenAI | Fast | ⭐⭐⭐⭐ | $0.006/min | General transcription |
| `gpt-4o-transcribe` | OpenAI | Medium | ⭐⭐⭐⭐⭐ | $0.006/min | Highest accuracy |
| `gpt-4o-mini-transcribe` | OpenAI | Fast | ⭐⭐⭐⭐ | $0.003/min | Cost-effective |
| `gpt-4o-transcribe-diarize` | OpenAI | Slow | ⭐⭐⭐⭐⭐ | $0.006/min | Who said what |
| `whisper-large-v3` | Groq | ⚡ FAST | ⭐⭐⭐⭐⭐ | FREE | Best free option |
| `whisper-large-v3-turbo` | Groq | ⚡⚡ | ⭐⭐⭐⭐ | FREE | Fastest free |

---

## �🏗️ API Settings Architecture

### Storage Structure

```javascript
// localStorage key: 'smdeltartApiSettings'
// Values are XOR encrypted with prefix 'ENC:'

{
    // ═══════════════════════════════════════════════════════════
    // TEXT GENERATION
    // ═══════════════════════════════════════════════════════════
    "textApiProvider": "external",           // 'websim' | 'external'
    "paidTextApi": "openai",                 // Provider ID
    "paidTextApiKey": "ENC:...",             // Encrypted key
    "freeTextApi": "groq",                   // Free tier provider
    "freeTextApiKey": "ENC:...",             // Encrypted key (or empty for ollama)
    
    // ═══════════════════════════════════════════════════════════
    // IMAGE GENERATION
    // ═══════════════════════════════════════════════════════════
    "imageApiProvider": "external",
    "paidImageApi": "openai-dalle",
    "paidImageApiKey": "ENC:...",
    "freeImageApi": "pollinations",          // No key needed
    "freeImageApiKey": "",
    
    // ═══════════════════════════════════════════════════════════
    // VIDEO GENERATION
    // ═══════════════════════════════════════════════════════════
    "videoApiProvider": "external",
    "paidVideoApi": "runway-gen3",
    "paidVideoApiKey": "ENC:...",
    "freeVideoApi": "hf-spaces",
    "freeVideoApiKey": "",
    
    // ═══════════════════════════════════════════════════════════
    // TTS (Text-to-Speech)
    // ═══════════════════════════════════════════════════════════
    "ttsApiProvider": "browser",             // 'browser' | 'external'
    "externalTtsApi": "openai-tts",
    "externalTtsApiKey": "ENC:...",
    "openaiTtsModel": "tts-1",               // tts-1 | tts-1-hd
    
    // ═══════════════════════════════════════════════════════════
    // STT (Speech-to-Text) - NEW
    // ═══════════════════════════════════════════════════════════
    "sttApiProvider": "browser",             // 'browser' | 'external'
    "externalSttApi": "openai-whisper",      // Provider ID
    "externalSttApiKey": "ENC:...",          // Encrypted key
    "whisperModel": "whisper-1",             // whisper-1 | gpt-4o-transcribe
    
    // ═══════════════════════════════════════════════════════════
    // AUDIO/SFX GENERATION - NEW
    // ═══════════════════════════════════════════════════════════
    "audioSfxProvider": "elevenlabs-sfx",    // Provider ID
    "audioSfxApiKey": "ENC:...",             // Uses same key as TTS if ElevenLabs
    
    // ═══════════════════════════════════════════════════════════
    // MODELS (Optional overrides)
    // ═══════════════════════════════════════════════════════════
    "openaiModel": "gpt-4o",
    "anthropicModel": "claude-3-5-sonnet-20241022",
    "groqModel": "llama-3.3-70b-versatile",
    "ollamaModel": "llama3.1:latest",
    
    // ═══════════════════════════════════════════════════════════
    // METADATA
    // ═══════════════════════════════════════════════════════════
    "lastUpdated": "2025-12-19T...",
    "version": "2.3"
}
```

### Encryption/Decryption

```javascript
// XOR encryption key (must be same across all apps)
const XOR_KEY = 'smdeltart-v2-secure';

// Encrypt
function encryptApiKey(plainKey) {
    if (!plainKey || plainKey.startsWith('ENC:')) return plainKey;
    let encrypted = '';
    for (let i = 0; i < plainKey.length; i++) {
        encrypted += String.fromCharCode(
            plainKey.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length)
        );
    }
    return 'ENC:' + btoa(encrypted);
}

// Decrypt
function decryptApiKey(encryptedKey) {
    if (!encryptedKey || !encryptedKey.startsWith('ENC:')) return encryptedKey;
    const encrypted = encryptedKey.substring(4);
    const decoded = atob(encrypted);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
        result += String.fromCharCode(
            decoded.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length)
        );
    }
    return result;
}
```

---

## 🔗 Cross-App Integration Guide

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         SHARED RESOURCES                             │
│  widgets/shared/                                                     │
│  ├── smart-app-binding.js    → Security & app authorization         │
│  ├── smart-widget-sync.js    → Cross-widget settings sync           │
│  ├── smart-popup-library.js  → Iframe popup for API settings        │
│  └── api-settings.html       → Master configuration UI              │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                    localStorage: smdeltartApiSettings
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌───────────────┐         ┌───────────────┐         ┌───────────────┐
│ 📋 Clipboard  │         │ 🖼️ Images     │         │ 🎥 Studio     │
│   Manager     │         │   Suite       │         │               │
│   :5500       │         │   :3000       │         │   :3000       │
│               │         │               │         │   (Next.js)   │
│ ✅ Full       │         │ ⚠️ Partial    │         │ ❌ None       │
│   integration │         │               │         │               │
└───────────────┘         └───────────────┘         └───────────────┘
```

### Method 1: Direct localStorage (Same Origin)

**Best for:** Apps on same domain/port (localhost:5500)

```javascript
// ═══════════════════════════════════════════════════════════════════
// MINIMAL INTEGRATION - Copy this to any app
// ═══════════════════════════════════════════════════════════════════

const XOR_KEY = 'smdeltart-v2-secure';

function loadApiSettings() {
    try {
        const raw = localStorage.getItem('smdeltartApiSettings');
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function decryptApiKey(encryptedKey) {
    if (!encryptedKey?.startsWith('ENC:')) return encryptedKey || '';
    try {
        const decoded = atob(encryptedKey.substring(4));
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(
                decoded.charCodeAt(i) ^ XOR_KEY.charCodeAt(i % XOR_KEY.length)
            );
        }
        return result;
    } catch {
        return '';
    }
}

function getTextApiConfig() {
    const settings = loadApiSettings();
    if (!settings) return null;
    
    // Try paid first, then free
    if (settings.paidTextApi && settings.paidTextApiKey) {
        return {
            provider: settings.paidTextApi,
            apiKey: decryptApiKey(settings.paidTextApiKey),
            tier: 'paid'
        };
    }
    if (settings.freeTextApi) {
        return {
            provider: settings.freeTextApi,
            apiKey: decryptApiKey(settings.freeTextApiKey || ''),
            tier: 'free'
        };
    }
    return null;
}

function getImageApiConfig() {
    const settings = loadApiSettings();
    if (!settings) return null;
    
    if (settings.paidImageApi && settings.paidImageApiKey) {
        return {
            provider: settings.paidImageApi,
            apiKey: decryptApiKey(settings.paidImageApiKey),
            tier: 'paid'
        };
    }
    if (settings.freeImageApi) {
        return {
            provider: settings.freeImageApi,
            apiKey: decryptApiKey(settings.freeImageApiKey || ''),
            tier: 'free'
        };
    }
    return null;
}
```

### Method 2: Iframe Popup (Cross-Origin)

**Best for:** Apps on different ports/domains

```html
<!-- Include popup library -->
<script src="/path/to/smart-popup-library.js"></script>

<!-- Trigger button -->
<button onclick="SmartPopup.open('api-settings')">⚙️ API Settings</button>
```

```javascript
// Or programmatically:
SmartPopup.open('api-settings', {
    onClose: () => {
        // Reload settings after user closes popup
        const newSettings = loadApiSettings();
        console.log('Settings updated:', newSettings);
    }
});
```

### Method 3: SmartWidgetSync (Advanced)

**Best for:** Real-time sync between widgets

```javascript
// Include sync library
// <script src="/shared/smart-widget-sync.js"></script>

// Initialize sync
SmartWidgetSync.init({
    appId: 'my-app',
    onSettingsChange: (newSettings) => {
        console.log('Settings changed:', newSettings);
        // Update UI, reconnect to APIs, etc.
    }
});

// Get settings with model info
const textConfig = SmartWidgetSync.getApiConfig('text');
// Returns: { provider, apiKey, model, tier }
```

### Method 4: Server Proxy (For CORS Issues)

**Best for:** Apps with Node.js backend (Images Suite, Studio)

```javascript
// server.js - Add API proxy endpoint
app.post('/api/proxy/generate', async (req, res) => {
    const { provider, apiKey, type, ...params } = req.body;
    
    // Forward to actual API
    const endpoints = {
        'openai-text': 'https://api.openai.com/v1/chat/completions',
        'openai-image': 'https://api.openai.com/v1/images/generations',
        'anthropic': 'https://api.anthropic.com/v1/messages',
        // ... etc
    };
    
    const response = await fetch(endpoints[`${provider}-${type}`] || endpoints[provider], {
        method: 'POST',
        headers: buildHeaders(provider, apiKey),
        body: JSON.stringify(params)
    });
    
    const data = await response.json();
    res.json(data);
});

// Client-side (no CORS issues)
async function generateWithProxy(type, params) {
    const config = type === 'text' ? getTextApiConfig() : getImageApiConfig();
    
    const response = await fetch('/api/proxy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            provider: config.provider,
            apiKey: config.apiKey,
            type,
            ...params
        })
    });
    
    return response.json();
}
```

---

## 📚 Shared Library Reference

### File: `widgets/shared/smart-app-binding.js`

**Purpose:** Security layer for API key access

```javascript
// Key methods:
SmartAppBinding.isAuthorizedApp()      // Check if current app can access keys
SmartAppBinding.getAccessToken()        // Get time-limited access token
SmartAppBinding.validateToken(token)    // Validate access token
SmartAppBinding.getAuthorizedApps()     // List all authorized apps
```

**Authorized Apps:**
| App ID | Paths | Permissions |
|--------|-------|-------------|
| clipboard-manager | /clipboard-manager.html | read, write |
| api-settings | /api-settings.html | read, write, admin |
| streaming-studio | /studio, /app | read |
| images-suite | /index.html, /viewer | read |
| cloudinary-manager | /cloudinary-manager.html | read |
| portal | /index.html | read, write |

### File: `widgets/shared/smart-widget-sync.js`

**Purpose:** Cross-widget settings synchronization

```javascript
// Key methods:
SmartWidgetSync.init(options)           // Initialize sync
SmartWidgetSync.getApiConfig(category)  // Get config for text/image/video/tts
SmartWidgetSync.getModel(category, provider)  // Get model for provider
SmartWidgetSync.saveSettings(settings)  // Save settings
SmartWidgetSync.onSettingsChange(cb)    // Subscribe to changes
```

### File: `widgets/shared/smart-popup-library.js`

**Purpose:** Iframe popup management

```javascript
// Key methods:
SmartPopup.open(widgetId, options)      // Open widget in popup
SmartPopup.close()                       // Close current popup
SmartPopup.isOpen()                      // Check if popup is open

// Widget IDs:
// 'api-settings' - API Settings panel
// 'clipboard-manager' - Clipboard Manager
// 'cloudinary-manager' - Cloudinary Manager
```

---

## 📋 Integration Checklist

### For Any New App

```
□ 1. Add to SmartAppBinding.AUTHORIZED_APPS in smart-app-binding.js
□ 2. Include shared libraries:
     □ smart-app-binding.js (if using security)
     □ smart-popup-library.js (for API settings popup)
□ 3. Implement loadApiSettings() and decryptApiKey()
□ 4. Add API Settings button/trigger
□ 5. Implement fallback: WebSim → Paid API → Free API
□ 6. Handle "no API configured" error gracefully
□ 7. Test with encrypted keys (ENC: prefix)
□ 8. Test free providers without keys (ollama, pollinations)
```

### For Server-Side Apps (Next.js, Express)

```
□ All of the above, plus:
□ Add /api/proxy endpoint for CORS
□ Never expose API keys in client-side code
□ Use environment variables for server-side keys
□ Implement rate limiting on proxy endpoints
```

---

## 🎯 Quick Reference: Provider IDs

### Text
`openai` `anthropic` `google` `groq` `deepseek` `xai` `mistral` `together-ai` `fireworks-ai` `sambanova` `cerebras` `cohere` `huggingface` `ollama`

### Image
`openai-dalle` `openai` `stable-diffusion` `stability` `replicate` `huggingface` `huggingface-image` `getimg-ai` `pollinations`

### Video
`openai-sora` `runway-gen3` `runway-i2v` `luma-dream` `kling-ai` `pika-labs` `replicate-video` `fal-video` `huggingface-video` `hf-spaces` `no-key-demo`

### TTS
`browser` `speechsynthesis` `openai-tts` `elevenlabs` `google-tts` `azure-tts` `amazon-polly` `playht` `edge-tts` `coqui-tts`

### STT (Speech-to-Text) ⭐ NEW
`browser-speech` `openai-whisper` `gpt-4o-transcribe` `groq-whisper` `deepgram` `assemblyai` `google-speech` `azure-speech` `elevenlabs-scribe`

### Audio/SFX Generation ⭐ NEW
`elevenlabs-sfx` `stability-audio` `replicate-musicgen` `huggingface-audiocraft`

---

## 🔗 Streaming Studio Integration Notes

### Adding STT (Voice Input) to Streaming Studio

```javascript
// Use Groq Whisper for FREE transcription
async function transcribeAudio(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.webm');
    formData.append('model', 'whisper-large-v3');
    
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqApiKey}` },
        body: formData
    });
    
    return (await response.json()).text;
}
```

### Adding Audio SFX to Streaming Studio

```javascript
// Use ElevenLabs for sound effects
async function generateSoundEffect(prompt) {
    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
        method: 'POST',
        headers: {
            'xi-api-key': elevenLabsKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            text: prompt,
            duration_seconds: 5
        })
    });
    
    return URL.createObjectURL(await response.blob());
}
```

---

*SmΔrt Collection - AI Integration Architecture v2.0.0*
