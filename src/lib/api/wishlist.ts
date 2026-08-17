"use client";

import { apiFetch } from "./client";
import type { ApiResponse } from "./types";
import type { WishlistColumn, WishlistItem } from "@/lib/dashboard/types";
import { isDemoUser } from "@/lib/auth";

const DEMO_STORAGE_KEY = "finanzapp:wishlist";

const DEMO_SEED: WishlistItem[] = [
  {
    id: "wish-1",
    title: "Cafetera superautomática",
    price: 429,
    notes: "Me apetece, pero no es urgente.",
    column: "undecided",
    sortOrder: 0,
  },
  {
    id: "wish-2",
    title: "iPhone",
    price: 1299,
    notes: "El actual todavía va bien.",
    column: "undecided",
    sortOrder: 1,
  },
  {
    id: "wish-3",
    title: "Sofá",
    price: 799,
    notes: "El de ahora está al límite.",
    column: "short",
    sortOrder: 0,
  },
  {
    id: "wish-4",
    title: "Bicicleta gravel",
    price: 1890,
    column: "medium",
    sortOrder: 0,
  },
  {
    id: "wish-5",
    title: "Viaje a Japón",
    price: 3500,
    notes: "Ilusión, no necesidad.",
    column: "long",
    sortOrder: 0,
  },
];

function readDemoStore(): WishlistItem[] {
  if (typeof window === "undefined") return DEMO_SEED.map((item) => ({ ...item }));
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(DEMO_SEED));
      return DEMO_SEED.map((item) => ({ ...item }));
    }
    const parsed = JSON.parse(raw) as WishlistItem[];
    return Array.isArray(parsed) ? parsed : DEMO_SEED.map((item) => ({ ...item }));
  } catch {
    return DEMO_SEED.map((item) => ({ ...item }));
  }
}

function writeDemoStore(items: WishlistItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(items));
}

export function fetchWishlist() {
  if (isDemoUser()) {
    return Promise.resolve({ data: readDemoStore() } as ApiResponse<WishlistItem[]>);
  }
  return apiFetch<ApiResponse<WishlistItem[]>>("/wishlist");
}

export function createWishlistItem(payload: Omit<WishlistItem, "id" | "sortOrder"> & { sortOrder?: number }) {
  if (isDemoUser()) {
    const items = readDemoStore();
    const sameColumn = items.filter((item) => item.column === payload.column);
    const created: WishlistItem = {
      ...payload,
      id: `wish-${Date.now()}`,
      sortOrder: payload.sortOrder ?? sameColumn.length,
    };
    writeDemoStore([...items, created]);
    return Promise.resolve({ data: created } as ApiResponse<WishlistItem>);
  }
  return apiFetch<ApiResponse<WishlistItem>>("/wishlist", { method: "POST", json: payload });
}

export function updateWishlistItem(id: string, payload: Partial<WishlistItem>) {
  if (isDemoUser()) {
    const items = readDemoStore();
    const index = items.findIndex((item) => item.id === id);
    if (index < 0) {
      return Promise.reject(new Error("Objeto no encontrado"));
    }
    items[index] = { ...items[index], ...payload, id };
    writeDemoStore(items);
    return Promise.resolve({ data: { ...items[index] } } as ApiResponse<WishlistItem>);
  }
  return apiFetch<ApiResponse<WishlistItem>>(`/wishlist/${id}`, { method: "PUT", json: payload });
}

export function deleteWishlistItem(id: string) {
  if (isDemoUser()) {
    writeDemoStore(readDemoStore().filter((item) => item.id !== id));
    return Promise.resolve({ data: { success: true } } as ApiResponse<{ success: boolean }>);
  }
  return apiFetch<ApiResponse<{ success: boolean }>>(`/wishlist/${id}`, { method: "DELETE" });
}

export function moveWishlistItem(id: string, column: WishlistColumn) {
  return updateWishlistItem(id, { column });
}
