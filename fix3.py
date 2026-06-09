with open("web/src/graph/buildGraph.ts", "r") as f:
    text = f.read()

import re
# Safely remove the dominantBereich function
text = re.sub(r'function dominantBereich.*?return best;\n}', '', text, flags=re.DOTALL)

with open("web/src/graph/buildGraph.ts", "w") as f:
    f.write(text)
