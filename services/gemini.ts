import { GeminiFoodResult } from '../types';

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
const FALLBACK_MODELS = [
  'gemini-flash-latest',
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash',
  'gemini-1.5-pro',
  'gemini-pro-vision',
];

// We will keep track of the working model in memory
let workingModel = 'gemini-flash-latest';

const FOOD_ANALYSIS_PROMPT = `You are a professional nutritionist and food recognition expert.
Analyze the food in this image and return ONLY a valid JSON object (no markdown, no explanation) with these exact fields:
{
  "food_name": "string - specific name of the food (e.g., 'Grilled Chicken Breast', 'Caesar Salad', 'Pepperoni Pizza slice')",
  "estimated_portion": "string - estimated serving size (e.g., '1 cup (240g)', '1 slice (85g)', '1 medium piece (150g)')",
  "calories": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "sugar_g": number,
  "sodium_mg": number,
  "confidence": "high|medium|low"
}
Be accurate and realistic with nutrition values. If you cannot clearly identify the food, still provide your best estimate and use "low" confidence.`;

export async function analyzeFoodImage(
  apiKey: string,
  base64Image: string,
  mimeType: string = 'image/jpeg'
): Promise<GeminiFoodResult> {
  const body = {
    contents: [
      {
        parts: [
          { text: FOOD_ANALYSIS_PROMPT },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(`${BASE_URL}${workingModel}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const rawText: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  // Extract only the JSON object, ignoring any conversational text before or after
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  const jsonString = jsonMatch ? jsonMatch[0] : rawText;

  try {
    const parsed = JSON.parse(jsonString) as GeminiFoodResult;
    // Sanitize numbers
    return {
      food_name: parsed.food_name ?? 'Unknown Food',
      estimated_portion: parsed.estimated_portion ?? '1 serving',
      calories: Math.max(0, Math.round(Number(parsed.calories) || 0)),
      protein_g: Math.max(0, Math.round(Number(parsed.protein_g) || 0)),
      carbs_g: Math.max(0, Math.round(Number(parsed.carbs_g) || 0)),
      fat_g: Math.max(0, Math.round(Number(parsed.fat_g) || 0)),
      fiber_g: Math.max(0, Math.round(Number(parsed.fiber_g) || 0)),
      sugar_g: Math.max(0, Math.round(Number(parsed.sugar_g) || 0)),
      sodium_mg: Math.max(0, Math.round(Number(parsed.sodium_mg) || 0)),
      confidence: parsed.confidence ?? 'medium',
    };
  } catch {
    throw new Error(`Failed to parse Gemini response as JSON. Raw output: ${rawText}`);
  }
}

export async function validateGeminiApiKey(apiKey: string): Promise<boolean> {
  const body = {
    contents: [{ parts: [{ text: 'Say "OK" in one word.' }] }],
    generationConfig: { maxOutputTokens: 5 },
  };

  let lastError = '';

  for (const model of FALLBACK_MODELS) {
    const response = await fetch(`${BASE_URL}${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      workingModel = model;
      return true;
    } else {
      lastError = await response.text();
    }
  }

  // If we exhausted all models and none worked, throw the last error
  throw new Error(`All models failed. Last error: ${lastError}`);
}
