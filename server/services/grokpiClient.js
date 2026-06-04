import fs from 'fs';
import path from 'path';
import { config } from '../config/env.js';
import { AppError } from '../utils/safeError.js';
import { validateImagePreflight } from './imagePreflightValidator.js';
import { getRuntimePaths } from '../utils/runtimePaths.js';
import { settingsService } from './settingsService.js';

import { logToBackendFile } from '../utils/logger.js';

/**
 * Base HTTP request to GrokPI API with secure authorization
 * @param {string} path API Endpoint path (e.g. /v1/chat/completions)
 * @param {object} options fetch options
 * @returns {Promise<any>}
 */
async function request(path, options = {}) {
  const settings = settingsService.getSettings();
  let baseUrl = settings.apiBaseUrl.replace(/\/$/, '');
  if (baseUrl.endsWith('/v1')) {
    baseUrl = baseUrl.slice(0, -3);
  }
  const url = `${baseUrl}${path}`;

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${settings.apiKey}`,
    ...(options.headers || {})
  };

  const timeoutMs = options.timeout || 60000; // 60 seconds default timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errCode = 'server_error';
      let errMessage = 'Terjadi kesalahan pada AI provider.';
      
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          errCode = errJson.error.code || errCode;
          errMessage = errJson.error.message || errMessage;
        }
      } catch (e) {
        // Response was not JSON
      }

      console.error(`[GrokPI client Error] status=${response.status} path=${path} code=${errCode} rawMessage=${errMessage}`);
      logToBackendFile(`[GrokPI client Error] status=${response.status} path=${path} code=${errCode} rawMessage=${errMessage}`);

      // Map upstream errors to clean client messages without leaking credentials
      if (response.status === 401 || response.status === 403) {
        throw new AppError('Akses AI provider tidak sah atau dinonaktifkan.', response.status);
      } else if (response.status === 429) {
        if (errCode === 'daily_limit_exceeded') {
          throw new AppError('Kuota harian pembuatan AI sudah habis. Coba lagi besok.', 429);
        }
        throw new AppError('Permintaan terlalu cepat. Harap tunggu beberapa saat.', 429);
      } else {
        throw new AppError('Gagal memproses permintaan AI. Coba beberapa saat lagi.', response.status);
      }
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      console.error(`[GrokPI client Timeout] path=${path} duration=${timeoutMs}ms`);
      logToBackendFile(`[GrokPI client Timeout] path=${path} duration=${timeoutMs}ms error=${error.message}`);
      throw new AppError('Koneksi ke AI provider timeout.', 504);
    }
    if (error instanceof AppError) {
      throw error;
    }

    console.error(`[GrokPI client Connection Error] path=${path} message=${error.message}`);
    logToBackendFile(`[GrokPI client Connection Error] path=${path} message=${error.message}`);
    throw new AppError('Gagal menghubungi AI provider.', 502);
  }
}

/**
 * Sends a chat completion request to GrokPI
 * @param {Array<object>} messages array of { role, content }
 * @param {object} [options] optional overrides (model, temperature, etc)
 * @returns {Promise<object>} OpenAI-compatible response object
 */
export async function grokpiChatCompletion(messages, options = {}) {
  const model = options.model || 'grok-4.1-expert';
  const temperature = options.temperature !== undefined ? options.temperature : 0.7;
  const reasoning_effort = options.reasoning_effort || 'medium';

  const body = {
    model,
    messages,
    temperature,
    reasoning_effort,
    stream: false
  };

  return request('/v1/chat/completions', {
    method: 'POST',
    body,
    timeout: options.timeout || 90000 // Chat planning might take longer
  });
}

/**
 * Sends an image generation request to GrokPI using grok-imagine-1.0
 * @param {string} prompt prompt text
 * @param {object} [options] config options (size, n)
 * @returns {Promise<object>} image response object
 */
export async function grokpiImageGeneration(prompt, options = {}) {
  const model = options.model || 'grok-imagine-1.0';
  const size = options.size || '1024x1024';

  const body = {
    model,
    messages: [
      {
        role: 'user',
        content: prompt
      }
    ],
    image_config: {
      n: 1,
      size,
      response_format: 'b64_json'
    },
    stream: false
  };

  return request('/v1/chat/completions', {
    method: 'POST',
    body,
    timeout: 120000  // Grok Imagine can take 20-90 seconds
  });
}

/**
 * Checks if a URL points to a local or internal host.
 * Cloud APIs cannot resolve localhost/internal hosts and reject them with a 400 error.
 * @param {string} urlStr
 * @returns {boolean}
 */
export function isLocalUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('192.168.') ||
      host.startsWith('10.') ||
      host.startsWith('172.16.') ||
      host.startsWith('172.17.') ||
      host.startsWith('172.18.') ||
      host.startsWith('172.19.') ||
      host.startsWith('172.20.') ||
      host.startsWith('172.21.') ||
      host.startsWith('172.22.') ||
      host.startsWith('172.23.') ||
      host.startsWith('172.24.') ||
      host.startsWith('172.25.') ||
      host.startsWith('172.26.') ||
      host.startsWith('172.27.') ||
      host.startsWith('172.28.') ||
      host.startsWith('172.29.') ||
      host.startsWith('172.30.') ||
      host.startsWith('172.31.') ||
      host.endsWith('.local')
    );
  } catch (e) {
    return false;
  }
}

/**
 * Resolves a local server URL (uploads or exports) to its absolute file path in the workspace.
 * @param {string} urlStr - The localhost URL string
 * @returns {string|null} The absolute local file path, or null if not resolvable
 */
export function resolveLocalPath(urlStr) {
  try {
    const url = new URL(urlStr);
    const pathname = url.pathname;
    
    // Check if it's an uploads file
    if (pathname.includes('/uploads/')) {
      const parts = pathname.split('/uploads/');
      const fileName = parts[parts.length - 1];
      return path.join(getRuntimePaths().uploadsDir, fileName);
    }
    
    // Check if it's an exports file
    if (pathname.includes('/exports/')) {
      const parts = pathname.split('/exports/');
      const fileName = parts[parts.length - 1];
      return path.join(getRuntimePaths().exportsDir, fileName);
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Reads a local file from disk and encodes it into a base64 Data URL.
 * @param {string} filePath - Absolute path to the file
 * @returns {Promise<string|null>} The base64 data URL, or null if failed
 */
export async function convertFileToBase64DataUrl(filePath, mimeType = null) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`[GrokPI client] File does not exist at local path: ${filePath}`);
      return null;
    }
    const data = await fs.promises.readFile(filePath);
    
    let finalMime = mimeType;
    if (!finalMime) {
      const ext = path.extname(filePath).toLowerCase();
      finalMime = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') {
        finalMime = 'image/jpeg';
      } else if (ext === '.gif') {
        finalMime = 'image/gif';
      } else if (ext === '.webp') {
        finalMime = 'image/webp';
      }
    }
    
    const base64 = data.toString('base64');
    return `data:${finalMime};base64,${base64}`;
  } catch (err) {
    console.error(`[GrokPI client] Failed to convert local file ${filePath} to base64:`, err.message);
    return null;
  }
}

/**
 * Resolves a list of reference images, converting local localhost URLs to base64 data URLs.
 * If conversion fails, skips the image gracefully to avoid provider crash.
 * @param {Array} referenceImages - Array of reference image objects
 * @returns {Promise<object>} Conversion results and counts
 */
export async function resolveAndConvertReferences(referenceImages) {
  let preflightPassCount = 0;
  let preflightFailCount = 0;
  let resizedCount = 0;
  let convertedBase64Count = 0;
  let skippedLocalCount = 0;
  let imageUrlCountSent = 0;
  let imageUrlSource = 'public_url';

  const processedReferenceImages = [];

  for (const ref of referenceImages) {
    if (!ref || !ref.imageUrl) continue;

    // Detect if already a base64 data URL
    if (ref.imageUrl.startsWith('data:image/')) {
      processedReferenceImages.push(ref);
      convertedBase64Count++;
      imageUrlCountSent++;
      continue;
    }

    if (isLocalUrl(ref.imageUrl)) {
      const localPath = resolveLocalPath(ref.imageUrl);
      if (localPath) {
        // Run preflight validation
        const preflight = validateImagePreflight(localPath);
        if (preflight.passed) {
          preflightPassCount++;
          if (preflight.wasResized) {
            resizedCount++;
          }
          
          const base64DataUrl = await convertFileToBase64DataUrl(localPath, preflight.mime);
          if (base64DataUrl) {
            processedReferenceImages.push({
              ...ref,
              imageUrl: base64DataUrl
            });
            convertedBase64Count++;
            imageUrlCountSent++;
          } else {
            console.warn(`[GrokPI client] Local image conversion failed, skipping: ${ref.imageUrl}`);
            skippedLocalCount++;
          }
        } else {
          console.warn(`[GrokPI client] Preflight failed for local image, skipping: ${ref.imageUrl}. Error: ${preflight.error}`);
          preflightFailCount++;
          skippedLocalCount++;
        }
      } else {
        console.warn(`[GrokPI client] Could not resolve local path for: ${ref.imageUrl}`);
        skippedLocalCount++;
      }
    } else {
      processedReferenceImages.push(ref);
      imageUrlCountSent++;
    }
  }

  if (convertedBase64Count > 0) {
    imageUrlSource = 'base64_data_url';
  } else if (skippedLocalCount > 0 && imageUrlCountSent === 0) {
    imageUrlSource = 'skipped_local_url';
  }

  return {
    processedReferenceImages,
    preflightPassCount,
    preflightFailCount,
    resizedCount,
    convertedBase64Count,
    skippedLocalCount,
    imageUrlCountSent,
    imageUrlSource
  };
}

/**
 * Submits an asynchronous video generation job to GrokPI.
 * 
 * GrokPI native image-to-video: the FIRST image_url block in messages
 * is used as the reference_image by the server (see api.md §8.5).
 * 
 * Priority order for first image (most important reference):
 *   1. heroFrame (storyboard structure lock)
 *   2. character_identity (face/wardrobe lock)
 *   3. environment_lock (location/mood lock)
 *   4. storyboard_structure (beat/framing lock)
 *   5. manual_user_reference
 *
 * @param {string} prompt Full video prompt from ScenePromptPackage pipeline
 * @param {object} videoConfig video configuration + referenceImages[]
 * @param {object} [options] optional arguments
 * @returns {Promise<object>} initial job registration info { jobId, status }
 */
export async function grokpiVideoGeneration(prompt, videoConfig, options = {}) {
  const model = options.model || 'grok-imagine-1.0-video';
  const aspect_ratio = videoConfig.aspect_ratio || '16:9';
  const video_length = videoConfig.video_length || 10;
  const resolution_name = videoConfig.resolution_name || '480p';
  const referenceImages = videoConfig.referenceImages || [];

  // 1. Resolve local loopback URLs to base64 data URLs
  const {
    processedReferenceImages,
    preflightPassCount,
    preflightFailCount,
    resizedCount,
    convertedBase64Count,
    skippedLocalCount,
    imageUrlCountSent,
    imageUrlSource
  } = await resolveAndConvertReferences(referenceImages);

  // Build multimodal content blocks per GrokPI api.md §6.2B
  // Text prompt first, then image_url blocks ordered by priority
  const contentParts = [
    { type: 'text', text: prompt }
  ];

  if (processedReferenceImages.length > 0) {
    // Sort by priority: heroFrame (storyboard_structure with highest weight) first,
    // then character, environment, other storyboard, manual
    const ROLE_PRIORITY = {
      'storyboard_structure': 1,  // heroFrame gets highest weight (0.35)
      'character_identity': 2,
      'environment_lock': 3,
      'prop_lock': 4,
      'creature_lock': 5,
      'manual_user_reference': 6
    };

    const sortedRefs = [...processedReferenceImages]
      .filter(ref => ref.imageUrl)
      .sort((a, b) => {
        // Primary sort: role priority (heroFrame/storyboard first)
        const priorityA = ROLE_PRIORITY[a.role] || 99;
        const priorityB = ROLE_PRIORITY[b.role] || 99;
        if (priorityA !== priorityB) return priorityA - priorityB;
        // Secondary sort: weight descending (heroFrame has 0.35, panels have 0.15)
        return (b.weight || 0) - (a.weight || 0);
      });

    // Limit payload to max 8 images (default ranking priority)
    const finalRefs = sortedRefs.slice(0, 8);

    // GrokPI uses FIRST image_url as the primary reference_image (api.md §8.5)
    // Include all available refs — provider will use first as primary, rest as context
    let sentCount = 0;
    
    for (const ref of finalRefs) {
      contentParts.push({
        type: 'image_url',
        image_url: { url: ref.imageUrl }
      });
      sentCount++;
    }

    // Output target logs as requested by the user
    console.log(`[SceneVideo] native image-to-video enabled`);
    console.log(`[SceneVideo] referenceImages resolved count=${referenceImages.length}`);
    console.log(`[SceneVideo] image preflight pass count=${preflightPassCount}`);
    console.log(`[SceneVideo] image preflight fail count=${preflightFailCount}`);
    console.log(`[SceneVideo] resized count=${resizedCount}`);
    console.log(`[SceneVideo] base64 converted count=${convertedBase64Count}`);
    console.log(`[SceneVideo] sent image count=${finalRefs.length}`);
    console.log(`[SceneVideo] skipped image count=${skippedLocalCount + (sortedRefs.length - finalRefs.length)}`);
    console.log(`[SceneVideo] first image role=${finalRefs[0]?.role || 'none'}`);
    console.log(`[SceneVideo] provider payload mode=${sentCount > 0 ? 'image-to-video' : 'text-only'}`);
  } else {
    console.log(`[SceneVideo] provider payload mode=text-only`);
    console.log(`[SceneVideo] referenceImages resolved count=${referenceImages.length}`);
    console.log(`[SceneVideo] image preflight pass count=0`);
    console.log(`[SceneVideo] image preflight fail count=0`);
    console.log(`[SceneVideo] resized count=0`);
    console.log(`[SceneVideo] base64 converted count=0`);
    console.log(`[SceneVideo] sent image count=0`);
    console.log(`[SceneVideo] skipped image count=0`);
  }

  const body = {
    model,
    stream: false,
    messages: [
      {
        role: 'user',
        content: contentParts
      }
    ],
    video_config: {
      aspect_ratio,
      video_length,
      resolution_name,
      preset: 'normal'
    }
  };

  console.log(`[GrokPI Video] Submitting to /v1/video/generations (prompt ${prompt.length} chars, ${contentParts.length - 1} images, ${aspect_ratio} ${resolution_name})`);

  return request('/v1/video/generations', {
    method: 'POST',
    body,
    timeout: 120000
  });
}


/**
 * Checks the status of a submitted async video generation job
 * @param {string} jobId the registered job identifier
 * @returns {Promise<object>} status info { jobId, status, videoUrl, errorMessage, ... }
 */
export async function grokpiCheckVideoJob(jobId) {
  return request(`/v1/video/generations/${jobId}`, {
    method: 'GET',
    timeout: 15000
  });
}
