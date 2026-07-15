# 🔊 TTS Providers Audit & Implementation Guide

> **Date:** December 19, 2025  
> **Scope:** SmΔrt Collection Widgets & WebSim-linked Apps  
> **Status:** Audit Complete

---

## 📊 Executive Summary

| Category | Count | Free | Paid | Implemented in Clipboard |
|----------|-------|------|------|-------------------------|
| **Browser-based** | 2 | 2 | 0 | ✅ 1 (speechSynthesis) |
| **Free Cloud APIs** | 3 | 3 | 0 | ❌ 0 |
| **Paid Cloud APIs** | 6 | 0 | 6 | ❌ 0 |
| **Total** | 11 | 5 | 6 | 1 |

---

## 🆓 FREE TTS PROVIDERS (No API Key Required)

### 1. ✅ Web Speech API (Browser Built-in)
- **Status:** ✅ Implemented in clipboard-manager
- **Provider ID:** `browser` / `speechsynthesis`
- **Pros:** 
  - Zero cost, no API key
  - Works offline
  - Fast response
- **Cons:**
  - Voice quality varies by browser/OS
  - Limited voices
  - No audio file export (plays directly)
- **WebSim Compatible:** ✅ Yes (runs client-side)

```javascript
// Implementation (already in clipboard-manager.html)
const utterance = new SpeechSynthesisUtterance(text);
utterance.voice = speechSynthesis.getVoices().find(v => v.lang.startsWith('en'));
speechSynthesis.speak(utterance);
```

---

### 2. 🟡 Microsoft Edge TTS (Free, High Quality)
- **Status:** ❌ Not implemented
- **Provider ID:** `edge-tts`
- **API Endpoint:** Uses edge-tts Python package or unofficial API
- **Pros:**
  - High quality neural voices
  - Many languages/voices
  - Free tier generous
- **Cons:**
  - Requires proxy/server (CORS)
  - Unofficial API may change
- **WebSim Compatible:** ⚠️ Needs proxy server

```javascript
// Implementation Pattern
async function edgeTTS(text, voice = 'en-US-AriaNeural') {
    // Option 1: Use a proxy server
    const response = await fetch('YOUR_PROXY/edge-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice })
    });
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
    
    // Option 2: Use edge-tts npm package (Node.js server required)
    // npm install edge-tts
}

// Available voices (sample):
const EDGE_VOICES = [
    'en-US-AriaNeural',      // Female, US
    'en-US-GuyNeural',       // Male, US
    'en-GB-SoniaNeural',     // Female, UK
    'fr-FR-DeniseNeural',    // Female, French
    'de-DE-KatjaNeural',     // Female, German
    'es-ES-ElviraNeural',    // Female, Spanish
    'nl-NL-ColetteNeural',   // Female, Dutch
];
```

---

### 3. 🟡 Coqui TTS (Open Source)
- **Status:** ❌ Not implemented
- **Provider ID:** `coqui-tts`
- **API Endpoint:** Self-hosted or Coqui Cloud
- **Pros:**
  - Fully open source
  - Voice cloning capability
  - Can run locally
- **Cons:**
  - Requires self-hosting for production
  - Resource intensive
- **WebSim Compatible:** ⚠️ Needs server

```javascript
// Implementation (requires Coqui server running)
async function coquiTTS(text, speaker_id = 'default') {
    const response = await fetch('http://localhost:5002/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, speaker_id })
    });
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
}
```

---

### 4. 🟡 eSpeak (Lightweight)
- **Status:** ❌ Not implemented
- **Provider ID:** `espeak`
- **Pros:**
  - Very lightweight
  - Works offline
  - Many languages
- **Cons:**
  - Robotic voice quality
  - Requires native installation
- **WebSim Compatible:** ❌ No (native only)

---

## 💳 PAID TTS PROVIDERS (API Key Required)

### 5. 🟡 ElevenLabs (Best Quality)
- **Status:** ❌ Not implemented
- **Provider ID:** `elevenlabs`
- **API Endpoint:** `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}`
- **Pricing:** Free tier (10k chars/month), Pro from $5/mo
- **Key Format:** 32-char hex
- **Pros:**
  - Best voice quality
  - Voice cloning
  - Emotion control
- **Cons:**
  - Expensive at scale
  - Limited free tier
- **WebSim Compatible:** ✅ Yes (direct API)

```javascript
// Implementation
async function elevenLabsTTS(text, apiKey, voiceId = '21m00Tcm4TlvDq8ikWAM') {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
            'xi-api-key': apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text,
            model_id: 'eleven_monolingual_v1',
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.5
            }
        })
    });
    if (!response.ok) throw new Error(`ElevenLabs API failed (${response.status})`);
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
}

// Popular voice IDs:
const ELEVENLABS_VOICES = {
    'rachel': '21m00Tcm4TlvDq8ikWAM',  // Female, American
    'domi': 'AZnzlk1XvdvUeBnXmlld',    // Female, American
    'bella': 'EXAVITQu4vr4xnSDxMaL',   // Female, American
    'antoni': 'ErXwobaYiN019PkySvjV',  // Male, American
    'josh': 'TxGEqnHWrfWFTfGW9XjX',    // Male, American
    'adam': 'pNInz6obpgDQGcFmaJgB',    // Male, American Deep
};
```

