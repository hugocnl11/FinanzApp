"use client";

import { getUserId } from "@/lib/auth";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export type ApiRequestOptions = RequestInit & {
  json?: unknown;
};

export async function apiFetch<T>(path: string, options: ApiRequestOptions = {}) {
  const { json, headers, ...rest } = options;
  const userId = typeof window !== "undefined" ? getUserId() : null;
  const url = `${API_BASE_URL}${path}`;
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/97e0b5eb-0872-4c10-ba12-dd893008048d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:apiFetch',message:'apiFetch entry',data:{path,url,hasUserId:!!userId},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion
  const response = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(userId ? { "x-user-id": userId } : {}),
      ...(headers ?? {}),
    },
    body: json ? JSON.stringify(json) : rest.body,
  });

  // #region agent log
  const contentType = response.headers.get("content-type") ?? "";
  fetch('http://127.0.0.1:7243/ingest/97e0b5eb-0872-4c10-ba12-dd893008048d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:apiFetch',message:'apiFetch response',data:{path,status:response.status,ok:response.ok,contentType:contentType.slice(0,80)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  if (!response.ok) {
    const text = await response.text();
    let message = text;
    try {
      const json = JSON.parse(text);
      message = json.error || json.message || text;
    } catch {
      // Si no es JSON, usar el texto directamente
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/97e0b5eb-0872-4c10-ba12-dd893008048d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'client.ts:apiFetch',message:'apiFetch throwing',data:{path,status:response.status,messagePreview:String(message).slice(0,120),isHtml:typeof message==='string'&&message.includes('</')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion
    throw new Error(message || "Error en la petición");
  }

  return (await response.json()) as T;
}
