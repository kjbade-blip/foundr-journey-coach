import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "./auth-context";

export const DEFAULT_AUTHENTICATED_PATH = "/app/dashboard";

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
    if (status === "authenticated") {
      void navigate({ to: safeRedirect(redirect), replace: true });
    }
  }, [status, redirect, navigate]);
}
