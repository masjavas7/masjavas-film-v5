import { Router } from 'express';

const router = Router();

// In-memory state for mock behavior
let seenPrompts = new Set();
let mockConfig = {
  imageBehavior: 'always_success', // 'always_success' | 'rate_limit_index' | 'always_fail'
  failOnIndex: 2
};

router.post('/mock-grokpi/configure', (req, res) => {
  const { behavior, failOnIndex } = req.body;
  seenPrompts.clear(); // Reset seen prompts on reconfiguration
  mockConfig = {
    imageBehavior: behavior || 'always_success',
    failOnIndex: failOnIndex !== undefined ? Number(failOnIndex) : 2
  };
  console.log(`[MockGrokPI] Configured behavior:`, mockConfig);
  res.json({ success: true, config: mockConfig });
});

router.post('/mock-grokpi/v1/chat/completions', (req, res) => {
  const { model, messages } = req.body;
  
  if (model === 'grok-4.1-expert') {
    // Return mock 5-panel details
    console.log(`[MockGrokPI] Serving 5-panel LLM storyboard structure`);
    return res.json({
      choices: [
        {
          message: {
            content: JSON.stringify([
              {
                panelNumber: 1,
                shotType: "Wide shot",
                action: "Roro Jonggrang standing at Merapi slopes under dark starry sky.",
                dialogue: "-",
                sfx: "Eerie wind blowing",
                transition: "CUT",
                imagePrompt: "A cinematic wide shot photo of Roro Jonggrang standing on the slopes of Gunung Merapi at night, ancient architecture in background"
              },
              {
                panelNumber: 2,
                shotType: "Medium tracking shot",
                action: "Bandung Bondowoso approaching Roro Jonggrang with determined look.",
                dialogue: "-",
                sfx: "Heavy footsteps",
                transition: "CUT",
                imagePrompt: "A cinematic medium tracking shot of Bandung Bondowoso walking, dark magical energy aura around him"
              },
              {
                panelNumber: 3,
                shotType: "Close-up",
                action: "Roro Jonggrang asking for 1000 temples in one night.",
                dialogue: "Bangunlah seribu candi dalam satu malam saja.",
                sfx: "-",
                transition: "CUT",
                imagePrompt: "A cinematic close up photo of Roro Jonggrang speaking to Bandung, moonlit night, high detail"
              },
              {
                panelNumber: 4,
                shotType: "Medium close-up",
                action: "Bandung Bondowoso calling spirits to build temples.",
                dialogue: "-",
                sfx: "Magical crackle",
                transition: "CUT",
                imagePrompt: "A cinematic medium close up photo of Bandung Bondowoso casting magic to raise stone temples, glowing runes"
              },
              {
                panelNumber: 5,
                shotType: "Wide shot",
                action: "Morning sun rising, Roro Jonggrang frozen into stone statue candi ke-seribu.",
                dialogue: "-",
                sfx: "Rooster crowing",
                transition: "FADE OUT",
                imagePrompt: "A cinematic wide shot of a stone statue of Roro Jonggrang inside Prambanan temple under beautiful golden sunrise"
              }
            ])
          }
        }
      ]
    });
  }

  if (model === 'grok-imagine-1.0') {
    const prompt = messages?.[0]?.content || '';
    seenPrompts.add(prompt);
    
    // Convert Set to Array to find the index of this prompt
    const promptsArray = Array.from(seenPrompts);
    const distinctIndex = promptsArray.indexOf(prompt);
    
    console.log(`[MockGrokPI] Image Gen. Distinct Index = ${distinctIndex}, Prompt = "${prompt.substring(0, 40)}..."`);
    
    if (mockConfig.imageBehavior === 'always_rate_limit') {
      console.log(`[MockGrokPI] Simulated 429 rate limit (always)`);
      return res.status(429).json({
        error: {
          code: 'rate_limit_exceeded',
          message: 'Simulated GrokPI Rate Limit Exceeded'
        }
      });
    }

    if (mockConfig.imageBehavior === 'rate_limit_index' && distinctIndex === mockConfig.failOnIndex) {
      console.log(`[MockGrokPI] Simulated 429 rate limit for distinct index ${distinctIndex}`);
      return res.status(429).json({
        error: {
          code: 'rate_limit_exceeded',
          message: `Simulated GrokPI Rate Limit Exceeded at distinct index ${distinctIndex}`
        }
      });
    }

    if (mockConfig.imageBehavior === 'always_fail') {
      console.log(`[MockGrokPI] Simulated 500 server error`);
      return res.status(500).json({
        error: {
          code: 'server_error',
          message: 'Simulated GrokPI internal error'
        }
      });
    }

    // Success response with a 1x1 white pixel base64 image png
    console.log(`[MockGrokPI] Success image response for distinct index ${distinctIndex}`);
    return res.json({
      data: [
        {
          b64_json: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
      ]
    });
  }

  // Fallback default response
  return res.status(404).json({ error: { message: 'Mock endpoint not handled' } });
});

export default router;
