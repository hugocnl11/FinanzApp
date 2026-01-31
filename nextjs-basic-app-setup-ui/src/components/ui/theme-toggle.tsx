"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { getSession, isDemoUser, updateSessionUser } from "@/lib/auth";
import { updateProfile } from "@/lib/api/auth";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleToggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    if (!isDemoUser()) {
      const session = getSession();
      const prefs = (session?.user?.preferences ?? {}) as Record<string, unknown>;
      updateProfile({ preferences: { ...prefs, theme: next } })
        .then((res) => {
          if (res?.data?.user?.preferences) {
            updateSessionUser({ preferences: res.data.user.preferences });
          }
        })
        .catch(() => {});
    }
  };

  if (!mounted) return null;

  return (
    <button
      aria-label="Cambiar tema"
      className="rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      onClick={handleToggle}
    >
      {theme === "dark" ? (
        <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.07l-.71.71M21 12h-1M4 12H3m16.66 5.66l-.71-.71M4.05 4.93l-.71-.71" />
          <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-gray-700 dark:text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
        </svg>
      )}
    </button>
  );
} 