with open("src/styles.css", "r") as f:
    text = f.read()

import re

old_pos = """  visibility: hidden;
  opacity: 0;
  position: absolute;
  /* Bind to the h2 width instead of the icon to avoid clipping in the overflow panel */
  left: 0;
  top: 100%;
  margin-top: 8px;
  width: calc(100% - 10px);"""

new_pos = """  visibility: hidden;
  opacity: 0;
  position: absolute;
  left: 50%;
  bottom: calc(100% + 8px);
  transform: translateX(-50%);
  width: 240px;
  pointer-events: none;"""

text = text.replace(old_pos, new_pos)

old_before = """.info-tooltip::before {
  content: "";
  position: absolute;
  top: -5px;
  /* Da der Tooltip relative zum H2 ist, aber der Hover vom Icon ausgelöst wird,
     machen wir den Pfeil einfach mittig oder linksbündig */
  left: 20px;
  border-width: 0 6px 6px 6px;
  border-style: solid;
  border-color: transparent transparent #1a2330 transparent;
}"""

new_before = """.info-tooltip::before {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 6px 6px 0 6px;
  border-style: solid;
  border-color: #1a2330 transparent transparent transparent;
}"""

text = text.replace(old_before, new_before)

with open("src/styles.css", "w") as f:
    f.write(text)
