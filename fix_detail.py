with open("web/src/components/DetailPanel.tsx", "r") as f:
    text = f.read()

import re
text = re.sub(
    r'const color = BEREICH_COLORS\[b\.id\] \?\? "var\(--accent\)";\s*return \(\s*<div key=\{b\.id\} className="bereich-bar-row">\s*<div className="bereich-bar-label">\s*<span>\{b\.label\}<\/span>\s*<span className="bereich-bar-percent">\{pct\}%<\/span>\s*<\/div>\s*<div className="bereich-bar-bg">\s*<div \s*className="bereich-bar-fill" \s*style=\{\{ width: `\$\{pct\}%`, background: color \}\} \s*\/>\s*<\/div>\s*<\/div>\s*\);',
    r'''return (
                    <div key={b.id} className="bereich-bar-row">
                      <div className="bereich-bar-label">
                        <span>{b.label}</span>
                        <span className="bereich-bar-percent">{b.count}</span>
                      </div>
                      <div className="bereich-bar-bg">
                        <div 
                          className="bereich-bar-fill" 
                          style={{ width: `${pct}%`, background: "var(--accent)" }} 
                        />
                      </div>
                    </div>
                  );''',
    text,
    count=1,
    flags=re.DOTALL
)

with open("web/src/components/DetailPanel.tsx", "w") as f:
    f.write(text)
