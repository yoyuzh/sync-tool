import { useEffect, useState } from "react";
import type { ViewMode } from "../types/ui";

const MOBILE_BREAKPOINT = 880;

function getMode(width: number): ViewMode {
  return width < MOBILE_BREAKPOINT ? "mobile" : "desktop";
}

export function useResponsiveMode(): ViewMode {
  const [mode, setMode] = useState<ViewMode>(() => getMode(window.innerWidth));

  useEffect(() => {
    function handleResize() {
      setMode(getMode(window.innerWidth));
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return mode;
}
