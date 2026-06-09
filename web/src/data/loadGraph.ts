import type { GraphData } from "../types";

let cache: GraphData | null = null;

/** Laedt das vorberechnete graph.json (einmalig, danach aus Cache). */
export async function loadGraph(): Promise<GraphData> {
  if (cache) return cache;
  const url = `${import.meta.env.BASE_URL}data/graph.json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `graph.json konnte nicht geladen werden (${res.status}). ` +
        `Bitte zuerst "npm run data" ausfuehren.`,
    );
  }
  cache = (await res.json()) as GraphData;
  return cache;
}
