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
 * tools/README.vorlage.md, die Knopffarben in tools/farben.json.
 *
 * Läuft ohne Abhängigkeiten, nur mit Node.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

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

// Was die Website nicht selbst verrät. Ein Werkzeug, das hier fehlt und nicht
// eindeutig ist, bricht den Lauf ab, statt still falsch beschriftet zu werden.
const ART_SONDERFAELLE = {
  fontart: 'beides',      // Browser-Fassung plus Windows-Release
  masterprompt: 'skill',  // Agent Skill, der Knopf führt zum Repo
};
const ART_TEXT = {
  de: { browser: 'im Browser', windows: 'für Windows', beides: 'im Browser und für Windows', skill: 'Skill für KI-Chats' },
  en: { browser: 'in your browser', windows: 'for Windows', beides: 'in your browser and for Windows', skill: 'skill for AI chats' },
};
const ZUSATZ = {
  zaehlwerk: {
    de: 'Dazu gibt’s den [Zählwerk Ticker](https://github.com/Dennismit2n/zaehlwerk-ticker/releases/latest) für Windows.',
    en: 'Plus the [Zählwerk Ticker](https://github.com/Dennismit2n/zaehlwerk-ticker/releases/latest) for Windows.',
  },
};

// ---------------------------------------------------------------- Website lesen

function ladeWerkzeuge() {
  const quelle = fs.readFileSync(path.join(WEBSITE, 'js', 'werkstatt.js'), 'utf8');
  const treffer = quelle.match(/var TOOLS = (\[[\s\S]*?\])\s*;/);
  if (!treffer) throw new Error('TOOLS-Liste in js/werkstatt.js nicht gefunden.');
  return vm.runInNewContext('(' + treffer[1] + ')', {});
}

function ladeTexte() {
  const kontext = {};
  vm.createContext(kontext);
  vm.runInContext(fs.readFileSync(path.join(WEBSITE, 'js', 'i18n.js'), 'utf8') + '\n;this.I18N = I18N;', kontext);
  return kontext.I18N;
}

function artVon(werkzeug) {
  if (ART_SONDERFAELLE[werkzeug.key]) return ART_SONDERFAELLE[werkzeug.key];
  if (werkzeug.ctaKey === 'downloadTool') return 'windows';
  if (werkzeug.url.startsWith('https://dennismit2n.github.io/')) return 'browser';
  throw new Error(`Art von „${werkzeug.key}“ unklar – in ART_SONDERFAELLE eintragen.`);
}

// -------------------------------------------------------------------- Farben

function leuchtdichte(hex) {
  const k = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}

function kontrast(a, b) {
  const [hell, dunkel] = [leuchtdichte(a), leuchtdichte(b)].sort((x, y) => y - x);
  return (hell + 0.05) / (dunkel + 0.05);
}

// -------------------------------------------------------------------- Bilder

const SCHRIFT = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Roboto, Arial, sans-serif";

// Der Werkzeugkoffer aus dem Markenzeichen der Website (index.html), ohne Fläche.
function koffer(farbe) {
  return [
    `<g transform="translate(26 24) scale(1.667)" fill="none" stroke="${farbe}" stroke-linecap="round">`,
    '<path d="M16 21v-3a8 8 0 0 1 16 0v3" stroke-width="3.2"/>',
    '<rect x="8" y="21" width="32" height="15" rx="3" stroke-width="3"/>',
    '<path d="M9.5 28h29" stroke-width="2.6"/>',
    `<rect x="21" y="25.5" width="6" height="5" rx="1.4" fill="${farbe}" stroke="none"/>`,
    '</g>',
  ].join('');
}

