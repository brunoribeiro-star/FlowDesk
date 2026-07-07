import { useEffect, useState } from "react";

/**
 * Mirrors the `lg` Tailwind breakpoint (1024px) used across the app to
 * switch between the mobile bottom nav and the desktop sidebar.
 */
export function useIsMobile(breakpoint = 1024) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 0.02}px)`);
    const update = () => setIsMobile(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}
