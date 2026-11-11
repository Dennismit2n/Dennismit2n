#!/usr/bin/env python3
"""Schneidet aus der Überschriftenschrift der Website eine kleine Teil-Schrift.

Aufruf (macht tools/readme-bauen.mjs selbst, sobald ein Bild neue Buchstaben braucht):

    python tools/schrift-teilen.py <quelle.woff2> <ziel.woff2> <stärke> <zeichen als Hex-Liste>

Aus der variablen Fraunces wird eine feste Stärke gerechnet und alles entfernt,
was die genannten Zeichen nicht brauchen. So wiegt die Schrift im Bild wenige
Kilobyte statt rund 37. Unterschneidung (kern) und Ligaturen bleiben erhalten.

Braucht einmalig:  pip install fonttools brotli
Schrift: Fraunces, SIL Open Font License 1.1 (tools/schrift/OFL.txt).
"""
import sys

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont


def main() -> int:
    if len(sys.argv) != 5:
        print(__doc__)
        return 2
    quelle, ziel, staerke, hexliste = sys.argv[1:5]
    zeichen = [int(h, 16) for h in hexliste.split(",") if h]

    schrift = TTFont(quelle)
    if "fvar" in schrift:
        schrift = instantiateVariableFont(schrift, {"wght": float(staerke)})

    optionen = Options()
    optionen.layout_features = ["kern", "liga", "ccmp", "locl", "mark", "mkmk"]
    optionen.hinting = False
    optionen.notdef_outline = True
    optionen.name_IDs = [1, 2, 3, 4, 6, 13, 14]
    optionen.name_languages = [0x409]
    teiler = Subsetter(optionen)
    teiler.populate(unicodes=zeichen)
    teiler.subset(schrift)

    schrift.flavor = "woff2"
    schrift.save(ziel)
    return 0


if __name__ == "__main__":
    sys.exit(main())
