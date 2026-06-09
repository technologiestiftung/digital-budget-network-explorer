with open("web/src/components/FilterPanel.tsx", "r") as f:
    text = f.read()

old_block = """          <details className="filter-accordion">
            <summary>
              Mindesthäufigkeit: <strong>{filters.minFrequency}</strong>
            </summary>
            <div className="filter-accordion-content">
              <input
                type="range"
                min={1}
                max={20}
                value={filters.minFrequency}
                onChange={(e) => setMinFrequency(Number(e.target.value))}
              />
            </div>
          </details>"""

new_block = """          <div className="filter-accordion" style={{ paddingBottom: '12px' }}>
            <h2 style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between' }}>
              Mindesthäufigkeit
              <strong style={{ color: 'var(--text)' }}>{filters.minFrequency}</strong>
            </h2>
            <div className="filter-accordion-content" style={{ paddingTop: '4px' }}>
              <input
                type="range"
                min={1}
                max={20}
                value={filters.minFrequency}
                onChange={(e) => setMinFrequency(Number(e.target.value))}
              />
            </div>
          </div>"""

# There might be formatting differences, let's use a regex instead for safety
import re

text = re.sub(
    r'<details className="filter-accordion">\s*<summary>\s*Mindesthäufigkeit: <strong>\{filters\.minFrequency\}</strong>\s*</summary>\s*<div className="filter-accordion-content">\s*<input\s*type="range"\s*min=\{1\}\s*max=\{20\}\s*value=\{filters\.minFrequency\}\s*onChange=\{\(e\) => setMinFrequency\(Number\(e\.target\.value\)\)\}\s*/>\s*</div>\s*</details>',
    new_block.replace('$', '\\$'), # escape if needed, though no $ here
    text,
    flags=re.DOTALL
)

with open("web/src/components/FilterPanel.tsx", "w") as f:
    f.write(text)

