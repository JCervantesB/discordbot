const defaultApiUrl = process.env.SINKIN_API_URL || 'https://sinkin.ai/api/inference';
const defaultModelId = process.env.SINKIN_MODEL_ID || 'JWknjgr';
const defaultTimeoutMs = Number(process.env.SINKIN_TIMEOUT_MS || 15000);
const defaultMaxRetries = Number(process.env.SINKIN_MAX_RETRIES || 2);

function assertEnv() {
  const accessToken = process.env.SINKIN_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error('SINKIN_ACCESS_TOKEN no configurado');
  }
  return accessToken;
}

async function requestWithTimeoutAndRetry(
  body: Record<string, unknown>,
  timeoutMs: number,
  maxRetries: number
) {
  let attempt = 0;
  let lastError: unknown;
  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(defaultApiUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!response.ok) {
        const text = await response.text();
        const status = response.status;
        if (status >= 500 || status === 429) {
          lastError = new Error(`Error de SinkIn: ${status} ${text}`);
          attempt += 1;
          continue;
        }
        throw new Error(`Error de SinkIn: ${status} ${text}`);
      }
      return response;
    } catch (err) {
      clearTimeout(timer);
      lastError = err;
      attempt += 1;
      if (attempt > maxRetries) break;
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error('Fallo desconocido al llamar a SinkIn');
}

export async function generateImageFromSinkIn(prompt: string) {
  const accessToken = assertEnv();
  const sanitizedPrompt = prompt.replace(/\s+/g, ' ').trim().slice(0, 300);
  const body = {
    access_token: accessToken,
    model_id: defaultModelId,
    prompt: sanitizedPrompt,
    width: 512,
    height: 512,
    use_default_neg: 'true',
    num_images: 1
  };

  const response = await requestWithTimeoutAndRetry(body, defaultTimeoutMs, defaultMaxRetries);

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
