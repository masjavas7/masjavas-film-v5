/*
MASJAVAS Production TTS Service
Stack: Node.js + Express + TypeScript
Provider: Gemini / Google AI Studio TTS via generateContent

Install:
  npm i express zod dotenv lru-cache p-limit crypto-js
  npm i -D typescript ts-node-dev @types/express @types/node

.env:
  GEMINI_API_KEY=your_google_ai_studio_api_key
  GEMINI_TTS_BASE_URL=https://generativelanguage.googleapis.com
  GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview
  GEMINI_TTS_FALLBACK_MODEL=gemini-2.5-flash-preview-tts
  TTS_CACHE_DIR=./storage/tts-cache
  TTS_MAX_TEXT_CHARS=6000
  TTS_RATE_LIMIT_PER_MINUTE=30
*/

import express, { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { z } from "zod";
import dotenv from "dotenv";
import pLimit from "p-limit";

dotenv.config();

// =====================================================
// Config
// =====================================================

const CONFIG = {
  port: Number(process.env.PORT || 5050),
  apiKey: process.env.GEMINI_API_KEY || "",
  baseUrl: process.env.GEMINI_TTS_BASE_URL || "https://generativelanguage.googleapis.com",
  defaultModel: process.env.GEMINI_TTS_MODEL || "gemini-3.1-flash-tts-preview",
  fallbackModel: process.env.GEMINI_TTS_FALLBACK_MODEL || "gemini-2.5-flash-preview-tts",
  cacheDir: process.env.TTS_CACHE_DIR || path.resolve(process.cwd(), "storage/tts-cache"),
  maxTextChars: Number(process.env.TTS_MAX_TEXT_CHARS || 6000),
  requestTimeoutMs: Number(process.env.TTS_TIMEOUT_MS || 90_000),
};

if (!CONFIG.apiKey) {
  console.warn("[TTS] GEMINI_API_KEY is missing. Service will fail until configured.");
}

fs.mkdirSync(CONFIG.cacheDir, { recursive: true });

// =====================================================
// Request schema
// =====================================================

const TtsRequestSchema = z.object({
  text: z.string().min(1).max(CONFIG.maxTextChars),
  voiceName: z.string().min(1).max(80).default("Kore"),
  model: z.string().min(1).max(120).optional(),
  stylePrompt: z.string().max(800).optional(),
  format: z.enum(["wav", "raw-base64"]).default("wav"),
  cache: z.boolean().default(true),
  filename: z.string().regex(/^[a-zA-Z0-9._-]+$/).optional(),
});

type TtsRequest = z.infer<typeof TtsRequestSchema>;

// =====================================================
// Helpers
// =====================================================

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function safeJoin(base: string, file: string): string {
  const resolved = path.resolve(base, file);
  if (!resolved.startsWith(path.resolve(base))) {
    throw new Error("Invalid file path");
  }
  return resolved;
}

function buildCacheKey(payload: TtsRequest): string {
  return sha256(JSON.stringify({
    text: payload.text,
    voiceName: payload.voiceName,
    model: payload.model || CONFIG.defaultModel,
    stylePrompt: payload.stylePrompt || "",
    format: payload.format,
  }));
}

function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16): Buffer {
  const byteRate = sampleRate * channels * bitsPerSample / 8;
  const blockAlign = channels * bitsPerSample / 8;
  const wavHeader = Buffer.alloc(44);

  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(36 + pcmBuffer.length, 4);
  wavHeader.write("WAVE", 8);
  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16);
  wavHeader.writeUInt16LE(1, 20);
  wavHeader.writeUInt16LE(channels, 22);
  wavHeader.writeUInt32LE(sampleRate, 24);
  wavHeader.writeUInt32LE(byteRate, 28);
  wavHeader.writeUInt16LE(blockAlign, 32);
  wavHeader.writeUInt16LE(bitsPerSample, 34);
  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(pcmBuffer.length, 40);

  return Buffer.concat([wavHeader, pcmBuffer]);
}

function extractBase64Audio(geminiResponse: any): string {
  const parts = geminiResponse?.candidates?.[0]?.content?.parts || [];

  for (const part of parts) {
    const inlineData = part.inlineData || part.inline_data;
    if (inlineData?.data) return inlineData.data;
  }

  throw new Error("Gemini response did not contain audio inlineData.data");
}

function makePrompt(text: string, stylePrompt?: string): string {
  const cleanStyle = stylePrompt?.trim();
  if (!cleanStyle) return text;

  return `${cleanStyle}\n\nBacakan teks berikut secara natural dan profesional, tanpa menambah atau mengurangi isi:\n${text}`;
}

// =====================================================
// Gemini TTS Client
// =====================================================

class GeminiTtsClient {
  private limit = pLimit(3);

