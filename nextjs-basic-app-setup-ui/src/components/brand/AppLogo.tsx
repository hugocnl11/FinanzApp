"use client";

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  variant?: "default" | "minimal";
  className?: string;
}

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

export function AppLogo({ 
  size = "md", 
  showText = false, 
  variant = "default",
  className = "" 
}: AppLogoProps) {
  const iconSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Icon with Gradient - Tracking Chart Design */}
      <div className={`relative flex ${iconSize} shrink-0 items-center justify-center overflow-hidden rounded-xl`}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full"
        >
          <defs>
            <linearGradient id="app-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.95" />
              <stop offset="50%" stopColor="#22c55e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="target-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
          </defs>
          
          {/* Background circle/square with rounded corners */}
          <rect x="4" y="4" width="32" height="32" rx="8" fill="url(#app-logo-gradient)" />
          
          {/* Target circles - outer to inner */}
          <circle cx="20" cy="20" r="12" fill="none" stroke="white" strokeWidth="1.5" opacity="0.4" />
          <circle cx="20" cy="20" r="8" fill="none" stroke="white" strokeWidth="1.5" opacity="0.6" />
          <circle cx="20" cy="20" r="4" fill="white" opacity="0.8" />
          
          {/* Center dot/bullseye */}
          <circle cx="20" cy="20" r="2" fill="url(#target-gradient)" />
        </svg>
      </div>

      {/* Text - Optional */}
      {showText && variant !== "minimal" && (
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-green-600 dark:from-blue-400 dark:to-green-400 bg-clip-text text-transparent truncate">
            FinanzApp
          </span>
          <span className="text-[10px] text-muted-foreground tracking-wide">
            Gestión Inteligente
          </span>
        </div>
      )}
    </div>
  );
}
