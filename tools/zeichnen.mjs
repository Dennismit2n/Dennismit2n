/*
 * Zeichnet die Bilder der Profil-README im Stil einer Werkstattzeichnung (Blaupause):
 * Titelbild, Abschnittsbalken, Werkzeug-Kacheln und den Knopf zur Werkzeugkiste.
 * Reine Funktionen: Farben und Inhalte kommen als Parameter, zurück kommt SVG-Text.
 *
 * Text läuft über Systemschriften (externe Schriften lädt GitHub in Bildern nicht).
 * Weil die je nach System verschieden breit sind, schätzt breite() absichtlich für
 * eine breite Schrift (Verdana-Maß) — was dort passt, passt überall.
 */

export const SCHRIFT = "'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Roboto, Arial, sans-serif";

// ------------------------------------------------------------------ Hilfen

export function leuchtdichte(hex) {
  const k = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * k[0] + 0.7152 * k[1] + 0.0722 * k[2];
}

export function kontrast(a, b) {
  const [hell, dunkel] = [leuchtdichte(a), leuchtdichte(b)].sort((x, y) => y - x);
  return (hell + 0.05) / (dunkel + 0.05);
}

// Geschätzte Textbreite in px, bewusst großzügig (breite Schriften als Maßstab).
export function breite(text, px, fett = false) {
  let em = 0;
  for (const z of text) {
    if (' iljtfI.,:;!|\'’'.includes(z)) em += 0.34;
    else if ('mwMW@'.includes(z)) em += 0.98;
    else if (/[A-ZÄÖÜ0-9]/.test(z)) em += 0.72;
    else em += 0.62;
  }
  return em * px * (fett ? 1.1 : 1);
}