  async synthesize(payload: TtsRequest): Promise<{ audio: Buffer; mimeType: string; model: string }> {
    const primaryModel = payload.model || CONFIG.defaultModel;

    try {
      return await this.limit(() => this.callGemini(primaryModel, payload));
    } catch (primaryError: any) {
      console.error("[TTS] Primary model failed:", primaryError.message);
      if (primaryModel === CONFIG.fallbackModel) throw primaryError;
      return await this.limit(() => this.callGemini(CONFIG.fallbackModel, payload));
    }
  }

  private async callGemini(model: string, payload: TtsRequest): Promise<{ audio: Buffer; mimeType: string; model: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);

    const url = `${CONFIG.baseUrl}/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(CONFIG.apiKey)}`;

    const body = {
      contents: [
        {
          parts: [
            { text: makePrompt(payload.text, payload.stylePrompt) }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: payload.voiceName
            }
          }
        }
      }
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        const message = json?.error?.message || `Gemini HTTP ${response.status}`;
        throw new Error(message);
      }

      const audioBase64 = extractBase64Audio(json);
      const rawAudio = Buffer.from(audioBase64, "base64");

      // Gemini TTS commonly returns raw PCM/L16. Wrap it as WAV for easier playback.
      const wav = payload.format === "wav" ? pcmToWav(rawAudio) : rawAudio;

      return {
        audio: wav,
        mimeType: payload.format === "wav" ? "audio/wav" : "application/octet-stream",
        model,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}

const ttsClient = new GeminiTtsClient();

// =====================================================
// Minimal in-memory rate limiter
// Replace with Redis in multi-instance production.
// =====================================================

const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || "unknown";
  const now = Date.now();
  const limit = Number(process.env.TTS_RATE_LIMIT_PER_MINUTE || 30);
  const bucket = buckets.get(ip) || { count: 0, resetAt: now + 60_000 };

  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + 60_000;
  }

  bucket.count += 1;
  buckets.set(ip, bucket);

  if (bucket.count > limit) {
    return res.status(429).json({
      success: false,
      error: "RATE_LIMITED",
      message: "Terlalu banyak request TTS. Coba lagi sebentar.",
    });
  }

  next();
}

// =====================================================
// Express App
// =====================================================

const app = express();
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    service: "MASJAVAS TTS Service",
    provider: "Gemini / Google AI Studio",
    defaultModel: CONFIG.defaultModel,
    fallbackModel: CONFIG.fallbackModel,
  });
});

app.post("/api/tts", rateLimit, async (req: Request, res: Response) => {
  try {
    const payload = TtsRequestSchema.parse(req.body);
    const cacheKey = buildCacheKey(payload);
    const extension = payload.format === "wav" ? "wav" : "bin";
    const outputName = payload.filename || `${cacheKey}.${extension}`;
    const outputPath = safeJoin(CONFIG.cacheDir, outputName);

    if (payload.cache && fs.existsSync(outputPath)) {
      res.setHeader("X-TTS-Cache", "HIT");
      res.setHeader("Content-Type", payload.format === "wav" ? "audio/wav" : "application/octet-stream");
      res.setHeader("Content-Disposition", `inline; filename=\"${outputName}\"`);
      return fs.createReadStream(outputPath).pipe(res);
    }

    const result = await ttsClient.synthesize(payload);

    if (payload.cache) {
      fs.writeFileSync(outputPath, result.audio);
    }

    res.setHeader("X-TTS-Cache", "MISS");
    res.setHeader("X-TTS-Model", result.model);
    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("Content-Disposition", `inline; filename=\"${outputName}\"`);

    return res.send(result.audio);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "VALIDATION_ERROR",
        details: error.flatten(),
      });
    }

    console.error("[TTS] Error:", error);

    return res.status(500).json({
      success: false,
      error: "TTS_FAILED",
      message: error.message || "Gagal membuat audio TTS.",
    });
  }
});

app.post("/api/tts/json", rateLimit, async (req: Request, res: Response) => {
  try {
    const payload = TtsRequestSchema.parse({ ...req.body, format: "wav" });
    const result = await ttsClient.synthesize(payload);

    return res.json({
      success: true,
      model: result.model,
      mimeType: result.mimeType,
      audioBase64: result.audio.toString("base64"),
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "TTS_JSON_FAILED",
      message: error.message || "Gagal membuat audio TTS JSON.",
    });
  }
});

app.listen(CONFIG.port, () => {
  console.log(`[TTS] MASJAVAS TTS Service running on http://localhost:${CONFIG.port}`);
});

// =====================================================
// Frontend usage example
// =====================================================

/*
async function generateTts() {
  const response = await fetch("http://localhost:5050/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: "Di balik sunyinya malam, sebuah kerajaan tua menyimpan rahasia besar.",
      voiceName: "Kore",
      stylePrompt: "Voice over cinematic Indonesia, tenang, mahal, berwibawa, tidak terdengar seperti robot.",
      cache: true
    })
  });

  if (!response.ok) throw new Error("TTS gagal");

  const blob = await response.blob();
  const audioUrl = URL.createObjectURL(blob);
  const audio = new Audio(audioUrl);
  audio.play();
}
*/
