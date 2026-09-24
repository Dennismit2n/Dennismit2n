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
import { titel, balken, karte, knopf, kontrast, breite, umbrechen, KARTE, kartenHoehe } from './zeichnen.mjs';

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
const THEMEN = ['dunkel', 'hell'];

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
// Kurzform fürs Etikett auf der Kachel (dort ist nur Platz für wenige Wörter).
const ART_ETIKETT = { browser: 'im Browser', windows: 'für Windows', beides: 'Browser + Windows', skill: 'Skill für KI-Chats' };
const ZUSATZ_EN = {
  zaehlwerk: 'Plus the [Zählwerk Ticker](https://github.com/Dennismit2n/zaehlwerk-ticker/releases/latest) for Windows.',
};

// Abschnittsbalken: Datei, Nummer, Titel, englischer Titel.
const BALKEN = [
  { datei: 'ueber-mich', nummer: '01', titel: 'Über mich', en: 'About me' },
  { datei: 'werkzeugkiste', nummer: '02', titel: 'Die Werkzeugkiste', en: 'The toolbox' },
  { datei: 'werkbank', nummer: '03', titel: 'Die Werkbank', en: 'The workbench' },
];
const SEIT = '2026';
const MARKE = 'Dennis_mit_2n';

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

// Kacheltext: der Teil des Website-Kurztexts vor dem ersten „ – “ oder „: “.
function kurz(beschreibung) {
  const m = beschreibung.match(/^(.+?)(?: – |: )/);
  // Nur ein Doppelpunkt am Ende fällt weg – ein Punkt kann zu „Co.“ gehören.
  return (m ? m[1] : beschreibung).replace(/:$/, '');
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
  if (flaeche && kontrast(flaeche[1], FARBEN.icons.dunkler_grund) < FARBEN.icons.schwelle) {
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

function pruefeFarben() {
  for (const t of THEMEN) {
    const b = FARBEN.bauplan[t];
    for (const rolle of ['schrift', 'schrift2', 'label', 'masstext', 'rost']) mindestens(`Bauplan ${t} ${rolle}`, b[rolle], b.grund, 4.5);
    for (const rolle of ['kontur', 'mass', 'rahmen']) mindestens(`Bauplan ${t} ${rolle}`, b[rolle], b.grund, 3);
    for (const seite of FARBEN.github[t]) mindestens(`Bauplan ${t} Kante gegen GitHub`, b.kante, seite, 3);
    const k = FARBEN.knopf[t];
    for (const rolle of ['schrift', 'schrift2']) mindestens(`Knopf ${t} ${rolle}`, k[rolle], k.flaeche, 4.5);
    mindestens(`Knopf ${t} Pfeil`, k.pfeil, k.flaeche, 3);
    for (const seite of FARBEN.github[t]) mindestens(`Knopf ${t} Rand gegen GitHub`, k.rand, seite, 3);
    for (const [name, a] of Object.entries(FARBEN.akzente)) {
      if (name.startsWith('_')) continue;
      mindestens(`Akzent ${name} ${t} Text`, a[t].text, b.grund, 4.5);
      mindestens(`Akzent ${name} ${t} Linie`, a[t].linie, b.grund, 3);
      if (t === 'dunkel') for (const seite of FARBEN.github.dunkel) mindestens(`Akzent ${name} Rand gegen GitHub`, a[t].linie, seite, 3);
    }
  }
}
const akzent = (name, thema) => FARBEN.akzente[name][thema];

// Text, der am Handy (Spalte 293 px) lesbar bleiben muss.
function handyPx(px, viewBoxBreite) { return (px * 293) / viewBoxBreite; }

// ---------------------------------------------------------------- README-Teile

const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function bild(datei, alt, breiteAttr, hoeheAttr) {
  const hoehe = hoeheAttr ? ` height="${hoeheAttr}"` : '';
  return `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/${datei}-dunkel.svg"><img src="assets/${datei}-hell.svg" width="${breiteAttr}"${hoehe} alt="${escHtml(alt)}"></picture>`;
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
  w.zeilen = umbrechen(kurz(w.beschreibung), KARTE.descPx, KARTE.descMax);
  if (breite(w.anzeigename, 24, true) > 420 - 94 - 18) fehler.push(`Name zu breit für die Kachel: ${w.anzeigename}`);
  if (94 + breite(ART_ETIKETT[w.art], KARTE.artPx) + 24 > 406) fehler.push(`Art-Etikett zu breit: ${ART_ETIKETT[w.art]}`);
  if (!FARBEN.arten[w.art]) fehler.push(`Keine Farbe für Art „${w.art}“ in farben.json`);
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
    claimZeilen, claimEn: texte.en.heroTitle, name: MARKE, seit: SEIT, icons: werkzeuge.map((w) => w.iconSvg),
  }));
  for (const b of BALKEN) schreibe(path.join('assets', `balken-${b.datei}-${t}.svg`), balken(FARBEN.bauplan[t], b, akzent(FARBEN.abschnitte[b.datei], t)));
  for (const w of werkzeuge) {
    schreibe(path.join('assets', 'karten', `${w.key}-${t}.svg`), karte(FARBEN.bauplan[t], {
      iconSvg: w.iconSvg, name: w.anzeigename, art: ART_ETIKETT[w.art], zeilen: w.zeilen, hoehe: w.kartenHoehe, id: `k-${w.key}`,
    }, akzent(FARBEN.arten[w.art], t)));
  }
  schreibe(path.join('assets', `knopf-${t}.svg`), knopf(FARBEN.knopf[t]));
}
for (const px of [KARTE.descPx, KARTE.artPx]) if (handyPx(px, KARTE.breite) < 14) fehler.push(`Kacheltext am Handy unter 14 px (${px})`);

// README zusammensetzen
const teile = {
  titel: `<h1 lang="de">${bild('titel', `${texte.de.heroTitle} – ${texte.en.heroTitle}. Werkstatt ${MARKE}, seit ${SEIT}.`, 846)}</h1>`,
  knopf: `<p><a href="https://dennismit2n.github.io/">${bild('knopf', 'Zur Werkzeugkiste – To the toolbox', 350)}</a></p>`,
  karten: '<p align="center" lang="de">' + werkzeuge.map((w) => `<a href="${w.url}"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/karten/${w.key}-dunkel.svg"><img src="assets/karten/${w.key}-hell.svg" width="410" alt="${escHtml(`${w.anzeigename}, ${ART_TEXT.de[w.art]}: ${w.beschreibung}`)}"></picture></a>`).join('') + '</p>',
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
  if (/(?:href|src)="(?!#)|@import|url\((?!#)/.test(inhalt)) fehler.push(`Externer Verweis in ${datei}`);
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
