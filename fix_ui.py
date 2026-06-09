with open("web/src/components/FilterPanel.tsx", "r") as f:
    text = f.read()

import re
text = re.sub(
    r'<label className="checkbox">\s*<input\s*type="checkbox"\s*checked=\{filters\.nurDigital\}\s*onChange=\{\(e\) => setNurDigital\(e\.target\.checked\)\}\s*\/>\s*Nur Posten mit digitalem Anteil\s*<\/label>',
    '',
    text,
    flags=re.DOTALL
)

with open("web/src/components/FilterPanel.tsx", "w") as f:
    f.write(text)
