# Do Nothing Island — AI-werkwijze

## Klein werken, snel beoordelen
- Eén afgebakende wijziging tegelijk. Richtbudget bij klein visueel werk: 10–15 minuten; daarna een beoordeelbaar resultaat of concrete blokkade.
- Lees met `rg` alleen de relevante functies. Begin niet telkens met een volledige inventarisatie of de hele TODO/INVENTARIS.
- Behoud de geometrische pastelstijl. Coen heeft de uitgebreide oceaan met gradients teruggedraaid; bouw daarop niet opnieuw voort.
- Gebruik bestaande code. Voeg alleen een component, hulpscript of herstructurering toe wanneer de taak dat nodig heeft.
- Controleer visueel vroeg. Gerichte tests tijdens het werk; volledige suite bij wijzigingen in simulatie/opslag of wanneer gerichte checks onvoldoende zekerheid geven.
- Bouw één keer na de laatste bronwijziging. Herhaal geslaagde checks alleen bij nieuwe wijzigingen of een concrete twijfel.
- Bestaande lokale wijzigingen behouden. Houd taken klein zodat ingewikkelde tijdelijke kopieën en selectieve commits meestal niet nodig zijn.
- Per onderdeel apart committen en pushen; daarna feedback, tenzij Coen meerdere onderdelen heeft opgedragen. Geen Codex-attributie.

## Wegwijzer
- Bron: `index.html`, `styles.css`, `src/`. `renderer.js`: canvas en camera; `app.js`: bediening; `simulation.js`: spelregels en opslag.
- `start.html` en `dist/` worden gegenereerd. Niet als bron analyseren of handmatig aanpassen.
- Node 22+. `npm run build` maakt de distributie. Visueel werk: `node --test tests/renderer.test.mjs`; spelregels/opslag: `npm test`.
- Bestaande beeldcontrole: `node scripts/visual-proof.mjs beginning beach-party`; render SVG met `scripts/render-proof.swift`. Houd seizoen/licht gelijk bij vergelijken.

## Hosting
- Nieuwe gewenste URL: `https://coenvermeer.nl/do-nothing-island/`; oud: `/nothing-island/`.
- Server: `beheer@134.209.201.232`; webroot `/var/www/coenvermeer.nl/www`. Deploy alleen de inhoud van `dist/`.
- Lees vóór serverwijzigingen `~/scripts/README.md`. Bundel SSH via één verbinding (eventueel ControlMaster). Geen root-login of sudo.
- Behoud bestaande links met een redirect op het oude pad. Controleer pagina, assets en redirect na deploy.

## Resultaten 2026-11-02
- Zeekleur beperkt aangepast: zee `#cbdedb`, tussenwater `#c3dbd2`, kustwater `#bdd8cc`; storm `#bbcfc9`. Bestaande watertegels en spelgedrag behouden; schermgradient verwijderd.
- Controle: één build, 18 renderercontroles geslaagd, voor/na-beeld met hetzelfde licht bekeken.
- Hostingverhuizing: uitvoering en verificatie volgen in deze taak.
