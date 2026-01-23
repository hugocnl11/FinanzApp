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

export type AuthResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};
