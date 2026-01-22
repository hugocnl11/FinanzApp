"use client";

const STORAGE_PREFIX = "finanzapp";
const STORAGE_VERSION = "v1";

const buildKey = (key: string) => `${STORAGE_PREFIX}:${STORAGE_VERSION}:${key}`;

export function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(buildKey(key));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error("Error cargando localStorage", error);
    return fallback;
  }
}

export function saveToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(buildKey(key), JSON.stringify(value));
  } catch (error) {
    console.error("Error guardando localStorage", error);
  }
}

export function clearStorage(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(buildKey(key));
  } catch (error) {
    console.error("Error limpiando localStorage", error);
  }
}
