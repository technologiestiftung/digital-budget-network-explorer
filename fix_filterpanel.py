with open("web/src/components/FilterPanel.tsx", "r") as f:
    text = f.read()

import re

# Remove the inline definition
text = re.sub(
    r'function InfoTooltip\(\{ text \}: \{ text: string \}\) \{\s*return \(\s*<span className="info-icon-wrapper".*?<\/svg>\s*<span className="info-tooltip">\{text\}<\/span>\s*<\/span>\s*\);\s*\}',
    '',
    text,
    flags=re.DOTALL
)

# Add the import
text = text.replace('import { useStore } from "../store";', 'import { useStore } from "../store";\nimport InfoTooltip from "./InfoTooltip";')

with open("web/src/components/FilterPanel.tsx", "w") as f:
    f.write(text)
