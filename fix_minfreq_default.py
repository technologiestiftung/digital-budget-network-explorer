with open("web/src/store.ts", "r") as f:
    text = f.read()

import re
text = re.sub(
    r'minFrequency: 2,',
    r'minFrequency: 1,',
    text
)

with open("web/src/store.ts", "w") as f:
    f.write(text)
