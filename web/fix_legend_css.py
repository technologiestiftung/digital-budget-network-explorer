import re

with open("src/styles.css", "r") as f:
    text = f.read()

text = re.sub(r'/\* ---------- Legend ---------- \*/.*?(?=\/\*|padding: 0;)', '', text, flags=re.DOTALL)
text = re.sub(r'\.legend \{[^}]+\}', '', text)
text = re.sub(r'\.legend-stats \{[^}]+\}', '', text)
text = re.sub(r'\.legend-items \{[^}]+\}', '', text)
text = re.sub(r'\.legend-item \{[^}]+\}', '', text)

new_legend_css = """
/* ---------- Legend ---------- */
.legend {
  position: absolute;
  left: 14px;
  bottom: 14px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--border);
  border-radius: 10px;
  width: 220px;
  backdrop-filter: blur(4px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 20;
}

.legend-toggle {
  background: none;
  border: none;
  width: 100%;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  outline: none;
}

.legend-toggle:hover {
  background: rgba(0,0,0,0.03);
}

.legend-chevron {
  font-size: 10px;
  color: var(--muted);
}

.legend-content {
  padding: 0 14px 14px;
  border-top: 1px solid var(--border);
  margin-top: 2px;
  padding-top: 12px;
}

.legend-stats {
  font-size: 11.5px;
  color: var(--muted);
  margin-bottom: 12px;
  line-height: 1.4;
}

.legend-stats strong {
  color: var(--text);
}

.legend-section-title {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  font-weight: 600;
  margin-bottom: 8px;
}

.legend-items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: #34425a;
}
"""

with open("src/styles.css", "w") as f:
    f.write(text + "\n" + new_legend_css)
