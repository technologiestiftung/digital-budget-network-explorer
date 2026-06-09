import { create } from "zustand";
import type { Filters, GraphData, GraphMode } from "./types";

function emptyFilters(): Filters {
  return {
    jahre: new Set<number>(),
    bereiche: new Set<string>(),
    klassen: new Set<string>(),
    einzelplaene: new Set<string>(),
    minFrequency: 2,
    nurDigital: false,
  };
}

export type AppView = "story" | "explore";

interface AppState {
  data: GraphData | null;
  loading: boolean;
  error: string | null;

  view: AppView;
  mode: GraphMode;
  filters: Filters;
  selectedNodeId: string | null;
  search: string;

  setData: (data: GraphData) => void;
  setError: (msg: string) => void;
  setView: (view: AppView) => void;
  setMode: (mode: GraphMode) => void;

  toggleSetFilter: (
    key: "bereiche" | "klassen" | "einzelplaene",
    value: string,
  ) => void;
  toggleJahr: (jahr: number) => void;
  setMinFrequency: (n: number) => void;
  setNurDigital: (v: boolean) => void;
  resetFilters: () => void;

  selectNode: (id: string | null) => void;
  setSearch: (s: string) => void;
}

export const useStore = create<AppState>((set) => ({
  data: null,
  loading: true,
  error: null,

  view: "story",
  mode: "keyword",
  filters: emptyFilters(),
  selectedNodeId: null,
  search: "",

  setData: (data) => set({ data, loading: false, error: null }),
  setError: (msg) => set({ error: msg, loading: false }),
  setView: (view) => set({ view }),
  setMode: (mode) => set({ mode, selectedNodeId: null }),

  toggleSetFilter: (key, value) =>
    set((state) => {
      const next = new Set(state.filters[key]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { filters: { ...state.filters, [key]: next } };
    }),

  toggleJahr: (jahr) =>
    set((state) => {
      const next = new Set(state.filters.jahre);
      if (next.has(jahr)) next.delete(jahr);
      else next.add(jahr);
      return { filters: { ...state.filters, jahre: next } };
    }),

  setMinFrequency: (n) =>
    set((state) => ({ filters: { ...state.filters, minFrequency: n } })),

  setNurDigital: (v) =>
    set((state) => ({ filters: { ...state.filters, nurDigital: v } })),

  resetFilters: () => set({ filters: emptyFilters() }),

  selectNode: (id) => set({ selectedNodeId: id }),
  setSearch: (s) => set({ search: s }),
}));
