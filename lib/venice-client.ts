const defaultBaseUrl = 'https://api.venice.ai/v1';

export async function generateNarrative(prompt: string) {
  const apiKey = process.env.VENICE_API_KEY;
  const baseURL = process.env.VENICE_BASE_URL || defaultBaseUrl;

  if (!apiKey) {
    throw new Error('VENICE_API_KEY no configurado');
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'meta-llama/Meta-Llama-3.1-70B-Instruct',
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
