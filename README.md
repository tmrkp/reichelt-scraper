# reichelt-scraper

Liest Produktlisten aus einer oder mehreren Kategorien von [reichelt.de](https://www.reichelt.de) aus und exportiert sie in eine CSV-Datei.

Pro Produkt werden Produkt-ID, Name, SKU, URL, Preis und alle aufgeführten Artikeleigenschaften erfasst. Jede Eigenschaft bekommt eine eigene Spalte in der CSV.

## Voraussetzungen

- Node.js 18+ (benötigt das eingebaute `fetch`)

## Installation

```sh
npm install
```

## Verwendung

```sh
node scrape.js <dateiname> <kategorieId> [kategorieId ...]
```

- `dateiname`: Basisname der Ausgabedatei. Erlaubt sind Buchstaben, Ziffern, `_` und `-`; der Name darf nicht nur aus Ziffern bestehen.
- `kategorieId`: eine oder mehrere numerische reichelt-Kategorie-IDs.

Beispiel:

```sh
node scrape.js widerstaende 3141 3160
```

Damit wird `widerstaende_JJJJ-MM-TT.csv` (mit dem heutigen Datum) im aktuellen Verzeichnis erstellt. Preise verwenden das Komma als Dezimaltrennzeichen.

## Hinweise

- Seiten werden mit je 16 Artikeln abgerufen, mit bis zu 8 parallelen Anfragen.
- Der Scraper nutzt die interne Kategorie-API von reichelt und kann daher nicht mehr funktionieren, wenn sich diese API ändert.
