"use client";

export type ApiResponse<T> = {
  data: T;
  message?: string;
};

export type AuthPayload = {
  email: string;
  password: string;
  name?: string;
};

export type ChartWidgetsPref = {
  visible: string[];
  order: string[];
};

export type UserPreferences = {
  theme?: "light" | "dark" | "system";
  language?: string;
  currency?: string;
  weekStartsOn?: string;
  notifications?: boolean;
  chartWidgets?: ChartWidgetsPref;
  onboardingWizardSeen?: boolean;
};

export type AuthResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
    preferences?: UserPreferences | Record<string, unknown> | null;
  };
};
