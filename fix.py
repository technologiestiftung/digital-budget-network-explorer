with open("preprocess_graph.py", "r") as f:
    text = f.read()

text = text.replace(
"""        kl_obj = g.value(s, DH.digiKlasse)
        kl = None
        if kl_obj is not None:
            kl = local_name(kl_obj)
            if kl not in klassen:
                klassen[kl] = first_label(g, kl_obj) or kl""",
"""        kl_obj = g.value(s, DH.digiKlasse)
        kl = None
        if kl_obj is not None:
            kl = local_name(kl_obj)
            # "Nicht digital" (Klasse 0) komplett ausschliessen
            if kl == "0":
                continue
            if kl not in klassen:
                klassen[kl] = first_label(g, kl_obj) or kl"""
)

with open("preprocess_graph.py", "w") as f:
    f.write(text)
