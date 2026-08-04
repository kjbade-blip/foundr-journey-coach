import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "./auth-context";

export const DEFAULT_AUTHENTICATED_PATH = "/app/dashboard";

/** Where the visitor was heading before an OAuth round-trip. */
export const PENDING_REDIRECT_KEY = "foundr:pending-redirect";

/** Only allow same-origin paths as post-login destinations. */
export function safeRedirect(value: unknown): string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : DEFAULT_AUTHENTICATED_PATH;
}

export function validateAuthSearch(search: Record<string, unknown>): { redirect?: string } {
  const redirect = search["redirect"];
  return typeof redirect === "string" ? { redirect } : {};
}

/** Sends already signed-in visitors away from Login/Register. */
export function useRedirectIfAuthenticated(redirect?: string) {
  const { status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (status !== "authenticated") return;
    let target = redirect;
    if (!target && typeof window !== "undefined") {
      target = sessionStorage.getItem(PENDING_REDIRECT_KEY) ?? undefined;
      sessionStorage.removeItem(PENDING_REDIRECT_KEY);
    }
    void navigate({ to: safeRedirect(target), replace: true });
  }, [status, redirect, navigate]);
}
