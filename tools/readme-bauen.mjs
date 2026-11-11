#!/usr/bin/env node
/*
 * Baut die Profil-README von Dennismit2n.
 *
 *   node tools/readme-bauen.mjs            README.md und assets/ neu erzeugen
 *   node tools/readme-bauen.mjs --pruefen  zusätzlich alle Links abrufen
 *   node tools/readme-bauen.mjs --website <pfad>   anderer Ort der Website
 *
 * Reihenfolge, Namen, Links und Kurztexte der Werkzeuge kommen direkt aus der
 * Website (js/werkstatt.js und js/i18n.js von dennismit2n.github.io). So kann
 * die README nicht still von den Kacheln abweichen. Die übrigen Texte stehen in
 * tools/README.vorlage.md, die Farben in tools/farben.json, das Zeichnen in
 * tools/zeichnen.mjs.
 *
 * Läuft ohne Abhängigkeiten, nur mit Node.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { titel, balken, karte, knopf, ablauf, setzeSchild, ABLAUF, KNOEPFE, kontrast, hellsteStelle, breite, umbrechen, KARTE, kartenHoehe } from './zeichnen.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const argWert = (name, standard) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : standard;
};
const WEBSITE = path.resolve(argWert('--website', path.join(ROOT, '..', 'dennismit2n.github.io')));
const PRUEFEN = args.includes('--pruefen');

const FARBEN = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'farben.json'), 'utf8'));
const VORLAGE = path.join(ROOT, 'tools', 'README.vorlage.md');
// Überschriftenschrift der Website (Fraunces, Lateinschrift, alle Stärken). Sie wird in die
// Bilder eingebettet, die Claim, Abschnittstitel oder den Ablauf tragen (Dennis, 11.11.2026).
// Nicht in die Kacheln: die Datei wiegt eingebettet rund 49 KB je Bild, bei zwanzig Kacheln
// wäre die Seite zehnmal so schwer. Dafür bräuchte es eine verkleinerte Schriftdatei.
const SCHILD_DATEI = path.join(WEBSITE, 'assets', 'fonts', 'fraunces', 'fraunces-latin-wght-normal.woff2');
if (!fs.existsSync(SCHILD_DATEI)) throw new Error(`Überschriftenschrift fehlt: ${SCHILD_DATEI}`);
setzeSchild(fs.readFileSync(SCHILD_DATEI).toString('base64'));
// Breite, in der GitHub eine Kachel zeigt. Das Bild ist 420 breit gezeichnet, sein Lesetext 21 px:
// bei 320 wird er 16 px groß, so groß wie der Fließtext der README (Dennis, 11.11.2026).
// Am Handy (Spalte 293 px) bleibt alles wie vorher, dort begrenzt die Spaltenbreite.
const KACHEL_ANZEIGE = 320;
const THEMEN = ['dunkel', 'hell'];

// Was die Website nicht selbst verrät. Ein Werkzeug, das hier fehlt und nicht
// eindeutig ist, bricht den Lauf ab, statt still falsch beschriftet zu werden.
const ART_SONDERFAELLE = {
  fontart: 'beides',      // Browser-Fassung plus Windows-Release
  masterprompt: 'skill',  // Agent Skill, der Knopf führt zum Repo
  mods: 'mods',           // Sammelseite der Claude-Code-Mods
};
const ART_TEXT = {
  de: { browser: 'im Browser', windows: 'für Windows', beides: 'im Browser und für Windows', skill: 'Skill für KI-Chats', mods: 'Mods für Claude Code' },
  en: { browser: 'in your browser', windows: 'for Windows', beides: 'in your browser and for Windows', skill: 'skill for AI chats', mods: 'mods for Claude Code' },
};
// Kurzform fürs Etikett auf der Kachel (dort ist nur Platz für wenige Wörter).
const ART_ETIKETT = { browser: 'im Browser', windows: 'für Windows', beides: 'Browser + Windows', skill: 'Skill für KI-Chats', mods: 'Mods für Claude Code' };
// Sammel-Kacheln der Startseite, die keinen TOOLS-Eintrag haben, aber in der
// Werkzeugkiste stehen sollen (Dennis, 02.11.2026). Ihren Platz nimmt die
// Reihenfolge der Kacheln in index.html vor; Texte kommen wie bei den
// Werkzeugen aus i18n.js (<key>Desc). Gaming bleibt bewusst ein Knopf.
const SAMMEL_KACHELN = {
  mods: { key: 'mods', name: 'Werkstatt-Mods', icon: './assets/mods.svg', url: 'https://dennismit2n.github.io/mods.html' },
};
// Kachelzeile, wo der Teil vor „ – “ oder „: “ nichts sagen würde („Call of Duty“) oder zu lang wäre.
const KURZ_SONDERFAELLE = {
  craftionary: 'Minecraft-Rezepte, Fundorte und /give-Befehle',
  ruestkammer: 'Meta-Builds und Time to Kill für Modern Warfare 4',
};
const ZUSATZ_EN = {
  zaehlwerk: 'Plus the [Zählwerk Ticker](https://github.com/Dennismit2n/zaehlwerk-ticker/releases/latest) for Windows.',
};

// Abschnittsbalken: Datei, Nummer, Titel, englischer Titel.
const BALKEN = [
  { datei: 'ueber-mich', nummer: '01', titel: 'Über mich', en: 'About me' },
  { datei: 'werkzeugkiste', nummer: '02', titel: 'Die Werkzeugkiste', en: 'The toolbox' },
  { datei: 'werkbank', nummer: '03', titel: 'Die Werkbank', en: 'The workbench' },
  { datei: 'ablauf', nummer: '04', titel: 'Der Ablauf', en: 'How it’s made' },
];
// Blatt 04: wie ein Werkzeug entsteht (Dennis, 11.11.2026). Die Stationen folgen dem
// tatsächlichen Ablauf: Idee, grill-me, Entscheidung mit Ausschluss, Bau, Prüfung, Release, News.
const ABLAUF_TEXT = {
  de: {
    titel: 'Wie ein Werkzeug entsteht',
    beschreibung: 'Sieben Stationen von der Idee bis zum News-Satz. Hakt die Prüfung, geht es zurück zum Bau.',
    mass: '7 Stationen · Idee bis News-Satz',
    hakt: 'hakt', haktLang: 'Hakt es: zurück zum Bau.',
    blattFeld: 'BLATT', blatt: '04 · Der Ablauf', werkstattFeld: 'WERKSTATT',
    stationen: [
      { name: 'Idee', unter: 'was fehlt mir?', art: 'start' },
      { name: 'grill me', unter: 'Fragerunde' },
      { name: 'Entscheidung', unter: 'mit Ausschluss' },
      { name: 'Claude Code', unter: 'der Bau', art: 'betont' },
      { name: 'Prüfskript', unter: 'und Handy-Test' },
      { name: 'Release', unter: 'Tag und Setup', art: 'betont' },
      { name: 'News-Satz', unter: '14 Sprachen', art: 'ziel' },
    ],
    alt: 'Wie ein Werkzeug entsteht: Idee, grill me (Fragerunde), Entscheidung mit Ausschluss, Bau mit Claude Code, Prüfskript und Handy-Test, Release, News-Satz in 14 Sprachen. Hakt die Prüfung, geht es zurück zum Bau.',
  },
  en: {
    titel: 'How a tool is made',
    beschreibung: 'Seven stations from the idea to the news line. If the check fails, it goes back to the build.',
    mass: '7 stations · idea to news line',
    hakt: 'fails', haktLang: 'If it fails: back to the build.',
    blattFeld: 'SHEET', blatt: '04 · How it’s made', werkstattFeld: 'WORKSHOP',
    stationen: [
      { name: 'Idea', unter: 'what’s missing?', art: 'start' },
      { name: 'grill me', unter: 'question round' },
      { name: 'Decision', unter: 'what it rules out' },
      { name: 'Claude Code', unter: 'the build', art: 'betont' },
      { name: 'Check script', unter: 'and phone test' },
      { name: 'Release', unter: 'tag and setup', art: 'betont' },
      { name: 'News line', unter: '14 languages', art: 'ziel' },
    ],
    alt: 'How a tool is made: idea, grill me (a round of questions), decision and what it rules out, build with Claude Code, check script and phone test, release, a news line in 14 languages. If the check fails, it goes back to the build.',
  },
};
const SEIT = '2026';
const MARKE = 'Dennis_mit_2n';

// ---------------------------------------------------------------- Website lesen

function ladeWerkzeuge() {
  const quelle = fs.readFileSync(path.join(WEBSITE, 'js', 'werkstatt.js'), 'utf8');
  const treffer = quelle.match(/var TOOLS = (\[[\s\S]*?\])\s*;/);
  if (!treffer) throw new Error('TOOLS-Liste in js/werkstatt.js nicht gefunden.');
  // Seit 03.11.2026 steht „mods“ auch in TOOLS (für die Neuigkeiten auf
  // werkstatt.html), dort mit relativem Link. Der Eintrag aus SAMMEL_KACHELN
  // gilt, sonst stünde die Kachel doppelt da.
  const werkzeuge = vm.runInNewContext('(' + treffer[1] + ')', {}).filter((w) => !SAMMEL_KACHELN[w.key]);

  // Sammel-Kacheln an die Stelle setzen, die sie auf der Startseite haben:
  // hinter das letzte Werkzeug, das dort vor ihnen steht.
  const index = fs.readFileSync(path.join(WEBSITE, 'index.html'), 'utf8');
  const reihenfolge = [...index.matchAll(/class="tool-card tool-([a-z-]+)"/g)].map((m) => m[1]);
  for (const kachel of Object.values(SAMMEL_KACHELN)) {
    const platz = reihenfolge.indexOf(kachel.key);
    if (platz < 0) throw new Error(`Sammel-Kachel „${kachel.key}“ steht nicht in index.html der Website.`);
    const davor = reihenfolge.slice(0, platz).reverse().find((k) => werkzeuge.some((w) => w.key === k));
    const bei = davor ? werkzeuge.findIndex((w) => w.key === davor) + 1 : 0;
    werkzeuge.splice(bei, 0, { ...kachel });
  }
  return werkzeuge;
}

function ladeTexte() {
  const kontext = {};
  vm.createContext(kontext);
  vm.runInContext(fs.readFileSync(path.join(WEBSITE, 'js', 'i18n.js'), 'utf8') + '\n;this.I18N = I18N;', kontext);
  return kontext.I18N;
}

// Kachelfarben der Website: .tool-<key> { --tool: var(--x) } und die Werte von --x
// (und --x-flow, falls die Kachel einen Verlauf trägt) aus dem Dunkel-Block von
// css/style.css. Die README-Kacheln stehen immer auf dunklem Grund, darum die Dunkel-Werte.
function ladeKachelfarben() {
  const css = fs.readFileSync(path.join(WEBSITE, 'css', 'style.css'), 'utf8').replace(/\r\n/g, '\n');
  const block = css.match(/:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/);
  if (!block) throw new Error('Dunkel-Block :root[data-theme="dark"] in css/style.css nicht gefunden.');
  const werte = {}, verlaeufe = {}, zuordnung = {};
  for (const m of block[1].matchAll(/--([a-z-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) werte[m[1]] = m[2].toUpperCase();
  // Verläufe, die nur aus var(--…) bestehen (z. B. --gaming-flow), tragen keine Hex-Werte
  // und werden übersprungen — die README braucht sie nicht.
  for (const m of block[1].matchAll(/--([a-z-]+)-flow:\s*linear-gradient\(([^;]*)\)\s*;/g)) {
    const stopps = m[2].match(/#[0-9a-fA-F]{6}/g);
    if (stopps) verlaeufe[m[1]] = stopps.map((c) => c.toUpperCase());
  }
  for (const m of css.matchAll(/\.tool-([a-z-]+)\s*\{\s*--tool:\s*var\(--([a-z-]+)\)/g)) zuordnung[m[1]] = m[2];
  return { werte, verlaeufe, zuordnung };
}

function artVon(werkzeug) {
  if (ART_SONDERFAELLE[werkzeug.key]) return ART_SONDERFAELLE[werkzeug.key];
  if (werkzeug.ctaKey === 'downloadTool') return 'windows';
  if (werkzeug.url.startsWith('https://dennismit2n.github.io/')) return 'browser';
  throw new Error(`Art von „${werkzeug.key}“ unklar – in ART_SONDERFAELLE eintragen.`);
}

// Kacheltext: der erste Satz des Website-Kurztexts, aber nur bis zum ersten „: “.
// Bis zur Text-Runde vom 30.10.2026 trennte ein „ – “ die Kurzform vom Rest; seitdem
// stehen auf der Website keine Gedankenstriche mehr, sondern Punkte.
function kurz(beschreibung) {
  const satz = (beschreibung.match(/^(.+?\.)(?= \p{Lu})/u) || [, beschreibung])[1];
  const m = satz.match(/^(.+?)(?: – |: )/);
  // Ein Punkt am Ende fällt weg, außer er gehört zu „Co.“.
  return (m ? m[1] : satz).replace(/(?<!\bCo)\.$/, '').replace(/:$/, '');
}

// Claim in zwei ungefähr gleich lange Zeilen teilen.
function zweiZeilen(satz) {
  const woerter = satz.split(' ');
  let best = null;
  for (let i = 1; i < woerter.length; i++) {
    const a = woerter.slice(0, i).join(' '), b = woerter.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (!best || diff < best.diff) best = { a, b, diff };
  }
  return [best.a, best.b];
}

// ---------------------------------------------------------------- Icons

// Kopie des Website-Icons. Fast schwarze Flächen bekommen einen feinen Rand,
// sonst verschwinden sie auf dunklem Grund.
function iconKopie(quelle) {
  let svg = fs.readFileSync(quelle, 'utf8').replace(/\r\n/g, '\n');
  const flaeche = svg.match(/<rect\b[^>]*\bfill="(#[0-9a-fA-F]{6})"[^>]*>/);
  let gerandet = false;
  // Trägt die Fläche schon einen eigenen Rand (Fadenkreuz), bleibt sie, wie sie ist:
  // ein zweites stroke-Attribut machte die SVG ungültig.
  if (flaeche && !/\bstroke=/.test(flaeche[0]) && kontrast(flaeche[1], FARBEN.icons.dunkler_grund) < FARBEN.icons.schwelle) {
    const mitRand = flaeche[0].replace(/\s*\/?>$/, (ende) => ` stroke="${FARBEN.icons.rand}" stroke-width="2"${ende}`);
    svg = svg.replace(flaeche[0], mitRand);
    gerandet = true;
  }
  return { svg, gerandet };
}

// ---------------------------------------------------------------- Prüfungen

const fehler = [];
function mindestens(was, vorne, hinten, mindest) {
  const wert = kontrast(vorne, hinten);
  if (wert < mindest) fehler.push(`${was}: ${vorne} auf ${hinten} nur ${wert.toFixed(2)}:1 (mind. ${mindest})`);
}

// Eine Rolle ist eine Farbe oder ein Verlauf (Liste); geprüft wird jede Farbe darin.
const farbenVon = (wert) => (Array.isArray(wert) ? wert : [wert]);
// Hellste Stelle des Blatts unter der Aurora: Text muss auch dort lesbar sein.
const aurorahell = (thema) => hellsteStelle(FARBEN.bauplan[thema].grund, FARBEN.bauplan[thema].aurora);

function pruefeFarben() {
  for (const t of THEMEN) {
    const b = FARBEN.bauplan[t], hell = aurorahell(t);
    for (const rolle of ['schrift', 'schrift2', 'label', 'akzent', 'claim']) {
      for (const c of farbenVon(b[rolle])) {
        mindestens(`Bauplan ${t} ${rolle}`, c, b.grund, 4.5);
        mindestens(`Bauplan ${t} ${rolle} auf Aurora`, c, hell, 4.5);
      }
    }
    for (const rolle of ['kontur', 'mass']) for (const c of farbenVon(b[rolle])) mindestens(`Bauplan ${t} ${rolle} auf Aurora`, c, hell, 3);
    mindestens(`Bauplan ${t} rahmen`, b.rahmen, b.grund, 3);
    for (const seite of FARBEN.github[t]) mindestens(`Bauplan ${t} Kante gegen GitHub`, b.kante, seite, 3);
    for (const [name, art] of [['knopf', KNOEPFE.werkzeugkiste], ['gaming', KNOEPFE.gaming], ['kaffee', KNOEPFE.kaffee]]) {
      const k = FARBEN[name][t], khell = hellsteStelle(k.flaeche, k.aurora);
      for (const rolle of ['schrift', 'schrift2']) mindestens(`Knopf ${name} ${t} ${rolle} auf Aurora`, k[rolle], khell, 4.5);
      for (const rolle of ['pfeil', art.farbe]) mindestens(`Knopf ${name} ${t} ${rolle} auf Aurora`, k[rolle], khell, 3);
      for (const c of farbenVon(k.rand)) for (const seite of FARBEN.github[t]) mindestens(`Knopf ${name} ${t} Rand gegen GitHub`, c, seite, 3);
    }
  }
  // Ablauf-Bild: Schrift auf den Stationen, Nebentext auf der Fläche, Maße der Texte.
  {
    const a = FARBEN.ablauf, b = FARBEN.bauplan.dunkel;
    if (JSON.stringify(FARBEN.bauplan.hell) !== JSON.stringify(b)) fehler.push('Ablauf-Bild gibt es nur in einer Fassung, bauplan.hell weicht aber von bauplan.dunkel ab');
    mindestens('Ablauf Name auf Station', a.schrift, a.flaeche, 4.5);
    mindestens('Ablauf Name auf betonter Station', a.schrift, a.betont, 4.5);
    mindestens('Ablauf Nebentext auf Station', b.schrift2, a.flaeche, 4.5);
    mindestens('Ablauf Nebentext auf betonter Station', b.schrift, a.betont, 4.5);
    mindestens('Ablauf Schrift auf Ziel-Station', a.tinte, a.ziel, 4.5);
    mindestens('Ablauf Rand der betonten Station', b.kontur[0], a.betont, 3);
    for (const [sprache, t] of Object.entries(ABLAUF_TEXT)) {
      if (t.stationen.length !== 7) fehler.push(`Ablauf ${sprache}: 7 Stationen erwartet`);
      for (const [fassung, m] of Object.entries(ABLAUF)) {
        for (const s of t.stationen) {
          if (breite(s.name, m.namePx, true) > m.kasten - 6) fehler.push(`Ablauf ${sprache} ${fassung}: Name zu breit: ${s.name}`);
          if (breite(s.unter, m.unterPx) > m.kasten - 6) fehler.push(`Ablauf ${sprache} ${fassung}: Nebentext zu breit: ${s.unter}`);
        }
        if (breite(t.mass, m.massPx) > m.breite - 40) fehler.push(`Ablauf ${sprache} ${fassung}: Maßtext zu breit`);
      }
      if (breite(t.blatt, 14, true) > ABLAUF.quer.kasten - 16) fehler.push(`Ablauf ${sprache}: Schriftfeld zu breit: ${t.blatt}`);
      if (breite(t.haktLang, 21) > ABLAUF.hoch.breite - 40) fehler.push(`Ablauf ${sprache}: Rückweg-Satz zu breit`);
    }
    for (const px of [ABLAUF.hoch.namePx, ABLAUF.hoch.unterPx, ABLAUF.hoch.massPx]) if (handyPx(px, ABLAUF.hoch.breite) < 14) fehler.push(`Ablauf-Text am Handy unter 14 px (${px})`);
  }
  // Text zwischen Zeichen (bis x 140) und Pfeil (ab x 606).
  for (const art of Object.values(KNOEPFE)) {
    if (140 + breite(art.oben, 40, true) > 596) fehler.push(`Knopftext zu breit: ${art.oben}`);
    if (140 + breite(art.unten, 34) > 596) fehler.push(`Knopftext zu breit: ${art.unten}`);
  }
}

// Akzent einer Werkzeug-Kachel in einer Darstellung: Rahmen und Etikett in der
// Website-Farbe. Schafft die Farbe als Schrift an der hellsten Stelle der Kachel
// keine 4,5:1, bekommt nur die Etikett-Schrift die Nebentextfarbe; Rahmen bleibt
// in Werkzeugfarbe.
function kachelAkzent(farbe, verlauf, thema) {
  const text = kontrast(farbe, aurorahell(thema)) >= 4.5 ? farbe : FARBEN.bauplan[thema].schrift2;
  return { text, linie: farbe, verlauf };
}

// Text, der am Handy (Spalte 293 px) lesbar bleiben muss.
function handyPx(px, viewBoxBreite) { return (px * 293) / viewBoxBreite; }

// ---------------------------------------------------------------- README-Teile

const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function bild(datei, alt, breiteAttr, hoeheAttr) {
  const hoehe = hoeheAttr ? ` height="${hoeheAttr}"` : '';
  return `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/${datei}-dunkel.svg"><img src="assets/${datei}-hell.svg" width="${breiteAttr}"${hoehe} alt="${escHtml(alt)}"></picture>`;
}

// Ablauf-Bild: unter 600 px Fensterbreite die Hochkant-Fassung, sonst die quere.
function ablaufBild(anhang, alt) {
  return `<picture><source media="(max-width: 600px)" srcset="assets/ablauf-handy${anhang}.svg"><img src="assets/ablauf${anhang}.svg" width="846" alt="${escHtml(alt)}"></picture>`;
}

function liste(werkzeuge, texte, sprache) {
  return werkzeuge.map((w, i) => {
    const name = w.nameKey ? texte[sprache][w.nameKey] : w.name;
    const beschreibung = texte[sprache][`${w.key}Desc`];
    return `${i + 1}. <a href="${w.url}"><img src="assets/werkzeuge/${w.iconDatei}" width="24" height="24" alt="" align="top"> <b>${escHtml(name)}</b></a> · ${ART_TEXT[sprache][w.art]}<br>`
      + escHtml(beschreibung) + (ZUSATZ_EN[w.key] && sprache === 'en' ? `<br>${ZUSATZ_EN[w.key]}` : '');
  }).join('\n');
}

// ---------------------------------------------------------------- Ablauf

const geschrieben = [];
const erwartet = new Set(['README.md']);
function schreibe(relativ, inhalt) {
  const rel = relativ.split(path.sep).join('/');
  erwartet.add(rel);
  const ziel = path.join(ROOT, relativ);
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  const alt = fs.existsSync(ziel) ? fs.readFileSync(ziel, 'utf8') : null;
  if (alt !== inhalt) {
    fs.writeFileSync(ziel, inhalt, 'utf8');
    geschrieben.push(rel);
  }
}

pruefeFarben();
const werkzeuge = ladeWerkzeuge();
const texte = ladeTexte();
const kachelfarben = ladeKachelfarben();

// Werkzeuge vorbereiten
for (const w of werkzeuge) {
  w.art = artVon(w);
  w.iconDatei = path.basename(w.icon);
  w.anzeigename = w.nameKey ? texte.de[w.nameKey] : w.name;
  w.beschreibung = texte.de[`${w.key}Desc`];
  if (!w.anzeigename || !w.beschreibung || !texte.en[`${w.key}Desc`]) throw new Error(`Text fehlt für „${w.key}“.`);
  const { svg, gerandet } = iconKopie(path.join(WEBSITE, w.icon));
  w.iconSvg = svg;
  schreibe(path.join('assets', 'werkzeuge', w.iconDatei), svg);
  if (gerandet) console.log(`  Rand für ${w.iconDatei}`);
  w.zeilen = umbrechen(KURZ_SONDERFAELLE[w.key] || kurz(w.beschreibung), KARTE.descPx, KARTE.descMax);
  if (breite(w.anzeigename, 24, true) > 420 - 94 - 18) fehler.push(`Name zu breit für die Kachel: ${w.anzeigename}`);
  if (94 + breite(ART_ETIKETT[w.art], KARTE.artPx) + 24 > 406) fehler.push(`Art-Etikett zu breit: ${ART_ETIKETT[w.art]}`);
  const variable = kachelfarben.zuordnung[w.key];
  w.farbe = variable && kachelfarben.werte[variable];
  w.verlauf = variable && kachelfarben.verlaeufe[variable];
  if (!w.farbe) { fehler.push(`Keine Kachelfarbe für „${w.key}“ in css/style.css der Website`); continue; }
  for (const seite of FARBEN.github.dunkel) mindestens(`Kachelrand ${w.key} gegen GitHub`, w.farbe, seite, 3);
  mindestens(`Kachelrand ${w.key} auf Kachelgrund dunkel`, w.farbe, FARBEN.bauplan.dunkel.grund, 3);
  mindestens(`Etikett ${w.key} dunkel auf Aurora`, kachelAkzent(w.farbe, null, 'dunkel').text, aurorahell('dunkel'), 4.5);
}
// Nebeneinander stehende Kacheln (am Desktop je zwei) bekommen dieselbe Höhe.
werkzeuge.forEach((w, i) => {
  const paar = werkzeuge.slice(i - (i % 2), i - (i % 2) + 2);
  const zeilen = Math.max(...paar.map((p) => p.zeilen.length));
  w.kartenHoehe = kartenHoehe(zeilen);
});

// Titelbild
const claimZeilen = zweiZeilen(texte.de.heroTitle);
for (const z of claimZeilen) if (breite(z, 46, true) > 790) fehler.push(`Claim-Zeile zu breit: ${z}`);
if (handyPx(46, 846) < 14 || handyPx(42, 846) < 14) fehler.push('Titelschrift am Handy unter 14 px');
for (const t of THEMEN) {
  schreibe(path.join('assets', `titel-${t}.svg`), titel(FARBEN.bauplan[t], {
    claimZeilen, claimEn: texte.en.heroTitle, name: MARKE, seit: SEIT,
    werkzeuge: werkzeuge.map((w) => ({ svg: w.iconSvg, farbe: w.farbe, verlauf: w.verlauf })),
  }));
  for (const b of BALKEN) schreibe(path.join('assets', `balken-${b.datei}-${t}.svg`), balken(FARBEN.bauplan[t], b));
  for (const w of werkzeuge) {
    schreibe(path.join('assets', 'karten', `${w.key}-${t}.svg`), karte(FARBEN.bauplan[t], {
      iconSvg: w.iconSvg, name: w.anzeigename, art: ART_ETIKETT[w.art], zeilen: w.zeilen, hoehe: w.kartenHoehe, id: `k-${w.key}`,
    }, kachelAkzent(w.farbe, w.verlauf, t)));
  }
  schreibe(path.join('assets', `knopf-${t}.svg`), knopf(FARBEN.knopf[t]));
  schreibe(path.join('assets', `gaming-${t}.svg`), knopf(FARBEN.gaming[t], KNOEPFE.gaming));
  schreibe(path.join('assets', `kaffee-${t}.svg`), knopf(FARBEN.kaffee[t], KNOEPFE.kaffee));
}
// Ablauf-Bild: quer für breite Fenster, hoch fürs Handy, je Sprache. Nur eine Farbfassung (siehe farben.json).
for (const [sprache, t] of Object.entries(ABLAUF_TEXT)) {
  const anhang = sprache === 'de' ? '' : `-${sprache}`;
  const texteMitMarke = { ...t, marke: MARKE };
  schreibe(path.join('assets', `ablauf${anhang}.svg`), ablauf(FARBEN.bauplan.dunkel, FARBEN.ablauf, texteMitMarke));
  schreibe(path.join('assets', `ablauf-handy${anhang}.svg`), ablauf(FARBEN.bauplan.dunkel, FARBEN.ablauf, texteMitMarke, true));
}
if (Math.abs((KARTE.descPx * KACHEL_ANZEIGE) / KARTE.breite - 16) > 0.5) fehler.push('Kacheltext am Desktop nicht mehr 16 px: KACHEL_ANZEIGE anpassen');
for (const px of [KARTE.descPx, KARTE.artPx]) if (handyPx(px, KARTE.breite) < 14) fehler.push(`Kacheltext am Handy unter 14 px (${px})`);

// README zusammensetzen
const teile = {
  titel: `<h1 lang="de">${bild('titel', `${texte.de.heroTitle} · ${texte.en.heroTitle}. Werkstatt ${MARKE}, seit ${SEIT}.`, 846)}</h1>`,
  // Beide Knöpfe in einem Absatz: am Desktop nebeneinander, am Handy brechen sie von selbst um (Dennis, 11.11.2026).
  knoepfe: `<p><a href="https://dennismit2n.github.io/">${bild('knopf', 'Zur Werkzeugkiste · To the toolbox', 350)}</a> <a href="https://dennismit2n.github.io/gaming.html">${bild('gaming', 'Zum Gaming-Stuff · To the gaming stuff', 350)}</a></p>`,
  ablauf: `<p lang="de">${ablaufBild('', ABLAUF_TEXT.de.alt)}</p>`,
  'ablauf:en': `<p>${ablaufBild('-en', ABLAUF_TEXT.en.alt)}</p>`,
  kaffee: `<a href="https://buymeacoffee.com/dennis_mit_2n">${bild('kaffee', 'Kaffee spendieren · Buy me a coffee', 350)}</a>`,
  karten: '<p align="center" lang="de">' + werkzeuge.map((w) => `<a href="${w.url}"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/karten/${w.key}-dunkel.svg"><img src="assets/karten/${w.key}-hell.svg" width="${KACHEL_ANZEIGE}" alt="${escHtml(`${w.anzeigename}, ${ART_TEXT.de[w.art]}: ${w.beschreibung}`)}"></picture></a>`).join('') + '</p>',
  'werkzeuge:en': liste(werkzeuge, texte, 'en'),
};
for (const b of BALKEN) teile[`balken:${b.datei}`] = `<h2 lang="de">${bild(`balken-${b.datei}`, b.titel, 846)}</h2>`;

let readme = fs.readFileSync(VORLAGE, 'utf8').replace(/\r\n/g, '\n');
for (const [marke, inhalt] of Object.entries(teile)) {
  const platz = `<!-- ${marke} -->`;
  if (!readme.includes(platz)) throw new Error(`Marke ${platz} fehlt in der Vorlage.`);
  readme = readme.replace(platz, inhalt);
}
const rest = readme.match(/<!-- (?!Erzeugt)[a-z:-]+ -->/);
if (rest) throw new Error(`Unbekannte Marke in der Vorlage: ${rest[0]}`);
readme = '<!-- Erzeugt von tools/readme-bauen.mjs. Texte in tools/README.vorlage.md ändern, dann neu bauen. -->\n' + readme;

// Nichts von fremden Servern: jede Bildquelle muss relativ sein und existieren.
for (const [, quelle] of readme.matchAll(/\b(?:src|srcset)="([^"]+)"/g)) {
  if (/^[a-z]+:/i.test(quelle) || quelle.startsWith('//')) fehler.push(`Fremde Bildquelle: ${quelle}`);
  else if (!fs.existsSync(path.join(ROOT, quelle))) fehler.push(`Bild fehlt: ${quelle}`);
}
// Keine externen Verweise in den erzeugten Bildern.
for (const datei of geschrieben.concat([...erwartet]).filter((d) => d.endsWith('.svg'))) {
  const inhalt = fs.readFileSync(path.join(ROOT, datei), 'utf8');
  // Die eingebettete Schrift (data:font/woff2) ist kein Verweis nach außen.
  if (/(?:href|src)="(?!#)|@import|url\((?!#|data:font\/woff2;base64,)/.test(inhalt)) fehler.push(`Externer Verweis in ${datei}`);
}

if (fehler.length) {
  console.error('FEHLER:\n  ' + [...new Set(fehler)].join('\n  '));
  process.exit(1);
}
schreibe('README.md', readme);

// Verwaiste Dateien in assets/ melden (nicht löschen).
function alleDateien(ordner) {
  return fs.readdirSync(path.join(ROOT, ordner), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? alleDateien(path.join(ordner, e.name)) : [path.join(ordner, e.name).split(path.sep).join('/')]);
}
for (const datei of alleDateien('assets')) if (!erwartet.has(datei)) console.warn(`  WARNUNG: ${datei} wird nicht mehr erzeugt`);

console.log(`${werkzeuge.length} Werkzeuge aus ${WEBSITE}, Kachelhöhen ${[...new Set(werkzeuge.map((w) => w.kartenHoehe))].join('/')}`);
console.log(geschrieben.length ? `Geändert (${geschrieben.length}): ${geschrieben.join(', ')}` : 'Nichts geändert.');

// Links abrufen
if (PRUEFEN) {
  const links = [...new Set([...readme.matchAll(/\bhref="(https?:[^"]+)"|\]\((https?:[^)]+)\)/g)].map((m) => m[1] || m[2]))];
  let kaputt = 0;
  for (const url of links) {
    try {
      const antwort = await fetch(url, { method: 'GET', redirect: 'follow' });
      const ok = antwort.status === 200;
      if (!ok) kaputt++;
      console.log(`  ${ok ? 'ok ' : 'FEHLER'} ${antwort.status} ${url}`);
    } catch (e) {
      kaputt++;
      console.log(`  FEHLER ${e.message} ${url}`);
    }
  }
  if (kaputt) { console.error(`${kaputt} Link(s) kaputt.`); process.exitCode = 1; }
}
