#!/usr/bin/env node
/*
 * Baut die Bilder für Blatt 05 „Die Zahlen“ der Profil-README.
 *
 *   node tools/statistik-bauen.mjs
 *
 * Läuft einmal am Tag in der GitHub Action .github/workflows/statistik.yml und legt die
 * Bilder in assets/statistik/ ab. Die README bindet sie von dort ein, beim Ansehen der Seite
 * wird also weiter nichts von fremden Servern geladen.
 *
 * Woher die Zahlen kommen: aus der öffentlichen GitHub-Schnittstelle (GraphQL), abgefragt mit
 * dem Token, das GitHub der Action mitgibt (GITHUB_TOKEN). Es sind meine eigenen, öffentlichen
 * Zahlen. Über Besucher der Seite wird nichts erhoben.
 *
 * Die Snake zeichnet die Action Platane/snk nach statistik-roh/snake.svg. Liegt die Datei da,
 * wird sie hier in ein Blatt im Bauplan-Stil eingerahmt. Lokal fehlt sie meist, dann bleibt
 * das vorhandene Bild stehen.
 *
 * Läuft ohne Abhängigkeiten, nur mit Node (ab Version 20). Lokal testen:
 *   GITHUB_TOKEN=$(gh auth token) node tools/statistik-bauen.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { schlange, zahlen, kalenderAusschnitt, setzeSchild, breite, ZAHLEN } from './zeichnen.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FARBEN = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'farben.json'), 'utf8'));
const ZIEL = path.join(ROOT, 'assets', 'statistik');
const KONTO = process.env.GITHUB_REPOSITORY_OWNER || 'Dennismit2n';
const TOKEN = process.env.GITHUB_TOKEN;
if (!TOKEN) { console.error('GITHUB_TOKEN fehlt. Lokal: GITHUB_TOKEN=$(gh auth token) node tools/statistik-bauen.mjs'); process.exit(1); }

// Die Teil-Schrift für die Ziffern liegt fertig in tools/schrift/ (readme-bauen.mjs sorgt dafür).
// Hier wird nichts geschnitten: auf GitHub läuft kein Python.
setzeSchild((zeichen, staerke) => {
  const name = `fraunces-${staerke}-${crypto.createHash('sha1').update(zeichen).digest('hex').slice(0, 12)}.woff2`;
  const datei = path.join(ROOT, 'tools', 'schrift', name);
  if (!fs.existsSync(datei)) throw new Error(`Teil-Schrift ${name} für „${zeichen}“ fehlt. Lokal einmal node tools/readme-bauen.mjs laufen lassen und committen.`);
  return fs.readFileSync(datei).toString('base64');
});

const TEXT = {
  de: {
    zahl: (n) => n.toLocaleString('de-DE'),
    titel: 'Die Zahlen',
    beschreibung: 'Beitragskalender der letzten zwölf Monate als 3D-Zeichnung und vier Zahlen aus meinem GitHub-Konto.',
    mass: (n) => `12 Monate · ${n} Beiträge`,
    felder: ['Werkzeuge', 'Releases', 'öffentliche Repos', 'aktive Tage'],
    kalender: (wochen) => (wochen >= 52 ? 'KALENDER · 12 MONATE' : `KALENDER · LETZTE ${wochen} WOCHEN`),
    schlange: { titel: 'Beiträge der letzten zwölf Monate', beschreibung: 'Das Beitragsraster von GitHub, eine Schlange frisst sich durch die Felder.', feld: 'BEITRÄGE · 12 MONATE' },
  },
  en: {
    zahl: (n) => n.toLocaleString('en-US'),
    titel: 'The numbers',
    beschreibung: 'Contribution calendar of the last twelve months as a 3D drawing and four numbers from my GitHub account.',
    mass: (n) => `12 months · ${n} contributions`,
    felder: ['tools', 'releases', 'public repos', 'active days'],
    kalender: (wochen) => (wochen >= 52 ? 'CALENDAR · 12 MONTHS' : `CALENDAR · LAST ${wochen} WEEKS`),
  },
};
const STUFE = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

const abfrage = `{ user(login: "${KONTO}") {
  contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { contributionCount contributionLevel } } } }
  repositories(ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC, first: 100) { totalCount nodes { releases { totalCount } } }
} }`;
const antwort = await fetch('https://api.github.com/graphql', {
  method: 'POST',
  headers: { authorization: `bearer ${TOKEN}`, 'content-type': 'application/json', 'user-agent': 'statistik-bauen' },
  body: JSON.stringify({ query: abfrage }),
});
const json = await antwort.json();
if (!antwort.ok || json.errors || !json.data?.user) {
  console.error('GitHub hat keine Zahlen geliefert:', antwort.status, JSON.stringify(json.errors || json).slice(0, 400));
  process.exit(1);
}
const konto = json.data.user;
const kalender = konto.contributionsCollection.contributionCalendar;
const tage = kalender.weeks.flatMap((woche, w) => woche.contributionDays.map((tag, d) => ({ w, d, anzahl: tag.contributionCount, stufe: STUFE[tag.contributionLevel] ?? 0 })));
const werte = [
  fs.readdirSync(path.join(ROOT, 'assets', 'karten')).filter((d) => d.endsWith('-dunkel.svg')).length,
  konto.repositories.nodes.reduce((summe, repo) => summe + repo.releases.totalCount, 0),
  konto.repositories.totalCount,
  tage.filter((t) => t.anzahl > 0).length,
];

const fehler = [];
const geschrieben = [];
function schreibe(name, inhalt) {
  if (/(?:href|src)="(?!#)|@import|url\((?!#|data:font\/woff2;base64,)/.test(inhalt)) { fehler.push(`Externer Verweis in ${name}`); return; }
  const datei = path.join(ZIEL, name);
  fs.mkdirSync(ZIEL, { recursive: true });
  if (!fs.existsSync(datei) || fs.readFileSync(datei, 'utf8') !== inhalt) { fs.writeFileSync(datei, inhalt, 'utf8'); geschrieben.push(name); }
}

for (const [sprache, t] of Object.entries(TEXT)) {
  const anhang = sprache === 'de' ? '' : `-${sprache}`;
  const texte = {
    titel: t.titel, beschreibung: t.beschreibung, mass: t.mass(t.zahl(kalender.totalContributions)), tage,
    kalenderFeld: t.kalender(kalenderAusschnitt(tage).wochen),
    felder: t.felder.map((text, i) => ({ text, zahl: t.zahl(werte[i]) })),
  };
  for (const [fassung, m] of Object.entries(ZAHLEN)) {
    for (const feld of texte.felder) if (breite(feld.text, m.textPx) > (fassung === 'quer' ? m.feld - 8 : m.feld - 170)) fehler.push(`Zahlen ${sprache} ${fassung}: Beschriftung zu breit: ${feld.text}`);
    if (breite(texte.mass, m.massPx) > m.breite - 40) fehler.push(`Zahlen ${sprache} ${fassung}: Maßtext zu breit`);
  }
  schreibe(`zahlen${anhang}.svg`, zahlen(FARBEN.bauplan.dunkel, FARBEN.zahlen, texte));
  schreibe(`zahlen-handy${anhang}.svg`, zahlen(FARBEN.bauplan.dunkel, FARBEN.zahlen, texte, true));
}

const roh = path.join(ROOT, 'statistik-roh', 'snake.svg');
if (fs.existsSync(roh)) schreibe('snake.svg', schlange(FARBEN.bauplan.dunkel, fs.readFileSync(roh, 'utf8'), TEXT.de.schlange));
else console.log('  Keine neue Snake (statistik-roh/snake.svg fehlt), das vorhandene Bild bleibt.');

if (fehler.length) { console.error('FEHLER:\n  ' + fehler.join('\n  ')); process.exit(1); }
console.log(`${kalender.totalContributions} Beiträge, ${werte.join(' / ')} (Werkzeuge / Releases / Repos / aktive Tage)`);
console.log(geschrieben.length ? `Geändert (${geschrieben.length}): ${geschrieben.join(', ')}` : 'Nichts geändert.');