---

### 6. 🟡 OpenAI TTS
- **Status:** ❌ Not implemented
- **Provider ID:** `openai-tts`
- **API Endpoint:** `https://api.openai.com/v1/audio/speech`
- **Pricing:** $15/1M chars (tts-1), $30/1M chars (tts-1-hd)
- **Key Format:** `sk-...`
- **Pros:**
  - High quality
  - Simple API
  - Same key as GPT
- **Cons:**
  - Limited voices (6)
  - No voice cloning
- **WebSim Compatible:** ✅ Yes (direct API)

```javascript
// Implementation
async function openaiTTS(text, apiKey, voice = 'alloy', model = 'tts-1') {
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,  // 'tts-1' (fast) or 'tts-1-hd' (quality)
            input: text,
            voice,  // alloy, echo, fable, onyx, nova, shimmer
            response_format: 'mp3'
        })
    });
    if (!response.ok) throw new Error(`OpenAI TTS API failed (${response.status})`);
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
}

// Available voices:
const OPENAI_TTS_VOICES = {
    'alloy': 'Neutral, balanced',
    'echo': 'Male, warm',
    'fable': 'British, storytelling',
    'onyx': 'Male, deep',
    'nova': 'Female, friendly',
    'shimmer': 'Female, soft'
};
```

---

### 7. 🟡 Azure Speech (Enterprise)
- **Status:** ❌ Not implemented
- **Provider ID:** `azure-tts`
- **API Endpoint:** `https://{region}.tts.speech.microsoft.com/cognitiveservices/v1`
- **Pricing:** Free tier (5h/month), Pay-as-you-go $4/1M chars
- **Pros:**
  - Enterprise grade
  - SSML support
  - Custom neural voices
- **Cons:**
  - Complex setup
  - Requires Azure account
- **WebSim Compatible:** ✅ Yes (direct API)

```javascript
// Implementation
async function azureTTS(text, apiKey, region = 'eastus', voice = 'en-US-AriaNeural') {
    const response = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
        },
        body: `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
            <voice name='${voice}'>${text}</voice>
        </speak>`
    });
    if (!response.ok) throw new Error(`Azure TTS API failed (${response.status})`);
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
}
```

---

### 8. 🟡 Google Cloud TTS
- **Status:** ❌ Not implemented
- **Provider ID:** `google-tts`
- **API Endpoint:** `https://texttospeech.googleapis.com/v1/text:synthesize`
- **Pricing:** Free tier (4M chars/month), Standard $4/1M, WaveNet $16/1M
- **Pros:**
  - WaveNet quality
  - SSML support
  - Many languages
- **Cons:**
  - Complex authentication
  - Requires GCP account
- **WebSim Compatible:** ✅ Yes (with API key)

```javascript
// Implementation
async function googleTTS(text, apiKey, voice = 'en-US-Neural2-F') {
    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            input: { text },
            voice: {
                languageCode: 'en-US',
                name: voice
            },
            audioConfig: { audioEncoding: 'MP3' }
        })
    });
    if (!response.ok) throw new Error(`Google TTS API failed (${response.status})`);
    const data = await response.json();
    // Google returns base64 encoded audio
    return `data:audio/mp3;base64,${data.audioContent}`;
}
```

---

### 9. 🟡 Amazon Polly
- **Status:** ❌ Not implemented
- **Provider ID:** `amazon-polly`
- **Pricing:** Free tier (5M chars/month for 12 months), then $4/1M
- **Pros:**
  - Neural voices
  - SSML support
  - Reliable
- **Cons:**
  - Complex AWS auth (Signature V4)
  - Requires AWS account
- **WebSim Compatible:** ⚠️ Complex (needs AWS SDK or proxy)

---

### 10. 🟡 Play.ht (Voice Cloning)
- **Status:** ❌ Not implemented
- **Provider ID:** `playht`
- **API Endpoint:** `https://api.play.ht/api/v2/tts`
- **Pricing:** Free tier limited, Pro from $31/mo
- **Pros:**
  - Ultra-realistic voices
  - Voice cloning
  - API-first design
- **Cons:**
  - Expensive
  - Async generation
- **WebSim Compatible:** ✅ Yes (direct API)

```javascript
// Implementation
async function playhtTTS(text, apiKey, userId, voice = 's3://voice-cloning-zero-shot/...') {
    const response = await fetch('https://api.play.ht/api/v2/tts', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-User-ID': userId,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text,
            voice,
            output_format: 'mp3',
            voice_engine: 'PlayHT2.0'
        })
    });
    // Play.ht returns streaming or URL
    const data = await response.json();
    return data.url;
}
```

