"use client";

import {
  Euro,
  Car,
  CreditCard,
  Home,
  PiggyBank,
  ShoppingCart,
  Smartphone,
  Utensils,
  Plane,
  Film,
  HeartPulse,
  GraduationCap,
  Wallet,
  LineChart,
  Sparkles,
  BookOpen,
  Gift,
  Fuel,
  Beer,
  Bitcoin,
} from "lucide-react";

export const CATEGORY_ICON_MAP = {
  Home,
  Utensils,
  ShoppingCart,
  Car,
  Smartphone,
  CreditCard,
  Briefcase: Euro,
  PiggyBank,
  Plane,
  Film,
  HeartPulse,
  GraduationCap,
  Wallet,
  LineChart,
  Sparkles,
  BookOpen,
  Gift,
  Fuel,
  ShieldCheck: Beer,
  Droplet: Bitcoin,
};

export type CategoryIconKey = keyof typeof CATEGORY_ICON_MAP;
