import getApiBaseUrl from './apiBase';

export async function fetchRecommendations(limit = 5) {
  const res = await fetch(`${getApiBaseUrl()}/api/ai/recommendations?limit=${limit}`);
  if (!res.ok) throw new Error('Gagal memuat rekomendasi');
  return res.json();
}

export async function searchProjectsNatural(q: string) {
  const res = await fetch(`${getApiBaseUrl()}/api/ai/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error('Pencarian gagal');
  return res.json();
}

export async function fetchProjectSummary(projectId: string) {
  const res = await fetch(`${getApiBaseUrl()}/api/ai/projects/${projectId}/summary`);
  if (!res.ok) throw new Error('Ringkasan gagal');
  return res.json();
}

export async function sendAssistantChat(message: string, projectId?: string | null) {
  const res = await fetch(`${getApiBaseUrl()}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, projectId: projectId || undefined })
  });
  if (!res.ok) throw new Error('Chat gagal');
  return res.json();
}