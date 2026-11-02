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
- Apache heeft `AllowOverride None`: `.htaccess` wordt genegeerd. De oude map gebruikt `index.php` uit `scripts/legacy-redirect.php`; laat daar geen `index.html` vóór staan in de DirectoryIndex.

## Resultaten 2026-11-02
- Zeekleur beperkt aangepast: zee `#cbdedb`, tussenwater `#c3dbd2`, kustwater `#bdd8cc`; storm `#bbcfc9`. Bestaande watertegels en spelgedrag behouden; schermgradient verwijderd.
- Controle: één build, 18 renderercontroles geslaagd, voor/na-beeld met hetzelfde licht bekeken.
- Gepubliceerd op `/do-nothing-island/`: pagina, app.js en styles.css HTTP 200; `start.html` heeft dezelfde SHA-256 als de lokale build.
- `/nothing-island/` geeft HTTP 301 naar het nieuwe pad; queryparameters blijven behouden. Doorverwijzing gevolgd tot HTTP 200.
- Oude startpagina bewaard op de server: `~/audit/do-nothing-island-move-20261102/index.html`. Voor rollback: herstel die als `nothing-island/index.html`.

## Spelverbeteringen 2026-11-02
- Brugroutes volgen echte oversteekassen; water is vóór een rivierbrug onbegaanbaar. Eerste brug is een mijlpaal. Bruggen staan minimaal vier tegels uit elkaar; elke rivierarm krijgt voorrang op extra bruggen.
- Nieuwe eilanden hebben soms één, soms twee verbonden rivierarmen. Bestaande opgeslagen geografie blijft behouden. Brugaanlopen worden vrijgemaakt en gereserveerd.
- Lopende bewoners houden hun route vast tot de reis klaar is; continue dieptesortering voorkomt verspringende hoofdjes. Pleinbestrating ligt in de grondlaag.
- Veilige Help-modus bij starten/nieuw eiland. Wensvraagtekens blijven zichtbaar als het tekstwolkje verborgen is; buiten beeld verschijnt een randmarkering.
- Beelden zijn groter, hebben verschillende materialen en een gereserveerde voorruimte; aantal groeit mee met bevolking.
- NL/EN: `localization.js` vertaalt presentatie/DOM/canvas, `english.js` bevat het vaste catalogus. Geen vertaaldienst tijdens spelen; opgeslagen verhalen blijven origineel. Taalvoorkeur staat apart van de simulatie. Controleer bij nieuwe teksten beide talen.
- Portfolio: `scripts/update-portfolio.py` plaatst Doe Niks Eiland als eerste onder persoonlijke projecten, vóór Film Atlas. Backup server: `~/audit/dni-portfolio-20261102/index-before.html`.
- Validatie: volledige suite 210/210; laatste taaltests 4/4 en app/bundelcontroles 6/6. Browser: Engelse bediening en verhaal, terugschakelen naar Nederlands en logo gecontroleerd.
- Vuurtorenlicht: vaste lichtbundelhoogte vervangen door dezelfde schaal en groeifactor als de toren (`daylight.js`). Gerichte regressie vergelijkt de werkelijk getekende lantaarn met het bundelbegin tijdens groei, pannen en zoomen; 8 dag/nachtcontroles geslaagd.
