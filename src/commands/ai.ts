import { invoke, isTauri } from '@tauri-apps/api/core';
import { Filesystem, Directory } from '@capacitor/filesystem';

export interface GenerateRequest {
  prompt: string;
  model: string;
  size: string;
  aspect_ratio: string;
  reference_images?: string[];
  extra_params?: Record<string, unknown>;
}

export type GenerationJobState = 'queued' | 'running' | 'succeeded' | 'failed' | 'not_found';

export interface GenerationJobStatus {
  job_id: string;
  status: GenerationJobState;
  result?: string | null;
  error?: string | null;
}

const BASE64_PREVIEW_HEAD = 96;
const BASE64_PREVIEW_TAIL = 24;

function truncateText(value: string, max = 200): string {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, max)}...(${value.length} chars)`;
}

function truncateBase64Like(value: string): string {
  if (!value) {
    return value;
  }

  if (value.startsWith('data:')) {
    const [meta, payload = ''] = value.split(',', 2);
    if (payload.length <= BASE64_PREVIEW_HEAD + BASE64_PREVIEW_TAIL) {
      return value;
    }
    return `${meta},${payload.slice(0, BASE64_PREVIEW_HEAD)}...${payload.slice(-BASE64_PREVIEW_TAIL)}(${payload.length} chars)`;
  }

  const base64Like = /^[A-Za-z0-9+/=]+$/.test(value) && value.length > 256;
  if (!base64Like) {
    return truncateText(value, 280);
  }

  return `${value.slice(0, BASE64_PREVIEW_HEAD)}...${value.slice(-BASE64_PREVIEW_TAIL)}(${value.length} chars)`;
}

function sanitizeGenerateRequestForLog(request: GenerateRequest): Record<string, unknown> {
  return {
    prompt: truncateText(request.prompt, 240),
    model: request.model,
    size: request.size,
    aspect_ratio: request.aspect_ratio,
    reference_images_count: request.reference_images?.length ?? 0,
    reference_images_preview: (request.reference_images ?? []).map((item) =>
      truncateBase64Like(item)
    ),
    extra_params: request.extra_params ?? {},
  };
}

interface ErrorWithDetails extends Error {
  details?: string;
}

function normalizeInvokeError(error: unknown): { message: string; details?: string } {
  if (error instanceof Error) {
    const detailsText =
      'details' in error
        ? typeof (error as { details?: unknown }).details === 'string'
          ? (error as { details?: string }).details
          : undefined
        : undefined;
    return { message: error.message || 'Generation failed', details: detailsText };
  }

  if (typeof error === 'string') {
    return { message: error || 'Generation failed', details: error || undefined };
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message =
      (typeof record.message === 'string' && record.message) ||
      (typeof record.error === 'string' && record.error) ||
      (typeof record.msg === 'string' && record.msg) ||
      'Generation failed';
    let details: string | undefined;
    try {
      details = truncateText(JSON.stringify(record, null, 2), 2000);
    } catch {
      details = truncateText(String(record), 2000);
    }
    return { message, details };
  }

  return { message: 'Generation failed' };
}

function createErrorWithDetails(message: string, details?: string): ErrorWithDetails {
  const error: ErrorWithDetails = new Error(message);
  if (details) {
    error.details = details;
  }
  return error;
}

async function getWebAiGateway() {
  const { webAiGateway } = await import('../webApi/webAiGateway');
  return webAiGateway;
}

export async function setApiKey(provider: string, apiKey: string): Promise<void> {
  console.info('[AI] set_api_key', {
    provider,
    apiKeyMasked: apiKey ? `${apiKey.slice(0, 4)}***${apiKey.slice(-2)}` : '',
    tauri: isTauri(),
  });

  if (isTauri()) {
    return await invoke('set_api_key', { provider, apiKey });
  } else {
    const gateway = await getWebAiGateway();
    return await gateway.setApiKey(provider, apiKey);
  }
}

export async function generateImage(request: GenerateRequest): Promise<string> {
  const startedAt = performance.now();
  console.info('[AI] generate_image request', {
    ...sanitizeGenerateRequestForLog(request),
    tauri: isTauri(),
  });

  if (isTauri()) {
    try {
      const rawResult = await invoke<unknown>('generate_image', { request });
      if (typeof rawResult !== 'string') {
        throw createErrorWithDetails(
          'Generation returned non-string payload',
          truncateText(
            (() => {
              try {
                return JSON.stringify(rawResult, null, 2);
              } catch {
                return String(rawResult);
              }
            })(),
            2000
          )
        );
      }
      const result = rawResult.trim();
      if (!result) {
        throw createErrorWithDetails('Generation returned empty image source');
      }
      const elapsedMs = Math.round(performance.now() - startedAt);
      console.info('[AI] generate_image success', {
        elapsedMs,
        resultPreview: truncateText(result, 220),
      });
      return result;
    } catch (error) {
      const elapsedMs = Math.round(performance.now() - startedAt);
      const normalizedError = normalizeInvokeError(error);
      console.error('[AI] generate_image failed', {
        elapsedMs,
        request: sanitizeGenerateRequestForLog(request),
        error,
        normalizedError,
      });
      const commandError: ErrorWithDetails = new Error(normalizedError.message);
      commandError.details = normalizedError.details;
      throw commandError;
    }
  } else {
    const gateway = await getWebAiGateway();
    return await gateway.generateImage({
      prompt: request.prompt,
      model: request.model,
      size: request.size,
      aspectRatio: request.aspect_ratio,
      referenceImages: request.reference_images,
      extraParams: request.extra_params,
    });
  }
}

export async function submitGenerateImageJob(request: GenerateRequest): Promise<string> {
  console.info('[AI] submit_generate_image_job request', {
    ...sanitizeGenerateRequestForLog(request),
    tauri: isTauri(),
  });

  if (isTauri()) {
    const jobId = await invoke<string>('submit_generate_image_job', { request });
    if (typeof jobId !== 'string' || !jobId.trim()) {
      throw new Error('submit_generate_image_job returned invalid job id');
    }
    return jobId.trim();
  } else {
    const gateway = await getWebAiGateway();
    return await gateway.submitGenerateImageJob({
      prompt: request.prompt,
      model: request.model,
      size: request.size,
      aspectRatio: request.aspect_ratio,
      referenceImages: request.reference_images,
      extraParams: request.extra_params,
    });
  }
}

export async function getGenerateImageJob(jobId: string): Promise<GenerationJobStatus> {
  if (isTauri()) {
    const result = await invoke<GenerationJobStatus>('get_generate_image_job', { jobId });
    if (!result || typeof result !== 'object' || typeof result.status !== 'string') {
      throw new Error('get_generate_image_job returned invalid payload');
    }
    return result;
  } else {
    const gateway = await getWebAiGateway();
    return await gateway.getGenerateImageJob(jobId);
  }
}

export async function listModels(): Promise<string[]> {
  if (isTauri()) {
    return await invoke('list_models');
  } else {
    return ['kie/m2.7', 'ppio/flux', 'fal/flux', 'grsai/flux'];
  }
}

export interface DataPathInfo {
  app_data_dir: string;
  db_path: string;
  settings_path: string;
  api_keys_path: string;
  is_external: boolean;
}

export async function getDataPath(): Promise<DataPathInfo> {
  if (isTauri()) {
    return await invoke<DataPathInfo>('get_data_path');
  } else {
    const isMobile = typeof window !== 'undefined' && !!(window as unknown as { Capacitor?: unknown }).Capacitor;
    if (isMobile) {
      try {
        const documentsUri = await Filesystem.getUri({ directory: Directory.Documents, path: '' });
        const documentsPath = documentsUri.uri.replace('file://', '');
        const dbPath = `${documentsPath}indexeddb/storyboard_projects`;
        const settingsPath = `${documentsPath}cache/settings`;
        return {
          app_data_dir: documentsPath,
          db_path: dbPath,
          settings_path: settingsPath,
          api_keys_path: `${documentsPath}secure/api_keys`,
          is_external: false,
        };
      } catch {
        return {
          app_data_dir: '应用内部存储',
          db_path: 'IndexedDB 数据库',
          settings_path: '应用设置缓存',
          api_keys_path: '密钥安全存储',
          is_external: false,
        };
      }
    }
    return {
      app_data_dir: '浏览器本地存储 (localStorage)',
      db_path: 'IndexedDB',
      settings_path: 'localStorage: storyboard_settings',
      api_keys_path: 'localStorage: storyboard_api_keys',
      is_external: false,
    };
  }
}

export async function exportData(): Promise<string> {
  if (isTauri()) {
    const isMobile = typeof window !== 'undefined' && !!(window as unknown as { Capacitor?: unknown }).Capacitor;
    
    if (isMobile) {
      const { webProjectGateway } = await import('../webApi/webProjectGateway');
      const { useSettingsStore } = await import('../stores/settingsStore');
      
      const settings = useSettingsStore.getState();
      const apiKeys = settings.apiKeys;
      
      let projects: unknown[] = [];
      try {
        const summaries = await webProjectGateway.listProjectSummaries();
        const projectRecords = [];
        for (const summary of summaries) {
          const record = await webProjectGateway.getProjectRecord(summary.id);
          if (record) {
            projectRecords.push({
              id: record.id,
              name: record.name,
              created_at: record.createdAt,
              updated_at: record.updatedAt,
              nodes_json: record.nodesJson,
              edges_json: record.edgesJson,
              viewport_json: record.viewportJson,
              history_json: record.historyJson,
            });
          }
        }
        projects = projectRecords;
      } catch (error) {
        console.warn('[Export] Failed to export projects from IndexedDB:', error);
      }
      
      return JSON.stringify({
        version: '2.0',
        app_keys: apiKeys,
        settings: {},
        projects: projects,
        exported_at: Date.now(),
      }, null, 2);
    } else {
      return await invoke<string>('export_data');
    }
  } else {
    const settings = localStorage.getItem('storyboard_settings') || '{}';
    const apiKeys = localStorage.getItem('storyboard_api_keys') || '{}';
    const projects = localStorage.getItem('storyboard_projects') || '[]';
    return JSON.stringify({
      version: '2.0',
      app_keys: JSON.parse(apiKeys),
      settings: JSON.parse(settings),
      projects: JSON.parse(projects),
      exported_at: Date.now(),
    }, null, 2);
  }
}

export interface ImportResult {
  projects_imported: number;
}

export async function importData(data: string): Promise<ImportResult> {
  if (isTauri()) {
    const isMobile = typeof window !== 'undefined' && !!(window as unknown as { Capacitor?: unknown }).Capacitor;
    
    if (isMobile) {
      const parsed = JSON.parse(data);
      let projectsImported = 0;
      
      if (parsed.app_keys && typeof parsed.app_keys === 'object') {
        const { useSettingsStore } = await import('../stores/settingsStore');
        const setProviderApiKey = useSettingsStore.getState().setProviderApiKey;
        for (const [providerId, apiKey] of Object.entries(parsed.app_keys)) {
          if (typeof apiKey === 'string' && apiKey.trim()) {
            setProviderApiKey(providerId, apiKey);
          }
        }
      }
      
      if (parsed.projects && Array.isArray(parsed.projects)) {
        const { webProjectGateway } = await import('../webApi/webProjectGateway');
        for (const project of parsed.projects) {
          try {
            const record = {
              id: project.id,
              name: project.name,
              createdAt: project.created_at || project.createdAt || Date.now(),
              updatedAt: project.updated_at || project.updatedAt || Date.now(),
              nodeCount: project.node_count || project.nodeCount || 0,
              nodesJson: project.nodes_json || project.nodesJson || '[]',
              edgesJson: project.edges_json || project.edgesJson || '[]',
              viewportJson: project.viewport_json || project.viewportJson || '{"x":0,"y":0,"zoom":1}',
              historyJson: project.history_json || project.historyJson || '{"past":[],"future":[]}',
            };
            await webProjectGateway.upsertProjectRecord(record);
            projectsImported++;
          } catch (error) {
            console.warn('[Import] Failed to import project:', project.id, error);
          }
        }
      }
      
      return { projects_imported: projectsImported };
    } else {
      const count = await invoke<number>('import_data', { data });
      return { projects_imported: count };
    }
  } else {
    const parsed = JSON.parse(data);
    let projectsImported = 0;
    if (parsed.settings) {
      localStorage.setItem('storyboard_settings', JSON.stringify(parsed.settings));
    }
    if (parsed.app_keys || parsed.api_keys) {
      const keys = parsed.app_keys || parsed.api_keys;
      localStorage.setItem('storyboard_api_keys', JSON.stringify(keys));
    }
    if (parsed.projects) {
      localStorage.setItem('storyboard_projects', JSON.stringify(parsed.projects));
      projectsImported = parsed.projects.length || 0;
    }
    return { projects_imported: projectsImported };
  }
}
