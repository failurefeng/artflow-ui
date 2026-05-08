import type { AiGateway, GenerateImagePayload } from '@/features/canvas/application/ports';

async function normalizeReferenceImages(payload: GenerateImagePayload): Promise<string[] | undefined> {
  const isKieModel = payload.model.startsWith('kie/');
  const isFalModel = payload.model.startsWith('fal/');
  return payload.referenceImages
    ? await Promise.all(
      payload.referenceImages.map(async (imageUrl: string) =>
        isKieModel || isFalModel
          ? await imageUrlToDataUrl(imageUrl)
          : await persistImageLocallyWeb(imageUrl)
      )
    )
    : undefined;
}

async function persistImageLocallyWeb(imageUrl: string): Promise<string> {
  return imageUrlToDataUrl(imageUrl);
}

function imageUrlToDataUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}

const generationJobStore = new Map<string, {
  jobId: string;
  resolve: (result: { job_id: string; status: 'queued' | 'running' | 'succeeded' | 'failed' | 'not_found'; result?: string | null; error?: string | null }) => void;
  reject: (error: Error) => void;
}>();

function generateJobId(): string {
  return `web_job_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function getApiKeyFromSettings(modelProvider: string): string | null {
  try {
    const settingsStr = localStorage.getItem('storyboard_settings');
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      return settings.apiKeys?.[modelProvider] || null;
    }
  } catch {
    // ignore
  }

  try {
    const legacyKeys = localStorage.getItem('storyboard_api_keys');
    if (legacyKeys) {
      const parsed = JSON.parse(legacyKeys);
      return parsed[modelProvider] || null;
    }
  } catch {
    // ignore
  }

  return null;
}

function saveApiKeyToSettings(provider: string, apiKey: string): void {
  try {
    let settings: Record<string, unknown> = {};
    const settingsStr = localStorage.getItem('storyboard_settings');
    if (settingsStr) {
      settings = JSON.parse(settingsStr);
    }
    if (!settings.apiKeys) {
      settings.apiKeys = {};
    }
    (settings.apiKeys as Record<string, string>)[provider] = apiKey;
    localStorage.setItem('storyboard_settings', JSON.stringify(settings));

    let legacyKeys: Record<string, string> = {};
    try {
      const legacyStr = localStorage.getItem('storyboard_api_keys');
      if (legacyStr) {
        legacyKeys = JSON.parse(legacyStr);
      }
    } catch {
      // ignore
    }
    legacyKeys[provider] = apiKey;
    localStorage.setItem('storyboard_api_keys', JSON.stringify(legacyKeys));
  } catch {
    // ignore
  }
}

async function callGenerationAPI(request: {
  prompt: string;
  model: string;
  size: string;
  aspect_ratio: string;
  reference_images?: string[];
  extra_params?: Record<string, unknown>;
}): Promise<string> {
  const modelProvider = request.model.split('/')[0];
  const modelName = request.model.split('/')[1];

  const apiKey = getApiKeyFromSettings(modelProvider);
  if (!apiKey) {
    throw new Error(`请先在设置中配置 ${modelProvider} 的 API Key`);
  }

  const normalizedReferenceImages = request.reference_images ?? [];

  let endpoint = '';
  let body: Record<string, unknown> = {};

  if (modelProvider === 'kie') {
    endpoint = 'https://api.minimaxi.chat/v1/image_generation';
    body = {
      model: modelName,
      base64_data: normalizedReferenceImages[0] ?? null,
      text_to_image_prompt: request.prompt,
      image_size: request.size,
      ...(request.extra_params ?? {}),
    };
  } else if (modelProvider === 'ppio') {
    endpoint = 'https://api.ppio.ai/v1/image/generate';
    body = {
      model: modelName,
      prompt: request.prompt,
      aspect_ratio: request.aspect_ratio,
      ref_img: normalizedReferenceImages[0] ?? null,
      ...(request.extra_params ?? {}),
    };
  } else if (modelProvider === 'fal') {
    endpoint = 'https://queue.fal.run/fal-ai/' + modelName;
    body = {
      prompt: request.prompt,
      image_size: request.size,
      ...(request.extra_params ?? {}),
    };
  } else if (modelProvider === 'grsai') {
    endpoint = 'https://api.grsai.xiaojukeji.com/v1/image/generation';
    body = {
      model: modelName || 'nano-banana-2',
      prompt: request.prompt,
      size: request.size,
      ...(request.extra_params ?? {}),
    };
  } else {
    throw new Error(`不支持的模型提供商: ${modelProvider}`);
  }

  console.info('[WebAI] Calling API', { endpoint, modelProvider, modelName, body });

  const fetchOptions: RequestInit = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  };

  let lastError: Error | null = null;
  let response: Response | null = null;

  // Try with different CORS modes
  const corsModes: RequestMode[] = ['cors', 'no-cors'];
  
  for (const mode of corsModes) {
    try {
      fetchOptions.mode = mode;
      fetchOptions.credentials = 'omit';
      
      response = await fetch(endpoint, fetchOptions);
      
      // no-cors mode returns opaque response, which is not usable
      if (mode === 'no-cors') {
        // For no-cors, we can't parse JSON, so assume success if status is ok
        if (response.ok || response.type === 'opaque') {
          console.info('[WebAI] Request sent (no-cors mode)');
          // Return a placeholder - user needs to check the API dashboard
          return `no-cors:${Date.now()}`;
        }
      }
      
      if (response.ok) {
        break;
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[WebAI] Fetch failed with mode ${mode}:`, lastError.message);
      continue;
    }
  }

  if (!response) {
    throw lastError || new Error('网络请求失败，请检查网络连接或VPN设置');
  }

  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch {
      errorText = `HTTP ${response.status}`;
    }
    throw new Error(`API 请求失败 (${response.status}): ${errorText}`);
  }

  // Handle opaque response from no-cors
  if (response.type === 'opaque') {
    console.info('[WebAI] Received opaque response - request was sent but response is not readable');
    return `opaque:${Date.now()}`;
  }

  let data: Record<string, unknown>;
  try {
    data = await response.json();
  } catch (err) {
    const text = await response.text().catch(() => 'Unable to read response');
    throw new Error(`API 返回格式错误: ${text.slice(0, 200)}`);
  }

  console.info('[WebAI] Response data:', JSON.stringify(data).slice(0, 500));

  let imageResult: string | null = null;

  if (modelProvider === 'kie') {
    imageResult = (data.data as Array<{base64?: string}>)?.find(d => d.base64)?.base64 
      ?? (data.base64_image as string | null)
      ?? (data.image as string | null)
      ?? (data.url as string | null);
    if (imageResult && imageResult.startsWith('http')) {
      imageResult = await fetchImageAsBase64(imageResult);
    }
  } else if (modelProvider === 'ppio') {
    imageResult = (data.data as Array<{image_url?: string}>)?.find(d => d.image_url)?.image_url
      ?? (data.image_url as string | null);
    if (imageResult && imageResult.startsWith('http')) {
      imageResult = await fetchImageAsBase64(imageResult);
    }
  } else if (modelProvider === 'fal') {
    imageResult = (data.images as Array<{url?: string}>)?.find(d => d.url)?.url
      ?? (data.image as {url?: string} | null)?.url
      ?? (data.url as string | null);
    if (imageResult && imageResult.startsWith('http')) {
      imageResult = await fetchImageAsBase64(imageResult);
    }
  } else if (modelProvider === 'grsai') {
    // Try various response formats
    imageResult = (data.data as Array<{url?: string}>)?.find(d => d.url)?.url
      ?? (data.data as Array<{base64?: string}>)?.find(d => d.base64)?.base64
      ?? (data.image_url as string | null)
      ?? (data.url as string | null)
      ?? (data.output as string | null)
      ?? (data.result as string | null);
    
    if (imageResult && imageResult.startsWith('http')) {
      imageResult = await fetchImageAsBase64(imageResult);
    }
  }

  if (!imageResult) {
    throw new Error(`API 返回结果中未找到图片: ${JSON.stringify(data).slice(0, 500)}`);
  }

  return imageResult;
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl, {
      mode: 'cors',
      credentials: 'omit',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const blob = await response.blob();
    return await blobToBase64(blob);
  } catch (err) {
    console.error('[WebAI] Failed to fetch image:', err);
    throw new Error(`无法下载生成的图片: ${imageUrl}`);
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const webAiGateway: AiGateway = {
  setApiKey: async (provider: string, apiKey: string) => {
    saveApiKeyToSettings(provider, apiKey);
  },
  generateImage: async (payload: GenerateImagePayload) => {
    const normalizedReferenceImages = await normalizeReferenceImages(payload);

    return await callGenerationAPI({
      prompt: payload.prompt,
      model: payload.model,
      size: payload.size,
      aspect_ratio: payload.aspectRatio,
      reference_images: normalizedReferenceImages,
      extra_params: payload.extraParams,
    });
  },
  submitGenerateImageJob: async (payload: GenerateImagePayload) => {
    const normalizedReferenceImages = await normalizeReferenceImages(payload);
    const jobId = generateJobId();

    try {
      const result = await callGenerationAPI({
        prompt: payload.prompt,
        model: payload.model,
        size: payload.size,
        aspect_ratio: payload.aspectRatio,
        reference_images: normalizedReferenceImages,
        extra_params: payload.extraParams,
      });

      const jobEntry = generationJobStore.get(jobId);
      if (jobEntry) {
        jobEntry.resolve({
          job_id: jobId,
          status: 'succeeded',
          result,
        });
        generationJobStore.delete(jobId);
      }

      return jobId;
    } catch (error) {
      const jobEntry = generationJobStore.get(jobId);
      if (jobEntry) {
        jobEntry.reject(error instanceof Error ? error : new Error(String(error)));
        generationJobStore.delete(jobId);
      }
      throw error;
    }
  },
  getGenerateImageJob: async (jobId: string) => {
    const job = generationJobStore.get(jobId);
    if (!job) {
      return {
        job_id: jobId,
        status: 'not_found' as const,
      };
    }
    return await new Promise<{
      job_id: string;
      status: 'queued' | 'running' | 'succeeded' | 'failed' | 'not_found';
      result?: string | null;
      error?: string | null;
    }>((resolve) => {
      setTimeout(() => {
        const entry = generationJobStore.get(jobId);
        if (!entry) {
          resolve({
            job_id: jobId,
            status: 'not_found' as const,
          });
        } else {
          resolve({
            job_id: jobId,
            status: 'succeeded' as const,
            result: null,
          });
        }
      }, 100);
    });
  },
};
