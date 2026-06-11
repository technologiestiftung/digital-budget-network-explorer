import { create } from "zustand";
import type { Filters, GraphData, GraphMode } from "./types";

function emptyFilters(): Filters {
  return {
    jahr: 2025,
    bereiche: new Set<string>(),
    klassen: new Set<string>(),
    einzelplaene: new Set<string>(),
    hauptgruppen: new Set<string>(),
    hauptfunktionen: new Set<string>(),
    minFrequency: 1,
    nurDigital: false,
  };
}

export type AppView = "story" | "explore";
export type NodeSizeMetric = "count" | "budget";

const initialView: AppView = 
  typeof window !== "undefined" && window.location.pathname.includes("/explorer") 
    ? "explore" 
    : "story";

interface AppState {
  data: GraphData | null;
  loading: boolean;
  error: string | null;

  view: AppView;
  mode: GraphMode;
  nodeSizeMetric: NodeSizeMetric;
  filters: Filters;
  selectedNodeId: string | null;
  search: string;
  mobileFilterOpen: boolean;

  setData: (data: GraphData) => void;
  setError: (msg: string) => void;
  setView: (view: AppView) => void;
  setMode: (mode: GraphMode) => void;
  setNodeSizeMetric: (metric: NodeSizeMetric) => void;

  toggleSetFilter: (
    key: "bereiche" | "klassen" | "einzelplaene" | "hauptgruppen" | "hauptfunktionen",
    value: string,
  ) => void;
  setJahr: (jahr: number | null) => void;
  setMinFrequency: (n: number) => void;
  setNurDigital: (v: boolean) => void;
  resetFilters: () => void;

  selectNode: (id: string | null) => void;
  setSearch: (s: string) => void;
  setMobileFilterOpen: (b: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  data: null,
  loading: true,
  error: null,

  view: initialView,
  mode: "bipartite",
  nodeSizeMetric: "count",
  filters: emptyFilters(),
  selectedNodeId: null,
  search: "",
  mobileFilterOpen: false,

  setData: (data) => set({ data, loading: false, error: null }),
  setError: (msg) => set({ error: msg, loading: false }),
  setView: (view) => set({ view }),
  setMode: (mode) => set({ mode, selectedNodeId: null }),
  setNodeSizeMetric: (metric) => set({ nodeSizeMetric: metric }),

  toggleSetFilter: (key, value) =>
    set((state) => {
      const next = new Set(state.filters[key]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { filters: { ...state.filters, [key]: next } };
    }),

  setJahr: (jahr) =>
    set((state) => ({ filters: { ...state.filters, jahr } })),

  setMinFrequency: (n) =>
    set((state) => ({ filters: { ...state.filters, minFrequency: n } })),

  setNurDigital: (v) =>
    set((state) => ({ filters: { ...state.filters, nurDigital: v } })),

  resetFilters: () => set({ filters: emptyFilters() }),

  selectNode: (id) => set({ selectedNodeId: id }),
  setSearch: (s) => set({ search: s }),
  setMobileFilterOpen: (b) => set({ mobileFilterOpen: b }),
}));
