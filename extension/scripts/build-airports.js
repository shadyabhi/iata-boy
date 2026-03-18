#!/usr/bin/env node

/**
 * Fetches airport data from lxndrblz/Airports and produces airports.json
 * with both individual airport entries and metro/city code entries.
 *
 * Source: https://github.com/lxndrblz/Airports
 */

const fs = require("fs");
const path = require("path");

const CSV_URL =
  "https://raw.githubusercontent.com/lxndrblz/Airports/main/airports.csv";

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function parseCSV(text) {
  const lines = text.split("\n");
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }
  return rows;
}

async function main() {
  console.log("Fetching airports from lxndrblz/Airports...");
  const resp = await fetch(CSV_URL);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  const text = await resp.text();
  const rows = parseCSV(text);
  console.log(`Parsed ${rows.length} rows`);

  const airports = {};
  // metro code -> { city, country, airports: Set }
  const metros = {};

  for (const row of rows) {
    const iata = (row.code || "").trim().toUpperCase();
    const type = (row.type || "").trim();

    // Only keep actual airports with valid 3-letter IATA codes
    if (!iata || iata.length !== 3 || !/^[A-Z]{3}$/.test(iata)) continue;
    if (type !== "AP") continue;

    const country = (row.country || "").trim();
    const city = (row.city || "").trim();
    const name = (row.name || "").trim();
    const cityCode = (row.city_code || "").trim().toUpperCase();

    airports[iata] = { name, city, country };

    // If city_code differs from iata, this airport belongs to a metro area
    if (cityCode && cityCode.length === 3 && cityCode !== iata) {
      if (!metros[cityCode]) {
        metros[cityCode] = { cities: {}, country, airports: new Set() };
      }
      // Track city names by frequency to pick the most common one
      metros[cityCode].cities[city] = (metros[cityCode].cities[city] || 0) + 1;
      metros[cityCode].airports.add(iata);
    }
  }

  // Add metro entries (only those with 2+ airports, and that aren't already airports themselves)
  let metroCount = 0;
  for (const [code, meta] of Object.entries(metros)) {
    if (meta.airports.size < 2) continue;
    const memberAirports = [...meta.airports].sort();
    // Pick the most common city name among member airports
    const bestCity = Object.entries(meta.cities)
      .filter(([c]) => c)
      .sort((a, b) => b[1] - a[1])[0];
    const city = bestCity ? bestCity[0] : "";

    airports[code] = airports[code] || {};
    airports[code] = {
      ...airports[code],
      city: airports[code].city || city,
      country: airports[code].country || meta.country,
      airports: memberAirports,
    };
    metroCount++;
  }

  const sorted = Object.keys(airports)
    .sort()
    .reduce((acc, key) => {
      acc[key] = airports[key];
      return acc;
    }, {});

  const outPath = path.join(__dirname, "..", "airports.json");
  fs.writeFileSync(outPath, JSON.stringify(sorted, null, 2));
  console.log(
    `Written ${Object.keys(sorted).length} entries (${metroCount} metro codes) to ${outPath}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
