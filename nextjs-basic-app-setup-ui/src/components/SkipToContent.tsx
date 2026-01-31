"use client";

import { useCallback } from "react";

const MAIN_ID = "main-content";

export function SkipToContent() {
  const handleClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const main = document.getElementById(MAIN_ID);
    if (main) {
      main.focus({ preventScroll: false });
      main.scrollIntoView();
    }
  }, []);

  return (
    <a
      href={`#${MAIN_ID}`}
      onClick={handleClick}
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      Saltar al contenido principal
    </a>
  );
}
