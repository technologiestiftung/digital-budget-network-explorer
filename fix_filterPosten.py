with open("web/src/graph/buildGraph.ts", "r") as f:
    text = f.read()

import re
text = re.sub(
    r'if \(f\.nurDigital && !\(p\.digW && p\.digW > 0\)\) return false;',
    '',
    text
)

with open("web/src/graph/buildGraph.ts", "w") as f:
    f.write(text)
