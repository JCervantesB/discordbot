const defaultApiUrl = 'https://api.sinkin.ai/v1/generate';
const defaultModelId = 'JWknjgr';

function assertEnv() {
  const accessToken = process.env.SINKIN_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('SINKIN_ACCESS_TOKEN no configurado');
  }
  return accessToken;
}

export async function generateImageFromSinkIn(prompt: string) {
  const accessToken = assertEnv();
  const body = {
    access_token: accessToken,
    model_id: defaultModelId,
    prompt,
    width: 1024,
    height: 1024,
    use_default_neg: 'true',
    num_images: 1
  };

  const response = await fetch(defaultApiUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error de SinkIn: ${response.status} ${text}`);
  }

  const json = await response.json();

  if (Array.isArray(json?.images) && json.images.length > 0) {
    const first = json.images[0];
    if (typeof first === 'string' && first.startsWith('http')) {
      return first as string;
    }
    if (typeof first === 'string') {
      return `data:image/png;base64,${first}`;
    }
    if (typeof first?.url === 'string') {
      return first.url as string;
    }
    if (typeof first?.b64 === 'string') {
      return `data:image/png;base64,${first.b64}`;
    }
  }

  if (typeof json?.image_url === 'string') {
    return json.image_url as string;
  }
  if (typeof json?.b64_json === 'string') {
    return `data:image/png;base64,${json.b64_json}`;
  }

  throw new Error('Respuesta de SinkIn sin imagen');
}
