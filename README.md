# IATA-boy

Chrome extension that shows IATA airport and metro area info when you select text on any webpage. Select text containing codes like `JFK`, `LHR`, or `nyc001` and a popup appears with airport details.

## Features

- Detects 3-letter IATA codes in selected text (case-insensitive, works with suffixes like `gru123`)
- Shows airport name, city, and country
- Recognizes metro/city codes (e.g. `NYC`, `LON`) and lists member airports
- Draggable popup, dismiss with Escape or click outside

## Data

Airport data is sourced from [lxndrblz/Airports](https://github.com/lxndrblz/Airports). The build script downloads the CSV, extracts airports, and groups them into metro areas using the `city_code` column.

## Build

```
make build
```

This runs `node scripts/build-airports.js` which fetches the latest data and writes `airports.json`.

## Install

1. Run `make build` to generate `airports.json`
2. Open `chrome://extensions`, enable Developer mode
3. Click "Load unpacked" and select this directory
