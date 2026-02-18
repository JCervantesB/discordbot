const defaultBaseUrl = 'https://api.venice.ai/api/v1';

function getVeniceConfig() {
  const apiKey = process.env.VENICE_API_KEY;
  const baseURL = process.env.VENICE_BASE_URL || defaultBaseUrl;
  if (!apiKey) {
    throw new Error('VENICE_API_KEY no configurado');
  }
  return { apiKey, baseURL };
}

const defaultTextModel = process.env.VENICE_TEXT_MODEL || 'venice-uncensored';
const defaultImageModel = process.env.VENICE_IMAGE_MODEL || 'venice-sd35';

export async function generateNarrative(prompt: string) {
  const { apiKey, baseURL } = getVeniceConfig();

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: defaultTextModel,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error de Venice: ${response.status} ${text}`);
  }

  const json = (await response.json()) as {
    choices: { message?: { content?: string }; text?: string }[];
  };

  const first = json.choices[0];
  const content = first?.message?.content ?? first?.text;
  if (!content) {
    throw new Error('Respuesta de Venice sin contenido');
  }

  return content;
}

export async function generateImageFromPrompt(prompt: string) {
  const { apiKey, baseURL } = getVeniceConfig();

  const response = await fetch(`${baseURL}/image/generate`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: defaultImageModel,
      prompt,
      width: 1024,
      height: 1024,
      format: 'webp'
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error de Venice (image): ${response.status} ${text}`);
  }

  const json = (await response.json()) as {
    images?: string[];
  };

  const first = json.images?.[0];
  if (!first) {
    throw new Error('Respuesta de Venice sin imagen');
  }

  const dataUrl = `data:image/webp;base64,${first}`;
  return dataUrl;
}
