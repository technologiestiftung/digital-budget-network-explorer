with open("web/src/components/FilterPanel.tsx", "r") as f:
    text = f.read()

import re
text = re.sub(r'const setNurDigital = useStore\(\(s\) => s\.setNurDigital\);\n', '', text)

with open("web/src/components/FilterPanel.tsx", "w") as f:
    f.write(text)
