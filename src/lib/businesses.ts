// Client-side helpers for multi-business support.
import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import {
  addMyBusiness,
  listMyBusinesses,
  makeBusinessActive,
  removeMyBusiness,
  type MyBusinessesResult,
} from "./businesses.functions";
import { ONBOARDING_STATE_KEY } from "./active-business";
import type { ActiveBusiness } from "./onboarding/types";

export const MY_BUSINESSES_KEY = ["my-businesses"] as const;

export function useMyBusinesses() {
  const fetchAll = useServerFn(listMyBusinesses);
  return useQuery<MyBusinessesResult>({
    queryKey: MY_BUSINESSES_KEY,
    queryFn: () => fetchAll(),
    staleTime: 30_000,
  });
}

export function useBusinessMutations() {
  const queryClient = useQueryClient();
  const add = useServerFn(addMyBusiness);
  const remove = useServerFn(removeMyBusiness);
  const activate = useServerFn(makeBusinessActive);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: MY_BUSINESSES_KEY });
    void queryClient.invalidateQueries({ queryKey: ONBOARDING_STATE_KEY });
  };

  return {
    add: useMutation({
      mutationFn: (data: Parameters<typeof add>[0]["data"]) => add({ data }),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => remove({ data: { id } }),
      onSuccess: invalidate,
    }),
    activate: useMutation({
      mutationFn: (id: string) => activate({ data: { id } }),
      onSuccess: invalidate,
    }),
  };
}

/* ---------------- Which businesses the Grow screens report on --------------- */

const SELECTION_KEY = "foundr.selectedBusinesses";
const SELECTION_EVENT = "foundr:business-selection";

function readSelection(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SELECTION_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeSelection(ids: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SELECTION_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event(SELECTION_EVENT));
}

/**
 * The businesses currently ticked in the Grow menu. Defaults to all of them
 * so a single-business user never sees an empty view.
 */
export function useBusinessSelection(businesses: ActiveBusiness[] | undefined) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(readSelection());
    const handler = () => setIds(readSelection());
    window.addEventListener(SELECTION_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(SELECTION_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const all = businesses ?? [];
  const known = ids.filter((id) => all.some((b) => b.id === id));
  const selectedIds = known.length ? known : all.map((b) => b.id);

  const toggle = useCallback(
    (id: string) => {
      const current = readSelection().filter((v) => all.some((b) => b.id === v));
      const base = current.length ? current : all.map((b) => b.id);
      const next = base.includes(id) ? base.filter((v) => v !== id) : [...base, id];
      writeSelection(next.length ? next : [id]);
    },
    [all],
  );

  const selectAll = useCallback(() => writeSelection(all.map((b) => b.id)), [all]);
  const selectOnly = useCallback((id: string) => writeSelection([id]), []);

  return {
    selectedIds,
    selected: all.filter((b) => selectedIds.includes(b.id)),
    toggle,
    selectAll,
    selectOnly,
  };
}
