import { useState, useEffect } from "react";

const ALL_OFF_KEY = "fd_page_tours_off";
const pageKey = (name: string) => `fd_page_tour_${name}`;

export function usePageTour(name: string) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(ALL_OFF_KEY)) return;
    if (localStorage.getItem(pageKey(name))) return;
    setTimeout(() => setRun(true), 600);
  }, [name]);

  function finish() {
    localStorage.setItem(pageKey(name), "true");
    setRun(false);
  }

  function skipAll() {
    localStorage.setItem(ALL_OFF_KEY, "true");
    setRun(false);
  }

  return { run, setRun, finish, skipAll };
}

export function resetAllPageTours() {
  const keys = Object.keys(localStorage).filter(
    (k) => k.startsWith("fd_page_tour_") || k === ALL_OFF_KEY
  );
  keys.forEach((k) => localStorage.removeItem(k));
}

export function arePageToursOff() {
  return !!localStorage.getItem(ALL_OFF_KEY);
}
