with open("web/src/styles.css", "r") as f:
    text = f.read()

# Remove position: relative from .info-icon-wrapper
text = text.replace(
""".info-icon-wrapper {
  position: relative;
  display: inline-flex;""",
""".info-icon-wrapper {
  display: inline-flex;"""
)

with open("web/src/styles.css", "w") as f:
    f.write(text)
