"use client";

import {
  Briefcase,
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
  ShieldCheck,
  Droplet,
} from "lucide-react";

export const CATEGORY_ICON_MAP = {
  Home,
  Utensils,
  ShoppingCart,
  Car,
  Smartphone,
  CreditCard,
  Briefcase,
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
  ShieldCheck,
  Droplet,
};

export type CategoryIconKey = keyof typeof CATEGORY_ICON_MAP;
