const axios = require('axios');

/**
 * Robust 3-strategy JSON parser for AI responses.
 * Strategy 1: Direct JSON.parse
 * Strategy 2: Strip markdown code fences then parse
 * Strategy 3: Extract first {...} block then parse
 */
function parseAIJson(text) {
  if (!text) return null;
  // Strategy 1: direct parse
  try { return JSON.parse(text); } catch (_) {}
  // Strategy 2: strip markdown fences
  const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch (_) {}
  // Strategy 3: extract first JSON object
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {}
  }
  return null;
}

/**
 * Shared OpenRouter caller used by all AI endpoints.
 * Model defaults to claude-3-5-sonnet-20241022 via OPENROUTER env.
 */
async function callOpenRouter(systemPrompt, userPrompt, maxTokens = 4000) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey === 'your-openrouter-api-key-here') {
    throw new Error('OpenRouter API key is not configured. Set OPENROUTER_API_KEY in .env');
  }

  const model = process.env.AI_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
        'X-Title': 'AI Architectural Design Generator',
      },
      timeout: 60000,
    }
  );

  const content = response.data.choices?.[0]?.message?.content || '';
  const parsed = parseAIJson(content);
  return parsed || { rawResponse: content };
}

module.exports = { parseAIJson, callOpenRouter };
