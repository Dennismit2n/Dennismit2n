/*
 * Zeichnet die Bilder der Profil-README im Stil einer Werkstattzeichnung (Blaupause),
 * eingefärbt wie das Twitch-Banner: Violett-Grund mit weicher Aurora, Konturen im
 * Verlauf, leuchtende Icons und ein bunter Saum um den Einsatz.
 * Titelbild, Abschnittsbalken, Werkzeug-Kacheln, den Knopf zur Werkzeugkiste und den Kaffee-Knopf.
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

// Farbe oben mit Deckkraft t über Farbe unten (so mischt auch der Browser).
export function mischen(unten, oben, t) {
  const k = (h, i) => parseInt(h.slice(i, i + 2), 16);
  return '#' + [1, 3, 5].map((i) => Math.round(k(unten, i) + (k(oben, i) - k(unten, i)) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Hellste Stelle eines Grundes unter seiner Aurora: der stärkste Fleck mit voller
// Deckkraft (die Weichzeichnung macht es nur dunkler). Text muss auch hier lesbar sein.
export function hellsteStelle(grund, aurora) {
  return aurora.map(([farbe, deckkraft]) => mischen(grund, farbe, deckkraft))
    .reduce((a, b) => (leuchtdichte(b) > leuchtdichte(a) ? b : a), grund);
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
// Feldname wie im Banner: klein, fett, gesperrt.
const feldname = (x, y, f, inhalt) => text(x, y, 11, f.label, inhalt, ' font-weight="700" letter-spacing="1.6"');
const pfeilspitze = (x, y, winkel, farbe) =>
  `<path d="M0 0l11 -3.6v7.2z" transform="translate(${x} ${y}) rotate(${winkel})" fill="${farbe}"/>`;

const stopps = (farben) => farben.map((c, i) => `<stop offset="${(i / (farben.length - 1)).toFixed(3)}" stop-color="${c}"/>`).join('');
// Verlauf in Bildkoordinaten: bleibt auch auf geraden Linien sichtbar (deren Umriss hat keine Höhe).
const verlaufRaum = (id, farben, [x1, y1, x2, y2]) =>
  `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopps(farben)}</linearGradient>`;
// Verlauf über die eigene Breite des Elements (für Text).
const verlaufQuer = (id, farben) => `<linearGradient id="${id}" x1="0" x2="1">${stopps(farben)}</linearGradient>`;
// Eine Farbe bleibt Farbe, eine Liste wird zum Verlauf mit dieser id.
const farbeOder = (wert, id) => (Array.isArray(wert) ? `url(#${id})` : wert);

const weich = (id, sigma, rand = 60) =>
  `<filter id="${id}" x="-${rand}%" y="-${rand}%" width="${100 + 2 * rand}%" height="${100 + 2 * rand}%"><feGaussianBlur stdDeviation="${sigma}"/></filter>`;

// Weichgezeichnete Farbflecken wie im Twitch-Banner, ein Fleck je Aurora-Farbe:
// flecken = [[cx, cy, rx, ry], …] in derselben Reihenfolge wie aurora.
function auroraFlecken(aurora, flecken, filterId) {
  return `<g filter="url(#${filterId})">`
    + flecken.map(([cx, cy, rx, ry], i) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${aurora[i][0]}" opacity="${aurora[i][1]}"/>`).join('')
    + '</g>';
}

function raster(f, id, x0, y0) {
  return [
    `<pattern id="${id}f" width="10" height="10" x="${x0}" y="${y0}" patternUnits="userSpaceOnUse"><path d="M10 0V10H0" fill="none" stroke="${f.raster}" stroke-opacity="${f.fein}" stroke-width="0.7"/></pattern>`,
    `<pattern id="${id}" width="50" height="50" x="${x0}" y="${y0}" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill="url(#${id}f)"/><path d="M50 0V50H0" fill="none" stroke="${f.raster}" stroke-opacity="${f.grob}" stroke-width="1"/></pattern>`,
  ].join('');
}

// Familienbalken der Website (drei Farben, wie unter dem Claim im Banner), 160 breit.
const familienbalken = (x, y, f) =>
  `<g transform="translate(${x} ${y})"><rect width="88" height="4" rx="2" fill="${f.familie[0]}"/><rect x="86" width="47" height="4" fill="${f.familie[1]}"/><rect x="131" width="29" height="4" rx="2" fill="${f.familie[2]}"/></g>`;

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
 *               mit Leuchten und Farbkappe in der Kachelfarbe, darum ein Saum in allen Farben
 *   unten       Schriftfeld über die ganze Breite: Claim, Werkstatt, seit
 * werkzeuge = [{ svg, farbe, verlauf? }] in Kachel-Reihenfolge.
 */
