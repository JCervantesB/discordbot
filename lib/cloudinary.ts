import crypto from 'node:crypto';

type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary no está configurado correctamente');
  }
  return { cloudName, apiKey, apiSecret };
}

function buildSignature(params: Record<string, string>, apiSecret: string) {
  const keys = Object.keys(params).sort();
  const toSign = keys.map((k) => `${k}=${params[k]}`).join('&') + apiSecret;
  return crypto.createHash('sha1').update(toSign).digest('hex');
}

export async function uploadImageToCloudinary(
  file: string,
  options?: { folder?: string }
): Promise<string> {
  const { cloudName, apiKey, apiSecret } = getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const baseParams: Record<string, string> = { timestamp };
  if (options?.folder) {
    baseParams.folder = options.folder;
  }
  const signature = buildSignature(baseParams, apiSecret);
  const body = new URLSearchParams();
  body.set('file', file);
  body.set('timestamp', timestamp);
  if (options?.folder) {
    body.set('folder', options.folder);
  }
  body.set('api_key', apiKey);
  body.set('signature', signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error de Cloudinary: ${res.status} ${text}`);
  }

  const json = (await res.json()) as { secure_url?: string; url?: string };
  const url = json.secure_url || json.url;
  if (!url) {
    throw new Error('Respuesta de Cloudinary sin URL');
  }
  return url;
}
