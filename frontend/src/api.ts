import { 
  TranslationConfig, 
  JobStatusResponse, 
  JobPreviewResponse, 
  AstGraphResponse,
  StructuralComparison 
} from './types';

// ==============================================================================
// Server URL & Network Configuration (Mobile & Desktop)
// ==============================================================================

export function isCapacitorNative(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    !!(window as any).Capacitor ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && window.location.port === '')
  );
}

export function getStoredServerUrl(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('linguadoc_server_url') || '';
}

export function setStoredServerUrl(url: string) {
  if (typeof window === 'undefined') return;
  const clean = url.trim().replace(/\/+$/, '');
  localStorage.setItem('linguadoc_server_url', clean);
}

export function getApiBase(): string {
  const stored = getStoredServerUrl();
  if (stored) {
    return `${stored.replace(/\/+$/, '')}/api`;
  }
  
  // If running on mobile (Capacitor WebView) where localhost has no backend:
  if (isCapacitorNative()) {
    // Default fallback to LAN development host
    return 'http://192.168.1.8:8000/api';
  }
  
  return '/api';
}

/**
 * Safely parses response JSON, detecting HTML / SPA fallbacks and connection failures.
 */
async function parseJsonSafely(res: Response, endpointDesc: string) {
  const text = await res.text();
  const trimmed = text.trim();

  // Detect HTML responses (e.g., <!doctype html> or <html... from SPA fallbacks)
  if (trimmed.startsWith('<') || trimmed.toLowerCase().includes('<!doctype') || trimmed.toLowerCase().includes('<html')) {
    const apiBase = getApiBase();
    throw new Error(
      `Tidak dapat terhubung ke server backend LinguaDoc di "${apiBase}". ` +
      `Alamat tersebut mengembalikan dokumen HTML (SPA), bukan API backend Python. ` +
      `Pastikan server backend uvicorn aktif di laptop/komputer Anda dan atur "URL Server Backend" yang sesuai di Pengaturan.`
    );
  }

  let data: any;
  try {
    data = JSON.parse(text);
  } catch (err: any) {
    throw new Error(`Format respons server tidak valid (${err.message}): ${trimmed.slice(0, 80)}`);
  }

  if (!res.ok) {
    throw new Error(data.detail || data.message || `${endpointDesc} gagal (HTTP ${res.status})`);
  }

  return data;
}

/**
 * Pings a specific backend URL to test connectivity.
 */
export async function pingBackend(serverUrl: string): Promise<{ success: boolean; data?: any; error?: string }> {
  const base = serverUrl.trim().replace(/\/+$/, '');
  const url = base.endsWith('/api') ? `${base}/health` : `${base}/api/health`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    
    if (!res.ok) {
      return { success: false, error: `HTTP status ${res.status}` };
    }
    const data = await parseJsonSafely(res, 'Healthcheck');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Koneksi gagal / timeout' };
  }
}

/**
 * Auto-detect available server in local network or fallback options.
 */
export async function autoDetectBackend(): Promise<string | null> {
  const candidates = Array.from(new Set([
    getStoredServerUrl(),
    'http://192.168.1.8:8000',
    'http://192.168.1.9:8000',
    'http://localhost:8000',
    'http://10.0.2.2:8000', // Android Studio Emulator
  ].filter(Boolean)));

  const checks = candidates.map(async (candidate) => {
    const res = await pingBackend(candidate);
    if (res.success) return candidate;
    throw new Error('failed');
  });

  try {
    const firstWorking = await Promise.any(checks);
    if (firstWorking) {
      setStoredServerUrl(firstWorking);
      return firstWorking;
    }
  } catch {
    // All failed
  }
  return null;
}

// ==============================================================================
// Safe API Fetcher
// ==============================================================================

async function safeFetchJson(url: string, init?: RequestInit, endpointDesc = 'Permintaan') {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (err: any) {
    const apiBase = getApiBase();
    throw new Error(
      `Gagal terhubung ke backend (${apiBase}): ${err.message || 'Koneksi terputus'}. ` +
      `Pastikan server aktif dan ponsel terhubung ke Wi-Fi yang sama.`
    );
  }
  return parseJsonSafely(res, endpointDesc);
}

// ==============================================================================
// Core API Calls
// ==============================================================================

export async function fetchHealth() {
  return safeFetchJson(`${getApiBase()}/health`, undefined, 'Healthcheck');
}

export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  return safeFetchJson(`${getApiBase()}/upload`, {
    method: 'POST',
    body: formData,
  }, 'Unggah dokumen');
}

export async function startTranslation(jobId: string, config: TranslationConfig) {
  return safeFetchJson(`${getApiBase()}/translate/${jobId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  }, 'Mulai penerjemahan');
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  return safeFetchJson(`${getApiBase()}/jobs/${jobId}`, undefined, 'Cek status pekerjaan');
}

export async function getJobPreview(jobId: string): Promise<JobPreviewResponse> {
  return safeFetchJson(`${getApiBase()}/jobs/${jobId}/preview`, undefined, 'Ambil pratinjau dokumen');
}

export async function getJobAst(jobId: string): Promise<AstGraphResponse> {
  return safeFetchJson(`${getApiBase()}/jobs/${jobId}/ast`, undefined, 'Ambil pohon AST dokumen');
}

export async function getValidationReport(jobId: string): Promise<StructuralComparison> {
  return safeFetchJson(`${getApiBase()}/jobs/${jobId}/validation`, undefined, 'Ambil laporan validasi struktural');
}

export async function getJobsList() {
  return safeFetchJson(`${getApiBase()}/jobs`, undefined, 'Ambil daftar riwayat');
}

export async function deleteJob(jobId: string) {
  return safeFetchJson(`${getApiBase()}/jobs/${jobId}`, { method: 'DELETE' }, 'Hapus pekerjaan');
}

export async function fetchOllamaModels(baseUrl?: string): Promise<{ available: boolean; models: string[]; error?: string }> {
  try {
    const query = baseUrl ? `?base_url=${encodeURIComponent(baseUrl)}` : '';
    return await safeFetchJson(`${getApiBase()}/ollama/models${query}`, undefined, 'Deteksi model Ollama');
  } catch (err: any) {
    return { available: false, models: [], error: err.message };
  }
}

export async function testProviderConnection(provider: string, apiKey?: string, apiBaseUrl?: string, modelName?: string) {
  return safeFetchJson(`${getApiBase()}/test-provider`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      api_key: apiKey,
      api_base_url: apiBaseUrl,
      model_name: modelName
    }),
  }, 'Uji koneksi engine AI');
}

export function getDownloadUrl(jobId: string): string {
  return `${getApiBase()}/jobs/${jobId}/download`;
}

export function getSampleUrl(sampleType: string): string {
  return `${getApiBase()}/samples/${sampleType}`;
}