export function titel(f, { claimZeilen, claimEn, name, seit, werkzeuge }) {
  const W = 846, H = 460;
  const n = werkzeuge.length, spalten = Math.ceil(n / 2), zelleB = 46, zelleH = 42;
  const innenB = spalten * zelleB, innenH = 2 * zelleH, wand = 6;
  const dx = Math.round(560 - innenB / 2 - wand), dy = 72;
  const ix = dx + wand, iy = dy + wand, eb = innenB + 2 * wand, eh = innenH + 2 * wand;

  const defs = [
    `<clipPath id="tb"><rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="16"/></clipPath>`,
    raster(f, 'tr', 16, 16),
    weich('ta', 40),
    weich('tg', 5, 100),
    weich('ts', 8, 40),
    verlaufRaum('tk', f.kontur, [74, 64, 266, 168]),
    verlaufRaum('te', f.kontur, [dx, dy, dx + eb, dy + eh]),
    verlaufRaum('tsv', werkzeuge.map((w) => w.farbe), [dx, 0, dx + eb, 0]),
    verlaufQuer('tc', f.claim),
  ];
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`);
  // Schmal dargestellt (Handy): die englische Zeile wäre unter 7 px, sie steht im Alt-Text.
  o.push('<style>@media (max-width: 560px) { .en { display: none } }</style>');
  const defsPlatz = o.push('') - 1;

  // --- Blatt: Grund, Aurora, Raster, Rahmen
  o.push(`<g clip-path="url(#tb)"><rect width="${W}" height="${H}" fill="${f.grund}"/>`
    + auroraFlecken(f.aurora, [[140, 140, 290, 160], [740, 300, 320, 190], [470, 170, 240, 80]], 'ta')
    + `<rect x="16" y="16" width="814" height="214" fill="url(#tr)"/></g>`);
  o.push(`<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="18" fill="none" stroke="${f.kante}" stroke-width="3"/>`);
  o.push(`<rect x="16" y="16" width="814" height="428" fill="none" stroke="${f.rahmen}" stroke-width="2"/>`);
  // Randmarken wie auf einem Zeichnungsblatt
  const marken = ['M423 6V16M423 444V454M6 230H16M830 230H840'];
  for (let i = 1; i < 8; i++) { const x = +(16 + i * 814 / 8).toFixed(1); if (i !== 4) marken.push(`M${x} 10V16M${x} 444V450`); }
  o.push(`<path d="${marken.join('')}" fill="none" stroke="${f.rahmen}" stroke-width="1.6"/>`);

  // --- Vorderansicht: flache Kiste, niedriger Bügelgriff, zwei seitliche Verschlüsse
  const k = [];
  k.push(`<rect x="74" y="84" width="192" height="78" rx="14" fill="${f.grund}" fill-opacity="0.5" stroke="url(#tk)" stroke-width="2.6"/>`);
  k.push(`<path d="M170 50V178" stroke="${f.mass}" stroke-opacity="0.55" stroke-width="1" stroke-dasharray="16 4 3 4" fill="none"/>`);
  k.push(`<rect x="82" y="112" width="176" height="42" rx="8" fill="none" stroke="${f.raster}" stroke-opacity="0.75" stroke-width="1.3" stroke-dasharray="7 5"/>`);
  k.push(`<path d="M122 84V71Q122 64 129 64H211Q218 64 218 71V84M134 84V76H206V84" fill="none" stroke="url(#tk)" stroke-width="2.6" stroke-linejoin="round"/>`);
  k.push(`<path d="M74 106H266" stroke="url(#tk)" stroke-width="1.8"/>`);
  for (const x of [114, 198]) k.push(`<rect x="${x}" y="79" width="28" height="7" rx="2" fill="${f.grund}" stroke="url(#tk)" stroke-width="2"/>`);
  for (const x of [90, 228]) {
    k.push(`<rect x="${x}" y="98" width="22" height="17" rx="3" fill="${f.grund}"/>`);
    k.push(`<rect x="${x}" y="98" width="22" height="17" rx="3" fill="${f.akzent}" fill-opacity="0.14" stroke="${f.akzent}" stroke-width="2.4"/><path d="M${x + 6} 106.5h10" stroke="${f.akzent}" stroke-width="2.4" stroke-linecap="round"/>`);
  }
  for (const x of [90, 224]) k.push(`<rect x="${x}" y="162" width="26" height="6" rx="2" fill="none" stroke="url(#tk)" stroke-width="2"/>`);
  o.push(`<g>${k.join('')}</g>`);
  // Maße, die Maßlinie offen für die Zahl
  o.push(`<path d="M74 168V198M266 168V198M66 84H40M66 162H40" fill="none" stroke="${f.mass}" stroke-opacity="0.7" stroke-width="1"/>`);
  o.push(`<path d="M74 190H152M188 190H266M48 84V109M48 137V162" fill="none" stroke="${f.mass}" stroke-width="1.3"/>`);
  o.push(pfeilspitze(74, 190, 0, f.mass), pfeilspitze(266, 190, 180, f.mass), pfeilspitze(48, 84, 90, f.mass), pfeilspitze(48, 162, -90, f.mass));
  o.push(text(170, 196, 16, f.akzent, '32', ' text-anchor="middle"'));
  o.push(text(48, 123, 16, f.akzent, '15', ' text-anchor="middle" dominant-baseline="central" transform="rotate(-90 48 123)"'));
  o.push(feldname(74, 220, f, 'VORDERANSICHT'));

  // --- Draufsicht, geöffnet: ein Fach je Werkzeug, zwei Reihen
  o.push(`<rect x="${dx - 6}" y="${dy - 4}" width="${eb + 12}" height="${eh + 8}" rx="14" fill="url(#tsv)" opacity="0.78" filter="url(#ts)"/>`);
  o.push(`<rect x="${dx}" y="${dy}" width="${eb}" height="${eh}" rx="10" fill="${f.grund}" fill-opacity="0.9" stroke="url(#te)" stroke-width="2.6"/>`);
  const faecher = [`M${ix} ${iy}h${innenB}v${innenH}h${-innenB}z`, `M${ix} ${iy + zelleH}h${innenB}`];
  for (let i = 1; i < spalten; i++) faecher.push(`M${ix + i * zelleB} ${iy}v${innenH}`);
  o.push(`<path d="${faecher.join('')}" fill="none" stroke="${f.rahmen}" stroke-width="1.3"/>`);
  werkzeuge.forEach((w, i) => {
    const zx = ix + (i % spalten) * zelleB, zy = iy + Math.floor(i / spalten) * zelleH;
    const mx = zx + zelleB / 2, my = zy + zelleH / 2 + 1.5;
    let kappe = w.farbe;
    if (w.verlauf) { defs.push(verlaufRaum(`tv${i}`, w.verlauf, [zx + 5, 0, zx + zelleB - 5, 0])); kappe = `url(#tv${i})`; }
    o.push(`<circle cx="${mx}" cy="${my}" r="15" fill="${w.farbe}" opacity="0.82" filter="url(#tg)"/>`);
    o.push(`<rect x="${zx + 5}" y="${zy + 2.5}" width="${zelleB - 10}" height="2.4" rx="1.2" fill="${kappe}"/>`);
    o.push(icon(w.svg, mx - 15, my - 15, 30, `t${i}`));
  });
  // Mengenangabe über die ganze Breite des Einsatzes
  const my = dy - 22, mitte = ix + innenB / 2;
  o.push(`<path d="M${ix} ${dy - 4}V${my - 8}M${ix + innenB} ${dy - 4}V${my - 8}" fill="none" stroke="${f.mass}" stroke-opacity="0.7" stroke-width="1"/>`);
  o.push(`<path d="M${ix} ${my}H${mitte - 30}M${mitte + 30} ${my}H${ix + innenB}" fill="none" stroke="${f.mass}" stroke-width="1.3"/>`);
  o.push(pfeilspitze(ix, my, 0, f.mass), pfeilspitze(ix + innenB, my, 180, f.mass));
  o.push(text(mitte, my + 6, 18, f.akzent, `${n}×`, ' font-weight="700" text-anchor="middle"'));
  o.push(feldname(dx, 220, f, 'DRAUFSICHT, GEÖFFNET'));

  // --- Schriftfeld
  o.push(`<rect x="16" y="230" width="814" height="214" fill="${f.grund}" fill-opacity="0.82" stroke="${f.rahmen}" stroke-width="2.6"/>`);
  o.push(`<path d="M16 382H830M600 382V444" stroke="${f.rahmen}" stroke-width="1.6"/>`);
  o.push(feldname(30, 249, f, 'BENENNUNG'));
  o.push(familienbalken(650, 241, f));
  o.push(feldname(30, 399, f, 'WERKSTATT'));
  o.push(feldname(614, 399, f, 'SEIT'));
  o.push(text(30, 296, 46, 'url(#tc)', claimZeilen[0], ' font-weight="600"'));
  o.push(text(30, 344, 46, 'url(#tc)', claimZeilen[1], ' font-weight="600"'));
  o.push(text(30, 372, 19, f.schrift2, claimEn, ' lang="en" class="en"'));
  o.push(text(30, 436, 42, f.schrift, name, ' font-weight="600"'));
  o.push(text(614, 436, 42, f.akzent, seit, ' font-weight="300"'));
  o.push('</svg>', '');
  o[defsPlatz] = `<defs>${defs.join('')}</defs>`;
  return o.join('\n');
}

