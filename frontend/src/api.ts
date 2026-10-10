import { 
  TranslationConfig, 
  JobStatusResponse, 
  JobPreviewResponse, 
  AstGraphResponse,
  StructuralComparison 
} from './types';

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function uploadDocument(file: File) {
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to upload document');
  }
  
  return res.json();
}

export async function startTranslation(jobId: string, config: TranslationConfig) {
  const res = await fetch(`${API_BASE}/translate/${jobId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to start translation');
  }
  
  return res.json();
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error('Failed to retrieve job status');
  return res.json();
}

export async function getJobPreview(jobId: string): Promise<JobPreviewResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/preview`);
  if (!res.ok) throw new Error('Failed to retrieve document preview');
  return res.json();
}

export async function getJobAst(jobId: string): Promise<AstGraphResponse> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/ast`);
  if (!res.ok) throw new Error('Failed to retrieve AST graph data');
  return res.json();
}

export async function getValidationReport(jobId: string): Promise<StructuralComparison> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/validation`);
  if (!res.ok) throw new Error('Failed to retrieve validation report');
  return res.json();
}

export async function getJobsList() {
  const res = await fetch(`${API_BASE}/jobs`);
  if (!res.ok) throw new Error('Failed to list jobs');
  return res.json();
}

export async function deleteJob(jobId: string) {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete job');
  return res.json();
}

export async function testProviderConnection(provider: string, apiKey?: string, apiBaseUrl?: string, modelName?: string) {
  const res = await fetch(`${API_BASE}/test-provider`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      provider,
      api_key: apiKey,
      api_base_url: apiBaseUrl,
      model_name: modelName
    }),
  });
  return res.json();
}

export function getDownloadUrl(jobId: string): string {
  return `${API_BASE}/jobs/${jobId}/download`;
}
