export type Mode = "start" | "grow";

const KEY = "foundr.mode";

export function getMode(): Mode | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(KEY);
  return v === "start" || v === "grow" ? v : null;
}

export function setMode(m: Mode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, m);
  window.dispatchEvent(new Event("foundr:mode"));
}