// ------------------------------------------------------------------ Abschnittsbalken

export function balken(f, { nummer, titel: t, en }) {
  const W = 846, H = 72;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`,
    // Schmal dargestellt (Handy): Titel größer als Fließtext, rechtes Feld samt englischer Zeile aus.
    '<style>@media (max-width: 560px) { .titel { font-size: 50px } .en { display: none } }</style>',
    `<defs><clipPath id="bb"><rect x="3" y="3" width="${W - 6}" height="${H - 6}" rx="10"/></clipPath>${raster(f, 'br', 8, 8)}${weich('ba', 22)}${verlaufQuer('bc', f.claim)}</defs>`,
    `<g clip-path="url(#bb)"><rect width="${W}" height="${H}" fill="${f.grund}"/>`
      + auroraFlecken(f.aurora, [[110, 30, 220, 40], [770, 46, 230, 42], [430, 36, 170, 26]], 'ba')
      + `<rect x="8" y="8" width="830" height="56" fill="url(#br)"/></g>`,
    `<rect x="1.5" y="1.5" width="${W - 3}" height="${H - 3}" rx="12" fill="none" stroke="${f.kante}" stroke-width="3"/>`,
    `<rect x="8" y="8" width="830" height="56" fill="none" stroke="${f.rahmen}" stroke-width="2"/>`,
    `<path d="M72 8V64" stroke="${f.rahmen}" stroke-width="1.6"/>`,
    `<path class="en" d="M640 8V64" stroke="${f.rahmen}" stroke-width="1.6"/>`,
    `<circle cx="40" cy="36" r="17" fill="${f.grund}" fill-opacity="0.6" stroke="${f.akzent}" stroke-width="2.4"/>`,
    text(40, 42, 17, f.akzent, nummer, ' font-weight="600" text-anchor="middle"'),
    text(90, 52, 42, 'url(#bc)', t, ' font-weight="600" class="titel"'),
    text(824, 43, 19, f.schrift2, en, ' text-anchor="end" lang="en" class="en"'),
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
// Die Farbe leuchtet hinter dem Icon wie im Einsatz des Titelbilds.
export function karte(f, { iconSvg, name, art, zeilen, hoehe, id }, akzent) {
  const W = KARTE.breite, r = KARTE.rand;
  const x = r + 1.25, y = r + 1.25, b = W - 2 * r - 2.5, h = hoehe - 2 * r - 2.5;
  const defs = [
    `<clipPath id="${id}-c"><rect x="${x}" y="${y}" width="${b}" height="${h}" rx="16"/></clipPath>`,
    weich(`${id}-a`, 26),
    weich(`${id}-g`, 8, 100),
  ];
  let rand = akzent.linie;
  if (akzent.verlauf) {
    const n = akzent.verlauf.length - 1;
    const s = akzent.verlauf.map((c, i) => `<stop offset="${((i / n) * 100).toFixed(0)}%" stop-color="${c}"/>`).join('');
    defs.push(`<linearGradient id="${id}-v" x1="0" y1="0" x2="1" y2="0.2">${s}</linearGradient>`);
    rand = `url(#${id}-v)`;
  }
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${hoehe}" viewBox="0 0 ${W} ${hoehe}">`);
  o.push(`<defs>${defs.join('')}</defs>`);
  o.push(`<g clip-path="url(#${id}-c)"><rect width="${W}" height="${hoehe}" fill="${f.grund}"/>`
    + auroraFlecken(f.aurora, [[W - 40, 0, 170, 60], [W - 10, hoehe + 10, 190, 60], [-20, hoehe / 2, 90, 50]], `${id}-a`)
    + `<circle cx="52" cy="50" r="24" fill="${akzent.linie}" opacity="0.55" filter="url(#${id}-g)"/></g>`);
  o.push(`<rect x="${x}" y="${y}" width="${b}" height="${h}" rx="16" fill="none" stroke="${rand}" stroke-width="2.5"/>`);
  o.push(`<rect x="${r + 9}" y="${r + 9}" width="${W - 2 * r - 18}" height="${hoehe - 2 * r - 18}" rx="9" fill="none" stroke="${f.rahmen}" stroke-opacity="0.55" stroke-width="1.2"/>`);
  o.push(icon(iconSvg, 24, 22, 56, id));
  o.push(text(94, 48, 24, f.schrift, name, ' font-weight="700"'));
  // Etikett der Art: Umriss in der Kachelfarbe, Text in ihr oder (zu dunkel) im Nebentext.
  const eb = breite(art, KARTE.artPx) + 24;
  o.push(`<rect x="94" y="58" width="${eb.toFixed(1)}" height="30" rx="15" fill="${f.grund}" fill-opacity="0.5" stroke="${akzent.linie}" stroke-width="1.8"/>`);
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

// Kaffeetasse mit Dampf, Herz, Henkel und Untertasse, so groß wie der Koffer.
function tasse(farbe) {
  return [
    `<g transform="translate(22 30)" fill="none" stroke="${farbe}" stroke-linecap="round" stroke-linejoin="round">`,
    '<path d="M24 16Q20 11 24 6M37 16Q33 11 37 6M50 16Q46 11 50 6" stroke-width="3"/>',
    '<path d="M14 22H62V42Q62 56 48 56H28Q14 56 14 42Z" stroke-width="3.6"/>',
    '<path d="M62 28H67Q75 28 75 36Q75 44 67 44H62" stroke-width="3.4"/>',
    '<path d="M8 63H80" stroke-width="4"/>',
    `<path d="M38 47C30 41 30 34 34 34C36 34 37.5 35.5 38 37C38.5 35.5 40 34 42 34C46 34 46 41 38 47Z" fill="${farbe}" stroke="none"/>`,
    '</g>',
  ].join('');
}

// Was auf einem Knopf steht; farbe nennt die Rolle in farben.json, die das Zeichen färbt.
export const KNOEPFE = {
  werkzeugkiste: { zeichen: koffer, farbe: 'koffer', oben: 'Zur Werkzeugkiste', unten: 'To the toolbox' },
  kaffee: { zeichen: tasse, farbe: 'tasse', oben: 'Kaffee spendieren', unten: 'Buy me a coffee' },
};

// f = Knopf-Farben; rand ist eine Farbe oder ein Verlauf (Liste).
export function knopf(f, art = KNOEPFE.werkzeugkiste) {
  const defs = [`<clipPath id="kc"><rect x="2" y="2" width="696" height="124" rx="26"/></clipPath>`, weich('ka', 26)];
  if (Array.isArray(f.rand)) defs.push(verlaufRaum('kr', f.rand, [2, 2, 698, 126]));
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="128" viewBox="0 0 700 128">',
    `<defs>${defs.join('')}</defs>`,
    `<g clip-path="url(#kc)"><rect width="700" height="128" fill="${f.flaeche}"/>`
      + auroraFlecken(f.aurora, [[90, 70, 170, 60], [560, 64, 200, 50]], 'ka') + '</g>',
    `<rect x="2" y="2" width="696" height="124" rx="26" fill="none" stroke="${farbeOder(f.rand, 'kr')}" stroke-width="3"/>`,
    art.zeichen(f[art.farbe]),
    text(140, 60, 40, f.schrift, art.oben, ' font-weight="700"'),
    text(140, 102, 34, f.schrift2, art.unten),
    `<path d="M606 64h52M636 42l22 22-22 22" fill="none" stroke="${f.pfeil}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
    '</svg>',
    '',
  ].join('\n');
}
