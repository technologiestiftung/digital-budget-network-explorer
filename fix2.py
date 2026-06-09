with open("web/src/graph/buildGraph.ts", "r") as f:
    text = f.read()

# Update makeKeywordNode
text = text.replace(
"""    frequency: a.titelIds.size + a.fallbackCount,
    bereich: dominantBereich(a.bereichCounts),
    digSum: a.digSum,""",
"""    frequency: a.titelIds.size + a.fallbackCount,
    type: data.keywords[id]?.type ?? "other",
    digSum: a.digSum,"""
)

# Update Bipartit Nodes
text = text.replace(
"""        label: data.einzelplaene[ep]?.label ?? `Einzelplan ${ep}`,
        qid: data.einzelplaene[ep]?.qid ?? null,
        frequency: usage,
        bereich: null,
        digSum: epDig.get(ep) ?? 0,""",
"""        label: data.einzelplaene[ep]?.label ?? `Einzelplan ${ep}`,
        qid: data.einzelplaene[ep]?.qid ?? null,
        frequency: usage,
        type: null,
        digSum: epDig.get(ep) ?? 0,"""
)

with open("web/src/graph/buildGraph.ts", "w") as f:
    f.write(text)
