// Client-side persistence for the premises workspace: the user's requirements,
// saved shortlist, hidden adverts, comparison set and any advert they have
// pasted in themselves. Stored locally so the workspace survives a refresh.

import { useCallback, useEffect, useState } from "react";
import type { PropertyListing, PropertyRequirements } from "./types";

const KEY = "foundr.premises.v1";

export interface PremisesState {
  requirements: PropertyRequirements | null;
  saved: PropertyListing[];
  hiddenIds: string[];
  compareIds: string[];
  userListings: PropertyListing[];
}

const EMPTY: PremisesState = { requirements: null, saved: [], hiddenIds: [], compareIds: [], userListings: [] };

export function defaultRequirements(partial: Partial<PropertyRequirements> = {}): PropertyRequirements {
  return {
    businessTypeKey: "coffee_shop",
    location: "",
    radiusMiles: 3,
    budgetMonthlyMin: null,
    budgetMonthlyMax: null,
    minSqFt: null,
    maxSqFt: null,
    propertyTypes: [],
    requiredFeatures: [],
    leaseLengthYears: null,
    moveInBy: null,
    staffCount: null,
    customerCapacity: null,
    notes: "",
    ...partial,
  };
}

function read(): PremisesState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as PremisesState) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function usePremisesStore() {
  const [state, setState] = useState<PremisesState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(read());
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<PremisesState> | ((s: PremisesState) => Partial<PremisesState>)) => {
    setState((prev) => {
      const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) };
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — the session still works, it just will not persist */
      }
      return next;
    });
  }, []);

  const toggleSave = useCallback(
    (listing: PropertyListing) =>
      update((s) => ({
        saved: s.saved.some((l) => l.id === listing.id) ? s.saved.filter((l) => l.id !== listing.id) : [...s.saved, listing],
      })),
    [update],
  );

  const toggleHide = useCallback(
    (id: string) =>
      update((s) => ({ hiddenIds: s.hiddenIds.includes(id) ? s.hiddenIds.filter((x) => x !== id) : [...s.hiddenIds, id] })),
    [update],
  );

  const toggleCompare = useCallback(
    (id: string) =>
      update((s) => ({
        compareIds: s.compareIds.includes(id)
          ? s.compareIds.filter((x) => x !== id)
          : [...s.compareIds, id].slice(-4),
      })),
    [update],
  );

  const addUserListing = useCallback(
    (listing: PropertyListing) => update((s) => ({ userListings: [listing, ...s.userListings] })),
    [update],
  );

  const removeUserListing = useCallback(
    (id: string) => update((s) => ({ userListings: s.userListings.filter((l) => l.id !== id) })),
    [update],
  );

  const setRequirements = useCallback((requirements: PropertyRequirements) => update({ requirements }), [update]);

  return {
    ...state,
    hydrated,
    setRequirements,
    toggleSave,
    toggleHide,
    toggleCompare,
    addUserListing,
    removeUserListing,
  };
}
