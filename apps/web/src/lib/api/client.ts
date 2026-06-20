const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8006').replace(/\/$/, '');

export type Health = { ok: boolean; ai_enabled: boolean; provider: string; sessions: number; workflows: number };
export type TemplateCard = { id: string; name: string; summary: string; use_case: string; nodes: string[] };
export type NodeTypeCard = { id: string; name: string; description: string };
export type UploadedContext = { session_id: string; repo_name: string; file_count: number; default_targets: string[]; detected_stack: string[] };
export type RepoFile = { path: string; kind: string; size: number };
export type FilesResponse = { session_id: string; files: RepoFile[]; default_targets: string[] };
export type HumanDecision = { id: string; question: string; answer: 'yes' | 'no' };
export type WorkflowRequest = {
  session_id?: string | null;
  objective: string;
  template_ids: string[];
  target_files: string[];
  require_approval: boolean;
  use_llm: boolean;
  human_decisions: HumanDecision[];
};
export type WorkflowNode = {
  id: string;
  type: string;
  title: string;
  instruction: string;
  input_from: string[];
  guardrail?: string | null;
  output_key: string;
  implementation: string[];
};
export type WorkflowEdge = { source: string; target: string; label: string };
export type WorkflowDefinition = { workflow_id: string; title: string; objective: string; nodes: WorkflowNode[]; edges: WorkflowEdge[]; export_json: string; export_yaml: string };
export type RunTrace = { node_id: string; title: string; status: string; summary: string; output: Record<string, unknown> };
export type WorkflowFinding = { severity: 'blocker' | 'warning' | 'suggestion' | 'nit' | 'pass'; title: string; detail: string; recommendation: string };
export type WorkflowArtifact = { name: string; kind: 'skill_md' | 'technical_schema' | 'n8n_readme' | 'zapier_make_readme' | 'mcp_contract' | 'runbook'; content: string };
export type WorkflowRunResponse = { workflow: WorkflowDefinition; traces: RunTrace[]; findings: WorkflowFinding[]; artifacts: WorkflowArtifact[]; report_markdown: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { 'content-type': 'application/json', ...(init?.headers ?? {}) }
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${await res.text()}`);
  return res.json();
}

export const api = {
  health: () => request<Health>('/api/v1/workflows/health'),
  templates: () => request<TemplateCard[]>('/api/v1/workflows/templates'),
  nodeTypes: () => request<NodeTypeCard[]>('/api/v1/workflows/node-types'),
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<UploadedContext>('/api/v1/workflows/upload', { method: 'POST', body: form });
  },
  files: (sessionId: string) => request<FilesResponse>(`/api/v1/workflows/files/${sessionId}`),
  run: (payload: WorkflowRequest) => request<WorkflowRunResponse>('/api/v1/workflows/run', { method: 'POST', body: JSON.stringify(payload) })
};