---

## 🌐 WebSim Compatibility Matrix

| Provider | Works in WebSim | CORS Issues | Needs Proxy | Notes |
|----------|-----------------|-------------|-------------|-------|
| Browser speechSynthesis | ✅ Yes | ❌ No | ❌ No | Best for WebSim |
| Edge TTS | ⚠️ Partial | ✅ Yes | ✅ Yes | Need server |
| Coqui TTS | ⚠️ Partial | ✅ Yes | ✅ Yes | Self-hosted |
| ElevenLabs | ✅ Yes | ❌ No | ❌ No | Direct API ✅ |
| OpenAI TTS | ✅ Yes | ❌ No | ❌ No | Direct API ✅ |
| Azure TTS | ✅ Yes | ❌ No | ❌ No | Direct API ✅ |
| Google TTS | ✅ Yes | ❌ No | ❌ No | With API key |
| Amazon Polly | ⚠️ Complex | - | ✅ Yes | AWS SDK needed |
| Play.ht | ✅ Yes | ❌ No | ❌ No | Direct API ✅ |

---

## 🎯 Recommended Implementation Priority

### For clipboard-manager.html (Immediate)

1. **OpenAI TTS** - Uses same `sk-` key as text generation
2. **ElevenLabs** - Best quality, simple API
3. **Edge TTS via proxy** - Free, high quality

### For WebSim Apps (Best Compatibility)

1. **Browser speechSynthesis** - Already works, zero setup
2. **OpenAI TTS** - Direct API, no CORS
3. **ElevenLabs** - Direct API, best quality

---

## 📋 Implementation Checklist for clipboard-manager.html

```
[ ] Add TTS provider config object (like text/image)
[ ] Add fetchTTSExternal() function
[ ] Implement OpenAI TTS
[ ] Implement ElevenLabs TTS  
[ ] Read TTS settings from api-settings
[ ] Add audio download button
[ ] Update pipeline to try: Browser → Paid API → Free API
[ ] Test all providers
```

---

## 🔧 Unified TTS Function (Ready to Implement)

```javascript
// Add this to clipboard-manager.html
async function fetchTTSExternal({ provider, apiKey, text, voice, model }) {
    console.log(`🔊 Calling ${provider} TTS API...`);
    
    const providerConfigs = {
        'openai-tts': {
            url: 'https://api.openai.com/v1/audio/speech',
            auth: 'bearer',
            body: (text, voice, model) => ({
                model: model || 'tts-1',
                input: text,
                voice: voice || 'alloy',
                response_format: 'mp3'
            }),
            responseType: 'blob'
        },
        'elevenlabs': {
            url: (voice) => `https://api.elevenlabs.io/v1/text-to-speech/${voice || '21m00Tcm4TlvDq8ikWAM'}`,
            auth: 'xi-api-key',
            body: (text) => ({
                text,
                model_id: 'eleven_monolingual_v1',
                voice_settings: { stability: 0.5, similarity_boost: 0.5 }
            }),
            responseType: 'blob'
        },
        'google-tts': {
            url: (_, apiKey) => `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
            auth: 'none',
            body: (text, voice) => ({
                input: { text },
                voice: { languageCode: 'en-US', name: voice || 'en-US-Neural2-F' },
                audioConfig: { audioEncoding: 'MP3' }
            }),
            responseType: 'json',
            parseResponse: (data) => `data:audio/mp3;base64,${data.audioContent}`
        }
    };
    
    const config = providerConfigs[provider];
    if (!config) {
        throw new Error(`TTS provider '${provider}' not implemented`);
    }
    
    const url = typeof config.url === 'function' ? config.url(voice, apiKey) : config.url;
    const headers = { 'Content-Type': 'application/json' };
    
    if (config.auth === 'bearer') {
        headers['Authorization'] = `Bearer ${apiKey}`;
    } else if (config.auth === 'xi-api-key') {
        headers['xi-api-key'] = apiKey;
    }
    
    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(config.body(text, voice, model))
    });
    
    if (!response.ok) {
        const err = await response.text().catch(() => '');
        throw new Error(`${provider} TTS failed (${response.status}): ${err}`);
    }
    
    if (config.responseType === 'blob') {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } else {
        const data = await response.json();
        return config.parseResponse(data);
    }
}
```

---

## 📁 Files to Update

| File | Changes Needed |
|------|---------------|
| `clipboard-manager.html` | Add `fetchTTSExternal()`, update `handleGenerateSpeech()` |
| `api-settings.html` | Already has TTS UI ✅ |
| `shared/smart-widget-sync.js` | May need TTS settings sync |

---

## 📝 Notes

- **WebSim fallback:** Always keep browser speechSynthesis as fallback
- **Audio export:** Paid APIs return audio blobs that can be downloaded
- **Voice selection:** Map api-settings voices to provider-specific voice IDs
- **Cost awareness:** Show estimated cost for paid TTS in UI

---

*Generated by SmΔrt Collection Audit System*
