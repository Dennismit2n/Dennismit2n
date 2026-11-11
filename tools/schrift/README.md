# Schrift für die Bilder

Hier liegen kleine Stücke der Schrift Fraunces. Das ist die Überschriftenschrift meiner Website, und meine Profilseite soll genauso aussehen.

GitHub lädt in Bildern keine Schriften nach. Darum steckt die Schrift direkt im Bild. Damit die Bilder leicht bleiben, bekommt jedes nur die Buchstaben, die es wirklich zeigt. Die Kachel „Hourbridge“ trägt zum Beispiel nur die Buchstaben ihres Namens.

| Datei | Wofür |
|---|---|
| `fraunces-560-….woff2` | Buchstaben für den Claim, die Abschnittstitel und den Ablauf |
| `fraunces-600-….woff2` | Buchstaben für die Werkzeugnamen in den Kacheln |
| `OFL.txt` | die Lizenz der Schrift (SIL Open Font License 1.1) |

Die Zahl im Namen ist die Stärke der Schrift. Die Zeichen dahinter sind ein Kürzel für den Buchstabensatz, so findet das Bauskript jedes Stück wieder.

Von Hand wird hier nichts bearbeitet. `tools/readme-bauen.mjs` holt sich die Stücke beim Bau. Braucht ein Bild neue Buchstaben, schneidet `tools/schrift-teilen.py` ein neues Stück aus der Schriftdatei der Website. Dafür braucht es einmalig Python mit:

```bash
pip install fonttools brotli
```

Beim Ansehen der Profilseite wird nichts von fremden Servern geladen. Die Schrift ist Teil des Bildes, und das Bild liegt in diesem Repo.

## In English

This folder holds small pieces of the typeface Fraunces, the heading font of my website. GitHub does not load fonts inside images, so the font is embedded in each image. To keep the images light, each one only carries the letters it actually shows. The build script `tools/readme-bauen.mjs` picks the pieces up on its own, and `tools/schrift-teilen.py` cuts a new piece when an image needs new letters. Nothing is loaded from other servers when you view the profile page.
