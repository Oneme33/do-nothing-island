"""Add the game to the existing personal-project list; preserve a server-side backup."""
from pathlib import Path
import re, shutil, sys
page, backup = map(Path, sys.argv[1:3])
html = page.read_text()
match = re.search(r'<li class="projects">[\s\S]*?</details>\s*</li>', html)
if not match:
    raise SystemExit('Personal-project list not found; no changes made.')
section = match.group()
if '/do-nothing-island/' not in section:
    entry = '''            <li>
              <a class="row" href="https://coenvermeer.nl/do-nothing-island/" rel="noopener">
                <svg class="stroke" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18c2-3 14-3 16 0-2 3-14 3-16 0ZM12 16V7M8 10l4-6 4 6M7 13l5-7 5 7"/></svg>
                <span class="label">Doe Niks Eiland</span>
                <span class="sub">Een eiland dat vanzelf groeit · Webgame</span>
              </a>
            </li>
          '''
    section = section.replace('</ul>', entry + '</ul>', 1)
# The existing project list is alphabetical; Doe Niks Eiland belongs first.
game = re.search(r'\s*<li>\s*<a class="row" href="https://coenvermeer.nl/do-nothing-island/"[\s\S]*?</a>\s*</li>', section)
if game:
    entry = game.group()
    section = section[:game.start()] + section[game.end():]
    section = section.replace('<ul>', '<ul>' + entry, 1)
count = len(re.findall(r'<a\b', section))
section = re.sub(r'<span class="sub">\d+ projecten</span>', f'<span class="sub">{count} projecten</span>', section, count=1)
updated = html[:match.start()] + section + html[match.end():]
if '.projects li:nth-child(7)' not in updated:
    updated = updated.replace('.projects li:nth-child(6) { --j: 5; }', '.projects li:nth-child(6) { --j: 5; } .projects li:nth-child(7) { --j: 6; }', 1)
if updated != html:
    backup.parent.mkdir(parents=True, exist_ok=True)
    if not backup.exists():
        shutil.copy2(page, backup)
    page.write_text(updated)
print(f'Personal projects: {count}; game link present; backup: {backup}')
