with open("web/src/graph/buildGraph.ts", "r") as f:
    text = f.read()

text = text.replace(
"""export function filterPosten(data: GraphData, f: Filters): Posten[] {
  const useJahr = f.jahr !== null;
  const useBer = f.bereiche.size > 0;
  const useKl = f.klassen.size > 0;
  const useEp = f.einzelplaene.size > 0;

  return data.posten.filter((p) => {
    if (useJahr && p.jahr !== f.jahr) return false;
    if (useBer && (p.ber == null || !f.bereiche.has(p.ber))) return false;
    if (useKl && (p.kl == null || !f.klassen.has(p.kl))) return false;
    if (useEp && (p.ep == null || !f.einzelplaene.has(p.ep))) return false;
    if (f.nurDigital && !(p.digW && p.digW > 0)) return false;
    return true;
  });
}""",
"""export function filterPosten(data: GraphData, f: Filters): Posten[] {
  const useJahr = f.jahr !== null;
  const useBer = f.bereiche.size > 0;
  const useKl = f.klassen.size > 0;
  const useEp = f.einzelplaene.size > 0;
  const useHg = f.hauptgruppen.size > 0;
  const useHf = f.hauptfunktionen.size > 0;

  return data.posten.filter((p) => {
    if (useJahr && p.jahr !== f.jahr) return false;
    if (useBer && (p.ber == null || !f.bereiche.has(p.ber))) return false;
    if (useKl && (p.kl == null || !f.klassen.has(p.kl))) return false;
    if (useEp && (p.ep == null || !f.einzelplaene.has(p.ep))) return false;
    if (useHg && (p.hg == null || !f.hauptgruppen.has(p.hg))) return false;
    if (useHf && (p.hf == null || !f.hauptfunktionen.has(p.hf))) return false;
    if (f.nurDigital && !(p.digW && p.digW > 0)) return false;
    return true;
  });
}"""
)

with open("web/src/graph/buildGraph.ts", "w") as f:
    f.write(text)