// Bricht Text in Zeilen, die höchstens maxPx breit sind. Zusammengesetzte Wörter
// dürfen am Bindestrich umbrechen („GoatCounter-“ / „Besucherzahlen“).
export function umbrechen(text, px, maxPx) {
  const stuecke = [];
  for (const wort of text.split(' ')) {
    const teile = wort.split(/(?<=-)(?=\p{L})/u);
    teile.forEach((t, i) => stuecke.push({ t, leer: i === 0 }));
  }
  const zeilen = [];
  let zeile = '';
  for (const { t, leer } of stuecke) {
    const probe = zeile ? zeile + (leer ? ' ' : '') + t : t;
    if (breite(probe, px) <= maxPx || !zeile) zeile = probe;
    else { zeilen.push(zeile); zeile = t; }
  }
  if (zeile) zeilen.push(zeile);
  return zeilen;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const text = (x, y, px, farbe, inhalt, extra = '') =>
  `<text x="${x}" y="${y}" font-family="${SCHRIFT}" font-size="${px}" fill="${farbe}"${extra}>${esc(inhalt)}</text>`;
// Text mit Fläche in Grundfarbe dahinter, damit keine Rasterlinie durch die Schrift läuft.
const beschriftung = (x, y, px, farbe, grund, inhalt, extra = '', anker = 'start') => {
  const b = breite(inhalt, px, true) * (extra.includes('letter-spacing') ? 1.12 : 1) + 8;
  const links = anker === 'middle' ? x - b / 2 : x - 4;
  return `<rect x="${links.toFixed(1)}" y="${(y - px * 0.95).toFixed(1)}" width="${b.toFixed(1)}" height="${(px * 1.3).toFixed(1)}" fill="${grund}"/>`
    + text(x, y, px, farbe, inhalt, extra + (anker === 'middle' ? ' text-anchor="middle"' : ''));
};
const pfeilspitze = (x, y, winkel, farbe) =>
  `<path d="M0 0l11 -3.6v7.2z" transform="translate(${x} ${y}) rotate(${winkel})" fill="${farbe}"/>`;

function raster(f, id, x0, y0) {
  return [
    `<pattern id="${id}f" width="10" height="10" x="${x0}" y="${y0}" patternUnits="userSpaceOnUse"><path d="M10 0V10H0" fill="none" stroke="${f.fein}" stroke-width="0.8"/></pattern>`,
    `<pattern id="${id}" width="50" height="50" x="${x0}" y="${y0}" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="url(#${id}f)"/><path d="M50 0V50H0" fill="none" stroke="${f.grob}" stroke-width="1.2"/></pattern>`,
  ].join('');
}

// Werkzeug-Icon (48er viewBox) als verschachteltes SVG an Position x/y in Größe g.
function icon(svg, x, y, g, idPraefix) {
  return svg
    .replace(/<svg\b[^>]*>/, `<svg x="${x}" y="${y}" width="${g}" height="${g}" viewBox="0 0 48 48">`)
    .replace(/\bid="([^"]+)"/g, `id="${idPraefix}-$1"`)
    .replace(/url\(#([^)]+)\)/g, `url(#${idPraefix}-$1)`)
    .trim();
}

// ------------------------------------------------------------------ Titelbild

/*
 * Werkstattzeichnung, 846 breit:
 *   oben links  Vorderansicht der Werkzeugkiste mit Maßen
 *   oben rechts Draufsicht, geöffnet: Einsatz mit einem Fach je Werkzeug, darin die Icons
 *   unten       Schriftfeld über die ganze Breite: Claim, Werkstatt, seit
 */
export function titel(f, { claimZeilen, claimEn, name, seit, icons }) {
  const W = 846, H = 460;
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  // Schmal dargestellt (Handy): die englische Zeile wäre unter 7 px, sie steht im Alt-Text.
  o.push('<style>@media (max-width: 560px) { .en { display: none } }</style>');
  o.push(`<defs>${raster(f, 'tr', 16, 16)}</defs>`);
  o.push(`<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="18" fill="${f.grund}" stroke="${f.kante}" stroke-width="3"/>`);
  o.push(`<rect x="16" y="16" width="814" height="214" fill="url(#tr)"/>`);
  o.push(`<rect x="16" y="16" width="814" height="428" fill="none" stroke="${f.rahmen}" stroke-width="2"/>`);
  // Randmarken wie auf einem Zeichnungsblatt
  const marken = ['M423 6V16M423 444V454M6 230H16M830 230H840'];
  for (let i = 1; i < 8; i++) { const x = +(16 + i * 814 / 8).toFixed(1); if (i !== 4) marken.push(`M${x} 10V16M${x} 444V450`); }
  o.push(`<path d="${marken.join('')}" fill="none" stroke="${f.rahmen}" stroke-width="1.6"/>`);

  // --- Vorderansicht: flache Kiste, niedriger Bügelgriff, zwei seitliche Verschlüsse
  const k = [];
  k.push(`<path d="M170 50V178" stroke="${f.mass}" stroke-width="1.2" stroke-dasharray="16 4 3 4" fill="none"/>`);
  k.push(`<rect x="82" y="112" width="176" height="42" rx="8" fill="none" stroke="${f.mass}" stroke-width="1.2" stroke-dasharray="7 5"/>`);
  k.push(`<path d="M122 84V71Q122 64 129 64H211Q218 64 218 71V84M134 84V76H206V84" fill="none" stroke="${f.kontur}" stroke-width="2.6" stroke-linejoin="round"/>`);
  k.push(`<rect x="74" y="84" width="192" height="78" rx="14" fill="none" stroke="${f.kontur}" stroke-width="2.6"/>`);
  k.push(`<path d="M74 106H266" stroke="${f.kontur}" stroke-width="1.8"/>`);
  for (const x of [114, 198]) k.push(`<rect x="${x}" y="79" width="28" height="7" rx="2" fill="${f.grund}" stroke="${f.kontur}" stroke-width="2"/>`);
  for (const x of [90, 228]) k.push(`<rect x="${x}" y="98" width="22" height="17" rx="3" fill="${f.grund}" stroke="${f.rost}" stroke-width="2.4"/><path d="M${x + 6} 106.5h10" stroke="${f.rost}" stroke-width="2.4" stroke-linecap="round"/>`);
  for (const x of [90, 224]) k.push(`<rect x="${x}" y="162" width="26" height="6" rx="2" fill="none" stroke="${f.kontur}" stroke-width="2"/>`);
  o.push(`<g>${k.join('')}</g>`);
  // Maße
  o.push(`<path d="M74 168V198M266 168V198M74 190H266M66 84H40M66 162H40M48 84V162" fill="none" stroke="${f.mass}" stroke-width="1.2"/>`);
  o.push(pfeilspitze(74, 190, 0, f.mass), pfeilspitze(266, 190, 180, f.mass), pfeilspitze(48, 84, 90, f.mass), pfeilspitze(48, 162, -90, f.mass));
  o.push(beschriftung(170, 184, 16, f.masstext, f.grund, '32', '', 'middle'));
  o.push(`<rect x="30" y="110" width="20" height="26" fill="${f.grund}"/>`);
  o.push(text(42, 123, 16, f.masstext, '15', ' text-anchor="middle" transform="rotate(-90 42 123)"'));
  o.push(beschriftung(74, 220, 11, f.label, f.grund, 'VORDERANSICHT', ' font-weight="600" letter-spacing="1.6"'));

  // --- Draufsicht, geöffnet: ein Fach je Werkzeug, zwei Reihen
  const n = icons.length, spalten = Math.ceil(n / 2), zelleB = 46, zelleH = 42;
  const innenB = spalten * zelleB, innenH = 2 * zelleH, wand = 6;
  const dx = Math.round(560 - innenB / 2 - wand), dy = 72;
  const ix = dx + wand, iy = dy + wand;
  o.push(`<rect x="${dx}" y="${dy}" width="${innenB + 2 * wand}" height="${innenH + 2 * wand}" rx="10" fill="${f.grund}" stroke="${f.kontur}" stroke-width="2.6"/>`);
  const faecher = [`M${ix} ${iy}h${innenB}v${innenH}h${-innenB}z`, `M${ix} ${iy + zelleH}h${innenB}`];
  for (let i = 1; i < spalten; i++) faecher.push(`M${ix + i * zelleB} ${iy}v${innenH}`);
  o.push(`<path d="${faecher.join('')}" fill="none" stroke="${f.kontur}" stroke-width="1.4"/>`);
  icons.forEach((svg, i) => {
    const sx = ix + (i % spalten) * zelleB + (zelleB - 30) / 2;
    const sy = iy + Math.floor(i / spalten) * zelleH + (zelleH - 30) / 2;
    o.push(icon(svg, sx, sy, 30, `t${i}`));
  });
  // Mengenangabe über die ganze Breite des Einsatzes
  const my = dy - 22;
  o.push(`<path d="M${ix} ${dy - 4}V${my - 8}M${ix + innenB} ${dy - 4}V${my - 8}M${ix} ${my}H${ix + innenB}" fill="none" stroke="${f.mass}" stroke-width="1.2"/>`);
  o.push(pfeilspitze(ix, my, 0, f.mass), pfeilspitze(ix + innenB, my, 180, f.mass));
  o.push(`<rect x="${ix + innenB / 2 - 34}" y="${my - 15}" width="68" height="22" fill="${f.grund}"/>`);
  o.push(text(ix + innenB / 2, my + 5, 18, f.rost, `${n}×`, ' font-weight="700" text-anchor="middle"'));
  o.push(beschriftung(dx, 220, 11, f.label, f.grund, 'DRAUFSICHT, GEÖFFNET', ' font-weight="600" letter-spacing="1.6"'));

  // --- Schriftfeld
  o.push(`<rect x="16" y="230" width="814" height="214" fill="${f.grund}" stroke="${f.rahmen}" stroke-width="2.6"/>`);
  o.push(`<path d="M16 382H830M600 382V444" stroke="${f.rahmen}" stroke-width="1.6"/>`);
  const feld = ' font-weight="600" letter-spacing="1.6"';
  o.push(text(30, 249, 11, f.label, 'BENENNUNG', feld));
  o.push(text(30, 399, 11, f.label, 'WERKSTATT', feld));
  o.push(text(614, 399, 11, f.label, 'SEIT', feld));
  o.push(text(30, 296, 46, f.schrift, claimZeilen[0], ' font-weight="600"'));
  o.push(text(30, 344, 46, f.schrift, claimZeilen[1], ' font-weight="600"'));
  o.push(text(30, 372, 19, f.schrift2, claimEn, ' lang="en" class="en"'));
  o.push(text(30, 436, 42, f.schrift, name, ' font-weight="600"'));
  o.push(text(614, 436, 42, f.schrift2, seit));
  o.push('</svg>', '');
  return o.join('\n');
}

// ------------------------------------------------------------------ Abschnittsbalken

// akzent = { text, linie } der Abschnittsfarbe.
export function balken(f, { nummer, titel: t, en }, akzent) {
  const W = 846, H = 72;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    // Schmal dargestellt (Handy): Titel größer als Fließtext, rechtes Feld samt englischer Zeile aus.
    '<style>@media (max-width: 560px) { .titel { font-size: 50px } .en { display: none } }</style>',
    `<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="12" fill="${f.grund}" stroke="${f.kante}" stroke-width="3"/>`,
    `<rect x="8" y="8" width="830" height="56" fill="none" stroke="${akzent.linie}" stroke-width="2"/>`,
    `<path d="M72 8V64" stroke="${akzent.linie}" stroke-width="1.6"/>`,
    `<path class="en" d="M640 8V64" stroke="${akzent.linie}" stroke-width="1.6"/>`,
    `<circle cx="40" cy="36" r="17" fill="none" stroke="${akzent.text}" stroke-width="2.4"/>`,
    text(40, 42, 17, akzent.text, nummer, ' font-weight="600" text-anchor="middle"'),
    text(90, 52, 42, akzent.text, t, ' font-weight="600" class="titel"'),
    text(824, 43, 19, akzent.text, en, ' text-anchor="end" lang="en" class="en"'),
    '</svg>',
    '',
  ].join('\n');
}

// ------------------------------------------------------------------ Werkzeug-Kachel

// descPx 21 bei 420 Breite: am Handy (293 px) 14,65 px.
export const KARTE = { breite: 420, rand: 5, descPx: 21, descZeile: 27, descMax: 368, artPx: 21, oben: 122 };

// Höhe einer Kachel mit n Beschreibungszeilen.
export const kartenHoehe = (n) => KARTE.oben + (n - 1) * KARTE.descZeile + 26;

// akzent = { text, linie, verlauf? } — die Kachelfarbe des Werkzeugs auf der Website;
// verlauf (Farbstopps) nur bei Werkzeugen, deren Website-Kachel einen Verlauf trägt.
export function karte(f, { iconSvg, name, art, zeilen, hoehe, id }, akzent) {
  const W = KARTE.breite, r = KARTE.rand;
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${hoehe}" viewBox="0 0 ${W} ${hoehe}">`);
  let rand = akzent.linie;
  if (akzent.verlauf) {
    const n = akzent.verlauf.length - 1;
    const stopps = akzent.verlauf.map((c, i) => `<stop offset="${((i / n) * 100).toFixed(0)}%" stop-color="${c}"/>`).join('');
    o.push(`<defs><linearGradient id="${id}-v" x1="0" y1="0" x2="1" y2="0.2">${stopps}</linearGradient></defs>`);
    rand = `url(#${id}-v)`;
  }
  o.push(`<rect x="${r + 1.25}" y="${r + 1.25}" width="${W - 2 * r - 2.5}" height="${hoehe - 2 * r - 2.5}" rx="16" fill="${f.grund}" stroke="${rand}" stroke-width="2.5"/>`);
  o.push(`<rect x="${r + 9}" y="${r + 9}" width="${W - 2 * r - 18}" height="${hoehe - 2 * r - 18}" rx="9" fill="none" stroke="${f.fein}" stroke-width="1.2"/>`);
  o.push(icon(iconSvg, 24, 22, 56, id));
  o.push(text(94, 48, 24, f.schrift, name, ' font-weight="700"'));
  // Etikett der Art: Umriss in der Artfarbe, Text in ihrer hellen Stufe.
  const eb = breite(art, KARTE.artPx) + 24;
  o.push(`<rect x="94" y="58" width="${eb.toFixed(1)}" height="30" rx="15" fill="none" stroke="${akzent.linie}" stroke-width="1.8"/>`);
  o.push(text(106, 80, KARTE.artPx, akzent.text, art));
  zeilen.forEach((z, i) => o.push(text(24, KARTE.oben + i * KARTE.descZeile, KARTE.descPx, f.schrift2, z)));
  o.push('</svg>', '');
  return o.join('\n');
}

// ------------------------------------------------------------------ Knopf

// Dieselbe flache Werkzeugkiste wie im Titelbild (niedriger Bügelgriff, zwei
// seitliche Verschlüsse), klein. Der hohe Bogengriff des Website-Zeichens las
// sich groß gezeichnet als Vorhängeschloss.
function koffer(farbe) {
  return [
    `<g transform="translate(22 30)" fill="none" stroke="${farbe}" stroke-linecap="round" stroke-linejoin="round">`,
    '<path d="M28 20V14Q28 11 31 11H57Q60 11 60 14V20M34 20V16H54V20" stroke-width="3.4"/>',
    '<rect x="8" y="20" width="72" height="42" rx="8" stroke-width="3.6"/>',
    '<path d="M8 33H80" stroke-width="3"/>',
    '<path d="M18 29v8M70 29v8" stroke-width="5"/>',
    '</g>',
  ].join('');
}

export function knopf(f) {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="128" viewBox="0 0 700 128">',
    `<rect x="2" y="2" width="696" height="124" rx="26" fill="${f.flaeche}" stroke="${f.rand}" stroke-width="3"/>`,
    koffer(f.schrift),
    text(140, 60, 40, f.schrift, 'Zur Werkzeugkiste', ' font-weight="700"'),
    text(140, 102, 34, f.schrift2, 'To the toolbox'),
    `<path d="M606 64h52M636 42l22 22-22 22" fill="none" stroke="${f.pfeil}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
    '</svg>',
    '',
  ].join('\n');
}
