// ============================================
//  useFetchJson.ts
//
//  One generic hook for "load JSON from a GET endpoint, track
//  loading/error state, and let the caller refetch on demand".
//
//  Every garden panel (Pond, Memory Tree, Notes, Workshop, Scene)
//  needs this exact same loading/error/refetch shape — pulling it
//  out here means each panel file only contains rendering logic,
//  not its own copy of fetch + try/catch + state wiring.
//
//  Usage:
//    const { data, loading, error, refetch } = useFetchJson<Flower[]>("/api/flowers");
// ============================================

import { useCallback, useEffect, useState } from "react";

interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string;
}

export function useFetchJson<T>(url: string | null) {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: !!url,
    error: "",
  });

  const load = useCallback(async () => {
    if (!url) return;
    setState((s) => ({ ...s, loading: true, error: "" }));
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as T;
      setState({ data, loading: false, error: "" });
    } catch (err) {
      setState({
        data: null,
        loading: false,
        error: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}
