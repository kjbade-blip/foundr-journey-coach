// The user's active business context, available anywhere in the app.
// Onboarding sets it once; later screens read it instead of asking again.

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getOnboardingState } from "./onboarding.functions";
import type { ActiveBusiness, OnboardingState } from "./onboarding/types";

export const ONBOARDING_STATE_KEY = ["onboarding-state"] as const;

export function useOnboardingState() {
  const fetchState = useServerFn(getOnboardingState);
  return useQuery<OnboardingState>({
    queryKey: ONBOARDING_STATE_KEY,
    queryFn: () => fetchState(),
    staleTime: 60_000,
  });
}

/** The active business, or null when the user has not chosen one. */
export function useActiveBusiness(): { business: ActiveBusiness | null; isLoading: boolean } {
  const { data, isLoading } = useOnboardingState();
  return { business: data?.activeBusiness ?? null, isLoading };
}

export function useRefreshOnboardingState() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ONBOARDING_STATE_KEY });
}

/** Best-effort location string for prefilling location-aware forms. */
export function businessLocationQuery(business: ActiveBusiness | null): string {
  if (!business) return "";
  return business.postcode || business.address || business.name;
}

export type { ActiveBusiness, OnboardingState };