function knopf(f) {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="128" viewBox="0 0 700 128">',
    `<rect x="2" y="2" width="696" height="124" rx="26" fill="${f.flaeche}" stroke="${f.rand}" stroke-width="3"/>`,
    koffer(f.schrift),
    `<text x="140" y="60" font-family="${SCHRIFT}" font-size="40" font-weight="700" fill="${f.schrift}">Zur Werkzeugkiste</text>`,
    `<text x="140" y="102" font-family="${SCHRIFT}" font-size="34" fill="${f.schrift2}">To the toolbox</text>`,
    `<path d="M606 64h52M636 42l22 22-22 22" fill="none" stroke="${f.pfeil}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
    '</svg>',
    '',
  ].join('\n');
}

function pruefeKnopf(name, f) {
  const text = [['schrift', 4.5], ['schrift2', 4.5], ['pfeil', 3]];
  for (const [feld, mindest] of text) {
    const wert = kontrast(f[feld], f.flaeche);
    if (wert < mindest) throw new Error(`Knopf ${name}: ${feld} ${f[feld]} auf ${f.flaeche} nur ${wert.toFixed(2)}:1`);
  }
  if (name === 'dunkel') {
    const rand = kontrast(f.rand, FARBEN.icons.dunkler_grund);
    if (rand < 3) throw new Error(`Knopf dunkel: Rand hebt sich mit ${rand.toFixed(2)}:1 nicht vom Grund ab`);
  }
}

// Kopie des Website-Icons. Fast schwarze Flächen bekommen einen feinen Rand,
// sonst verschwinden sie auf dunklem GitHub.
function iconKopie(quelle) {
  let svg = fs.readFileSync(quelle, 'utf8').replace(/\r\n/g, '\n');
  const flaeche = svg.match(/<rect\b[^>]*\bfill="(#[0-9a-fA-F]{6})"[^>]*>/);
  let gerandet = false;
  if (flaeche && kontrast(flaeche[1], FARBEN.icons.dunkler_grund) < FARBEN.icons.schwelle) {
    const mitRand = flaeche[0].replace(/\s*\/?>$/, (ende) => ` stroke="${FARBEN.icons.rand}" stroke-width="2"${ende}`);
    svg = svg.replace(flaeche[0], mitRand);
    gerandet = true;
  }
  return { svg, gerandet };
}

// -------------------------------------------------------------------- README

const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function liste(werkzeuge, texte, sprache) {
  return werkzeuge.map((w, i) => {
    const name = w.nameKey ? texte[sprache][w.nameKey] : w.name;
    const beschreibung = texte[sprache][`${w.key}Desc`];
    if (!name || !beschreibung) throw new Error(`Text fehlt für „${w.key}“ (${sprache}).`);
    // Ein Eintrag = eine Quellzeile. Einzelne Zeilenumbrüche behandelt GitHub je nach
    // Darstellung verschieden (README: kein Umbruch, Markdown-API gfm: <br>).
    return `${i + 1}. <a href="${w.url}"><img src="assets/werkzeuge/${w.iconDatei}" width="24" height="24" alt="" align="top"> <b>${escHtml(name)}</b></a> · ${ART_TEXT[sprache][w.art]}<br>`
      + escHtml(beschreibung)
      + (ZUSATZ[w.key] ? `<br>${ZUSATZ[w.key][sprache]}` : '');
  }).join('\n');
}

// -------------------------------------------------------------------- Ablauf

const geschrieben = [];
function schreibe(relativ, inhalt) {
  const ziel = path.join(ROOT, relativ);
  fs.mkdirSync(path.dirname(ziel), { recursive: true });
  const alt = fs.existsSync(ziel) ? fs.readFileSync(ziel, 'utf8') : null;
  if (alt !== inhalt) {
    fs.writeFileSync(ziel, inhalt, 'utf8');
    geschrieben.push(relativ);
  }
}

const werkzeuge = ladeWerkzeuge();
const texte = ladeTexte();

// Icons
const erwartet = new Set();
for (const w of werkzeuge) {
  w.art = artVon(w);
  w.iconDatei = path.basename(w.icon);
  const { svg, gerandet } = iconKopie(path.join(WEBSITE, w.icon));
  schreibe(path.join('assets', 'werkzeuge', w.iconDatei), svg);
  erwartet.add(w.iconDatei);
  if (gerandet) console.log(`  Rand für ${w.iconDatei}`);
}
for (const datei of fs.readdirSync(path.join(ROOT, 'assets', 'werkzeuge'))) {
  if (!erwartet.has(datei)) console.warn(`  WARNUNG: assets/werkzeuge/${datei} gehört zu keinem Werkzeug mehr`);
}

// Knopf
for (const [name, f] of Object.entries(FARBEN.knopf)) {
  pruefeKnopf(name, f);
  schreibe(path.join('assets', `knopf-${name}.svg`), knopf(f));
}

// README
let readme = fs.readFileSync(VORLAGE, 'utf8').replace(/\r\n/g, '\n');
for (const sprache of ['de', 'en']) {
  const marke = `<!-- werkzeuge:${sprache} -->`;
  if (!readme.includes(marke)) throw new Error(`Marke ${marke} fehlt in der Vorlage.`);
  readme = readme.replace(marke, liste(werkzeuge, texte, sprache));
}
readme = '<!-- Erzeugt von tools/readme-bauen.mjs. Texte in tools/README.vorlage.md ändern, dann neu bauen. -->\n' + readme;

// Nichts von fremden Servern: jede Bildquelle muss relativ sein und existieren.
for (const [, quelle] of readme.matchAll(/\b(?:src|srcset)="([^"]+)"/g)) {
  if (/^[a-z]+:/i.test(quelle) || quelle.startsWith('//')) throw new Error(`Fremde Bildquelle: ${quelle}`);
  if (!fs.existsSync(path.join(ROOT, quelle))) throw new Error(`Bild fehlt: ${quelle}`);
}
schreibe('README.md', readme);

console.log(`${werkzeuge.length} Werkzeuge aus ${WEBSITE}`);
console.log(geschrieben.length ? `Geändert: ${geschrieben.join(', ')}` : 'Nichts geändert.');

// Links abrufen
if (PRUEFEN) {
  const links = [...new Set([...readme.matchAll(/\bhref="(https?:[^"]+)"|\]\((https?:[^)]+)\)/g)].map((m) => m[1] || m[2]))];
  let fehler = 0;
  for (const url of links) {
    try {
      const antwort = await fetch(url, { method: 'GET', redirect: 'follow' });
      const ok = antwort.status === 200;
      if (!ok) fehler++;
      console.log(`  ${ok ? 'ok ' : 'FEHLER'} ${antwort.status} ${url}`);
    } catch (e) {
      fehler++;
      console.log(`  FEHLER ${e.message} ${url}`);
    }
  }
  if (fehler) { console.error(`${fehler} Link(s) kaputt.`); process.exitCode = 1; }
}
