const apiKey = 'AIzaSyBVZWLgW3kP_zZhZlXVHZZPwi9dyhkgT0o';

async function test() {
  const body = {
    contents: [
      {
        parts: [
          { text: `You are a professional nutritionist and food recognition expert.
Analyze the food in this image and return ONLY a valid JSON object (no markdown, no explanation) with these exact fields:
{
  "food_name": "string",
  "estimated_portion": "string",
  "calories": 100,
  "protein_g": 10,
  "carbs_g": 10,
  "fat_g": 10,
  "fiber_g": 10,
  "sugar_g": 10,
  "sodium_mg": 10,
  "confidence": "high|medium|low"
}
` },
          { text: "Imagine a picture of an apple here." }
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 512,
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-goog-api-key': apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  console.log(JSON.stringify(data, null, 2));
}

test();
