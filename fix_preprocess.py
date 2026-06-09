with open("preprocess_graph.py", "r") as f:
    lines = f.readlines()

out = []
i = 0
while i < len(lines):
    line = lines[i]
    if "    titel_count = len(titel)" in line:
        out.append(line)
        # Insert the missing blocks here!
        out.append("""
    # --- Keywords (skos:Concept im keyword-Namespace) ---
    for s in g.subjects(RDF.type, SKOS.Concept):
        su = str(s)
        if not su.startswith(KEYWORD_PREFIX):
            continue
        kid = local_name(su)
        label = g.value(s, SKOS.prefLabel)
        qid = None
        # skos:exactMatch -> Wikidata QID des Keywords
        for m in g.objects(s, SKOS.exactMatch):
            q = qid_from(m)
            if q:
                qid = q
                break
        keywords[kid] = {
            "label": str(label) if label is not None else kid,
            "qid": qid,
        }

    # --- Einzelplaene (schema:GovernmentOrganization) ---
    for s in g.subjects(RDF.type, SCHEMA.GovernmentOrganization):
        eid = local_name(s)
        qid = None
        for m in g.objects(s, OWL.sameAs):
            q = qid_from(m)
            if q:
                qid = q
                break
        einzelplaene[eid] = {
            "label": first_label(g, s) or eid,
            "qid": qid,
        }
""")
    else:
        out.append(line)
    i += 1

with open("preprocess_graph.py", "w") as f:
    f.writelines(out)
