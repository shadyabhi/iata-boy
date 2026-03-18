#!/usr/bin/env node

/**
 * Fetches OurAirports CSV data and produces airports.json
 * Sources:
 *   - https://davidmegginson.github.io/ourairports-data/airports.csv
 *   - https://davidmegginson.github.io/ourairports-data/countries.csv
 */

const fs = require("fs");
const path = require("path");

const AIRPORTS_URL =
  "https://davidmegginson.github.io/ourairports-data/airports.csv";
const COUNTRIES_URL =
  "https://davidmegginson.github.io/ourairports-data/countries.csv";

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
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

async function main() {
  console.log("Fetching countries...");
  const countriesResp = await fetch(COUNTRIES_URL);
  const countriesText = await countriesResp.text();
  const countriesRows = parseCSV(countriesText);

  const countryMap = {};
  for (const row of countriesRows) {
    if (row.code && row.name) {
      countryMap[row.code] = row.name;
    }
  }
  console.log(`Loaded ${Object.keys(countryMap).length} countries`);

  console.log("Fetching airports...");
  const airportsResp = await fetch(AIRPORTS_URL);
  const airportsText = await airportsResp.text();
  const airportsRows = parseCSV(airportsText);
  console.log(`Parsed ${airportsRows.length} airport rows`);

  const airports = {};
  const validTypes = new Set(["large_airport", "medium_airport"]);

  for (const row of airportsRows) {
    const iata = (row.iata_code || "").trim();
    const type = (row.type || "").trim();

    if (!iata || iata.length !== 3 || !validTypes.has(type)) continue;
    if (!/^[A-Z]{3}$/.test(iata)) continue;

    const countryCode = (row.iso_country || "").trim();
    const countryName = countryMap[countryCode] || countryCode;
    const city = (row.municipality || "").trim();
    const name = (row.name || "").trim();

    airports[iata] = { name, city, country: countryName };
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
    `Written ${Object.keys(sorted).length} airports to ${outPath}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
