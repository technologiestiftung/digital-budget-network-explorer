with open("web/src/components/FilterPanel.tsx", "r") as f:
    text = f.read()

# 1. Wir extrahieren die Bloecke
import re

def extract_block(pattern, text):
    match = re.search(pattern, text, re.DOTALL)
    if not match:
        raise Exception(f"Could not find block: {pattern[:20]}")
    return match.group(0), text.replace(match.group(0), "")

# Extract Knotengroesse
knotengroesse_pattern = r'<h2 style={{ marginTop: 16 }}>\s*Knotengröße nach.*?</div>'
knotengroesse_block, text = extract_block(knotengroesse_pattern, text)

# Extract Mindesthaeufigkeit
mindest_pattern = r'<div className="filter-accordion" style={{ paddingBottom: "12px" }}>\s*<h2\s*style={{\s*marginTop: "12px",\s*display: "flex",\s*justifyContent: "space-between",\s*}}>\s*<span>\s*Mindesthäufigkeit.*?</div>\s*</div>'
mindest_block, text = extract_block(mindest_pattern, text)

# Extract Einzelplan
einzelplan_pattern = r'<details className="filter-accordion">\s*<summary>\s*<h2>\s*Einzelplan \(Ressort\).*?</details>'
einzelplan_block, text = extract_block(einzelplan_pattern, text)

# 2. Wir fuegen sie wieder in der richtigen Reihenfolge ein

# Einzelplan an den Anfang der erweiteten Filter
text = text.replace(
    '<summary>Erweiterte Filtermöglichkeiten</summary>',
    '<summary>Erweiterte Filtermöglichkeiten</summary>\n\n          ' + einzelplan_block
)

# Mindesthaeufigkeit und Knotengroesse ans Ende der erweiteten Filter
text = text.replace(
    '</details>\n      </div>',
    mindest_block + '\n\n          <div className="filter-accordion" style={{ paddingBottom: "12px", borderBottom: "none" }}>\n            ' + knotengroesse_block + '\n          </div>\n        </details>\n      </div>'
)

with open("web/src/components/FilterPanel.tsx", "w") as f:
    f.write(text)
