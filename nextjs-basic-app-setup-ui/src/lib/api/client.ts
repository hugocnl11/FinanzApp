"use client";

import { getUserId } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export type ApiRequestOptions = RequestInit & {
  json?: unknown;
};

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}) {
  const { json, headers, ...rest } = options;
  const userId = typeof window !== "undefined" ? getUserId() : null;
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/97e0b5eb-0872-4c10-ba12-dd893008048d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:14',message:'apiFetch entry',data:{path,json,hasUserId:!!userId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-user-id": userId } : {}),
      ...(headers ?? {}),
    },
    body: json ? JSON.stringify(json) : rest.body,
  });
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/97e0b5eb-0872-4c10-ba12-dd893008048d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:23',message:'apiFetch response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  // #endregion

  if (!response.ok) {
    const text = await response.text();
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/97e0b5eb-0872-4c10-ba12-dd893008048d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:31',message:'apiFetch error response',data:{status:response.status,text},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    let message = text;
    try {
      const json = JSON.parse(text);
      message = json.error || json.message || text;
    } catch {
      // Si no es JSON, usar el texto directamente
    }
    throw new Error(message || "Error en la petición");
  }

  return (await response.json()) as T;
}
