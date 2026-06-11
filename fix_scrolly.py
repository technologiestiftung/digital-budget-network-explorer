with open("web/src/story/Scrollytelling.tsx", "r") as f:
    text = f.read()

import re

# Update default in EMPTY_FILTERS in Scrollytelling
text = re.sub(
    r'minFrequency: 1,',
    r'minFrequency: 2,',
    text
)

with open("web/src/story/Scrollytelling.tsx", "w") as f:
    f.write(text)
