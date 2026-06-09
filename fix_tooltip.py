with open("web/src/styles.css", "r") as f:
    text = f.read()

import re

# Remove the old tooltip overrides at the bottom
text = re.sub(r'/\* ---------- Tooltip Position Override ---------- \*/.*', '', text, flags=re.DOTALL)

# Replace the original tooltip CSS
old_css = """
.info-tooltip {
  visibility: hidden;
  opacity: 0;
  position: absolute;
  left: 24px;
  top: 50%;
  transform: translateY(-50%);
  width: 220px;
  background: #1a2330;
  color: #fff;
  font-size: 11.5px;
  padding: 8px 12px;
  border-radius: 6px;
  z-index: 100;
  line-height: 1.4;
  font-weight: 400;
  text-transform: none;
  letter-spacing: normal;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: opacity 0.2s, visibility 0.2s;
}

.info-tooltip::before {
  content: "";
  position: absolute;
  left: -4px;
  top: 50%;
  transform: translateY(-50%);
  border-width: 5px 5px 5px 0;
  border-style: solid;
  border-color: transparent #1a2330 transparent transparent;
}"""

new_css = """
.info-tooltip {
  visibility: hidden;
  opacity: 0;
  position: absolute;
  /* Bind to the h2 width instead of the icon to avoid clipping in the overflow panel */
  left: 0;
  top: 100%;
  margin-top: 8px;
  width: calc(100% - 10px);
  background: #1a2330;
  color: #fff;
  font-size: 11.5px;
  padding: 10px 14px;
  border-radius: 6px;
  z-index: 100;
  line-height: 1.4;
  font-weight: 400;
  text-transform: none;
  letter-spacing: normal;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  transition: opacity 0.2s, visibility 0.2s;
  pointer-events: none;
}

/* Der Pfeil zeigt nach oben */
.info-tooltip::before {
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

text = text.replace(old_css.strip(), new_css.strip())

# Make sure .panel h2 is position: relative
if "position: relative;" not in text.split(".panel h2 {")[1].split("}")[0]:
    text = text.replace(".panel h2 {\n  display: flex;\n  align-items: center;\n}", ".panel h2 {\n  display: flex;\n  align-items: center;\n  position: relative;\n}")

with open("web/src/styles.css", "w") as f:
    f.write(text)
