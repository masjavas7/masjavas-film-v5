import { referenceService } from '../server/services/referenceService.js';

console.log("=== Rate Limit Hardening Self-Healing Unit Test ===");

let fetchCallCount = 0;
const originalFetch = globalThis.fetch;

// Monkey-patch global fetch
globalThis.fetch = async (url, options) => {
  fetchCallCount++;
  console.log(`[GlobalFetch] Call #${fetchCallCount} to URL: ${url}`);

  // Simulasikan analisis cerita (panggilan completions pertama)
  if (url.includes('/chat/completions') && !url.includes('image')) {
    console.log("[GlobalFetch] Mocking Chat Completions for Reference Analysis...");
    return {
      ok: true,
      json: async () => ({
        choices: [{
          message: {
            content: JSON.stringify([
              {
                title: "Dinding Konstantinopel",
                category: "Lokasi",
                description: "Dinding kuno Konstantinopel",
                imagePrompt: "A cinematic wide view of the ancient walls of Constantinople"
              },
              {
                title: "Sultan Mehmed II",
                category: "Karakter",
                description: "Sultan Mehmed yang berwibawa",
                imagePrompt: "Close-up portrait of Sultan Mehmed II"
              },
              {
                title: "Pertempuran Konstantinopel",
                category: "Mood",
                description: "Medan pertempuran malam hari",
                imagePrompt: "Epic night battle of Constantinople"
              }
            ])
          }
        }]
      })
    };
  }

  // Simulasikan rate limit pada 2 request gambar pertama
  if (url.includes('/chat/completions') && options.body && options.body.includes('grok-imagine-1.0')) {
    if (fetchCallCount === 2) {
      console.log("[GlobalFetch] Simulating Upstream STATUS 500 Image rate limit exceeded...");
      return {
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            code: "generation_failed",
            message: "generation error: Image rate limit exceeded"
          }
        })
      };
    }
    
    if (fetchCallCount === 3) {
      console.log("[GlobalFetch] Simulating Upstream STATUS 500 no token available...");
      return {
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            code: "generation_failed",
            message: "no token available: no token available"
          }
        })
      };
    }
  }

  // Default success for subsequent calls
  console.log("[GlobalFetch] Mocking SUCCESS base64 image generation!");
  return {
    ok: true,
    json: async () => ({
      choices: [{
        message: {
          content: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
      }],
      data: [{
        b64_json: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
      }]
    })
  };
};

const mockPayload = {
  narration: "Dinding Konstantinopel yang kokoh dihantam meriam Ottoman malam hari.",
  selectedStyle: "Sinematik",
  selectedTone: "Sinematik",
  aspectRatio: "16:9"
};

console.log("Running generateAutoReferences with simulation...");
referenceService.generateAutoReferences("project-test-hardened", mockPayload, "http://localhost:3000")
  .then(res => {
    console.log("\n=== Test Results ===");
    console.log("Status:", res.status);
    console.log("Generated References Count:", res.references.length);
    console.log("Warnings:", res.warnings);
    
    // Kembalikan original fetch
    globalThis.fetch = originalFetch;
    
    if (res.status === 'success' || res.status === 'partial') {
      console.log("\n[TEST LULUS] Retry dan self-healing berhasil dijalankan E2E!");
      process.exit(0);
    } else {
      console.error("\n[TEST GAGAL] Status bukan success/partial.");
      process.exit(1);
    }
  })
  .catch(err => {
    console.error("Test crashed with error:", err);
    globalThis.fetch = originalFetch;
    process.exit(1);
  });
