with open("web/src/colors.ts", "r") as f:
    text = f.read()

import re
text = re.sub(
    r'// Farbpalette fuer die Digitalisierungsbereiche.*?};\n\n',
    '',
    text,
    flags=re.DOTALL
)

with open("web/src/colors.ts", "w") as f:
    f.write(text)
