// area_generator.js
// ---------------------------------------------------------------------------
// Purpose
//   - Read a JSON/JSONC config file describing an area and its waste schedule.
//   - For each year, look at "typeFrequency" and generate "weeks" entries:
//       { weekNumber: number, type: string }.
//   - For each type within typeFrequency, one of these modes is supported:
//
//       1) Automatic:
//          "PM": {
//            "automatic": { "everyNWeeks": 2, "startWeek": 31 }
//          }
//
//       2) Manual (irregular schedules):
//          "PR": {
//            "manual": [31, 33, 37, 39, 40]
//          }
//
//       If both 'automatic' and 'manual' are present for a type:
//         - 'manual' is used
//         - 'automatic' is removed from the output (so the file stays clean).
//
//   - Default behavior: output JSONC with comments that group weeks by month.
//   - Optional: "--without-month-comments" → output pure JSON (no comments).
//
// Usage examples (Windows 11, PowerShell):
//
//   # JSONC with month comments (default, printed to console):
//   node .\areas\area_generator.js .\areas\area_29.jsonc
//
//   # JSONC with comments - file:
//   node .\areas\area_generator.js .\areas\area_29.jsonc .\areas\_generated\area_29.jsonc
//
//   # Pure JSON (no comments):
//   node .\areas\area_generator.js .\areas\area_29.jsonc .\areas\_generated\area_29.json --without-month-comments
//
// ---------------------------------------------------------------------------

const fs = require("fs");
const path = require("path");

// ===========================================================================
// JSONC-helpers
// ===========================================================================

/**
 * Strips simple JSONC style comments from a string.
 *
 * Supported:
 *   // line comments
 *   /* block comments *\/
 *
 * NOTE:
 *   This is a simple stripper. Comment markers inside string values
 *   can break things, so avoid that in your config.
 *
 * @param {string} jsonc
 * @returns {string}
 */
function stripJsonComments(jsonc) {
  let withoutLineComments = jsonc.replace(/\/\/.*$/gm, "");
  let withoutBlockComments = withoutLineComments.replace(/\/\*[\s\S]*?\*\//g, "");
  return withoutBlockComments;
}

/**
 * Loads and parses a JSON/JSONC config file from disk.
 *
 * @param {string} inputPath
 * @returns {any|null}
 */
function loadConfigFromFile(inputPath) {
  if (!inputPath) {
    console.error("No input path provided.");
    return null;
  }

  const absoluteInput = path.resolve(process.cwd(), inputPath);

  if (!fs.existsSync(absoluteInput)) {
    console.error("Input file does not exist:", absoluteInput);
    return null;
  }

  const raw = fs.readFileSync(absoluteInput, "utf8");
  const jsonWithoutComments = stripJsonComments(raw);

  try {
    return JSON.parse(jsonWithoutComments);
  } catch (err) {
    console.error("Failed to parse JSON/JSONC from input file:", err.message);
    return null;
  }
}

// ===========================================================================
// ISO week helpers
// ===========================================================================

/**
 * Return ISO week number for a given Date.
 *
 * ISO 8601:
 *   - Week 1 is the week with the year's first Thursday.
 *   - Week starts on Monday.
 *
 * @param {Date} date
 * @returns {number} ISO week number (1–52/53)
 */
function getISOWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; // 1 (Mon) - 7 (Sun)
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); // move to Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const diff = d - yearStart;
  const oneDayMs = 24 * 60 * 60 * 1000;
  return Math.ceil((diff / oneDayMs + 1) / 7);
}

/**
 * Number of ISO weeks in a given year (52 or 53).
 *
 * @param {number} year
 * @returns {number}
 */
function getISOWeeksInYear(year) {
  // 28 December is always in the last ISO week
  const dec28 = new Date(Date.UTC(year, 11, 28));
  return getISOWeek(dec28);
}

/**
 * Get Date (Monday) for a given ISO week in a given year.
 * Used to determine the "representative" month of that week.
 *
 * @param {number} week ISO week (1–52/53)
 * @param {number} year
 * @returns {Date}
 */
function getDateOfISOWeek(week, year) {
  // 4 January is always in week 1
  const simple = new Date(Date.UTC(year, 0, 4));
  const dayOfWeek = simple.getUTCDay() || 7; // 1–7
  const mondayWeek1 = new Date(simple);
  mondayWeek1.setUTCDate(simple.getUTCDate() - (dayOfWeek - 1));

  const target = new Date(mondayWeek1);
  target.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7);
  return target;
}

/**
 * Get Swedish month name (e.g. "Augusti") for a given year + ISO week.
 *
 * @param {number} week
 * @param {number} year
 * @param {string} [locale="sv-SE"]
 * @returns {string}
 */
function getMonthNameForWeek(week, year, locale = "sv-SE") {
  const date = getDateOfISOWeek(week, year);

  const formatter = new Intl.DateTimeFormat(locale, {
    month: "long",
    timeZone: "UTC"
  });

  const monthName = formatter.format(date); // e.g. "augusti"
  return monthName.charAt(0).toUpperCase() + monthName.slice(1);
}

// ===========================================================================
// Week generation (automatic + manual)
// ===========================================================================

/**
 * Generate weeks for a given year based on typeFrequency.
 *
 * typeFrequency example:
 * {
 *   "PM": {
 *     "automatic": {
 *       "everyNWeeks": 2,
 *       "startWeek": 31
 *     }
 *   },
 *   "PR": {
 *     "manual": [31, 33, 37, 39, 40]
 *   }
 * }
 *
 * Semantics:
 *   - automatic:
 *       everyNWeeks = step in week numbers.
 *         everyNWeeks = 1 -> every week   (1,2,3,4,...)
 *         everyNWeeks = 2 -> every other (1,3,5,7,...)
 *         everyNWeeks = 4 -> every 4th   (1,5,9,13,...)
 *
 *   - manual:
 *       explicit list of week numbers for that type in that year.
 *
 * NOTE:
 *   We assume any “both automatic+manual” conflict has been resolved already
 *   (by populateWeeksInConfig), so here we just pick based on what's present.
 *
 * @param {number} year
 * @param {Record<string, {automatic?: {everyNWeeks: number, startWeek: number}, manual?: number[]}>} typeFrequency
 * @returns {{weekNumber: number, type: string}[]}
 */
function generateWeeksForYear(year, typeFrequency) {
  const maxWeeks = getISOWeeksInYear(year);
  /** @type {{weekNumber: number, type: string}[]} */
  const weeks = [];

  if (!typeFrequency || typeof typeFrequency !== "object") {
    return weeks;
  }

  for (const [typeName, cfg] of Object.entries(typeFrequency)) {
    if (!cfg || typeof cfg !== "object") continue;

    const hasAutomatic = cfg.automatic && typeof cfg.automatic === "object";
    const hasManual = Array.isArray(cfg.manual);

    // -----------------------------------------------------------------------
    // 1) Manual mode (explicit week numbers)
    // -----------------------------------------------------------------------
    if (hasManual) {
      const seenWeeks = new Set();

      for (const rawWeek of cfg.manual) {
        const w = Number(rawWeek);

        if (!Number.isInteger(w)) {
          console.warn(
            `Year ${year}, type "${typeName}": skipping manual week "${rawWeek}" (not an integer).`
          );
          continue;
        }

        if (w < 1 || w > maxWeeks) {
          console.warn(
            `Year ${year}, type "${typeName}": skipping manual week ${w} (out of range, 1..${maxWeeks}).`
          );
          continue;
        }

        if (seenWeeks.has(w)) {
          // Avoid duplicates for the same type+week
          continue;
        }
        seenWeeks.add(w);

        weeks.push({
          weekNumber: w,
          type: typeName
        });
      }

      // done with this type
      continue;
    }

    // -----------------------------------------------------------------------
    // 2) Automatic mode (startWeek + everyNWeeks pattern)
    // -----------------------------------------------------------------------
    if (hasAutomatic) {
      const everyNWeeks = Number(cfg.automatic.everyNWeeks);
      const startWeek = Number(cfg.automatic.startWeek);

      if (!Number.isInteger(everyNWeeks) || everyNWeeks <= 0) {
        console.warn(
          `Year ${year}, type "${typeName}": invalid automatic.everyNWeeks:`,
          cfg.automatic.everyNWeeks
        );
        continue;
      }

      if (!Number.isInteger(startWeek) || startWeek < 1 || startWeek > maxWeeks) {
        console.warn(
          `Year ${year}, type "${typeName}": invalid automatic.startWeek:`,
          cfg.automatic.startWeek,
          `(year ${year} has ${maxWeeks} weeks)`
        );
        continue;
      }

      for (let w = startWeek; w <= maxWeeks; w += everyNWeeks) {
        weeks.push({
          weekNumber: w,
          type: typeName
        });
      }

      continue;
    }

    // -----------------------------------------------------------------------
    // 3) Neither manual nor automatic → nothing to do
    // -----------------------------------------------------------------------
    console.warn(
      `Year ${year}, type "${typeName}" has neither 'manual' nor 'automatic' defined. Skipped.`
    );
  }

  // Sort weeks by weekNumber then type name
  weeks.sort((a, b) => {
    if (a.weekNumber !== b.weekNumber) {
      return a.weekNumber - b.weekNumber;
    }
    return a.type.localeCompare(b.type, "sv-SE");
  });

  return weeks;
}

// ===========================================================================
// Weeks → JSONC formatting
// ===========================================================================

/**
 * Writes the weeks array as JSONC with optional month comments into 'lines'.
 *
 * Example (with comments):
 *
 * "weeks": [
 *   // Augusti
 *   { "weekNumber": 31, "type": "PM" },
 *
 *   // September
 *   { "weekNumber": 35, "type": "PM" }
 * ]
 *
 * @param {string[]} lines   - Target array of lines
 * @param {number} year      - Year (for month lookup)
 * @param {{weekNumber: number, type: string}[]} weeks
 * @param {string} indent    - Indentation inside the weeks array
 * @param {boolean} withMonthComments - true = group by month
 */
function writeWeeksArrayJsonc(lines, year, weeks, indent, withMonthComments) {
  let currentMonth = null;

  for (let i = 0; i < weeks.length; i++) {
    const item = weeks[i];
    const monthName = withMonthComments
      ? getMonthNameForWeek(item.weekNumber, year)
      : null;

    if (withMonthComments && monthName !== currentMonth) {
      if (lines.length > 0) {
        lines.push("");
      }
      lines.push(`${indent}// ${monthName}`);
      currentMonth = monthName;
    }

    const trailingComma = i === weeks.length - 1 ? "" : ",";
    lines.push(
      `${indent}{ "weekNumber": ${item.weekNumber}, "type": ${JSON.stringify(
        item.type
      )} }${trailingComma}`
    );
  }
}

// ===========================================================================
// Config manipulation
// ===========================================================================

function formatInlineValue(value) {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (value && typeof value === "object") {
    return formatInlineObject(value);
  }

  return JSON.stringify(value);
}

function formatInlineObject(obj) {
  const entries = Object.entries(obj).map(
    ([key, val]) => `"${key}": ${formatInlineValue(val)}`
  );
  return `{ ${entries.join(", ")} }`;
}

/**
 * Resolves "automatic vs manual" conflicts in a typeFrequency object:
 *   - If both are present → manual wins, automatic is removed.
 *
 * This keeps the output config clean and unambiguous.
 *
 * @param {number} year
 * @param {Record<string, any>} typeFrequency
 */
function normalizeTypeFrequencyForYear(year, typeFrequency) {
  if (!typeFrequency || typeof typeFrequency !== "object") return;

  for (const [typeName, cfg] of Object.entries(typeFrequency)) {
    if (!cfg || typeof cfg !== "object") continue;

    const hasAutomatic = cfg.automatic && typeof cfg.automatic === "object";
    const hasManual = Array.isArray(cfg.manual);

    if (hasAutomatic && hasManual) {
      console.warn(
        `Year ${year}, type "${typeName}" has both 'automatic' and 'manual'. ` +
          `Using 'manual' and removing 'automatic' from output.`
      );
      delete cfg.automatic;
    }
  }
}

/**
 * Populates years[].weeks based on years[].typeFrequency.
 * Also normalizes typeFrequency to remove unused mode when both are present.
 *
 * @param {any} config
 * @returns {any} same config object (mutated)
 */
function populateWeeksInConfig(config) {
  if (!config || !Array.isArray(config.years)) {
    console.warn('Config has no "years" array, nothing to do.');
    return config;
  }

  for (const yearEntry of config.years) {
    if (!yearEntry || typeof yearEntry !== "object") continue;

    const year = Number(yearEntry.year);
    if (!Number.isInteger(year)) {
      console.warn("Skipping a year entry without valid 'year':", yearEntry);
      continue;
    }

    const typeFrequency = yearEntry.typeFrequency || {};

    // Normalize: if both automatic & manual present, keep manual only
    normalizeTypeFrequencyForYear(year, typeFrequency);

    const generatedWeeks = generateWeeksForYear(year, typeFrequency);

    yearEntry.weeks = generatedWeeks;
  }

  return config;
}

// ===========================================================================
// JSONC writer (full file)
// ===========================================================================

/**
 * Writes "typeFrequency" as JSONC, making sure that:
 *   - "manual" arrays stay on a single line (e.g. "manual": [31, 33, 37])
 *   - everything else (automatic, nested objects) is pretty-printed.
 *
 * @param {string[]} lines
 * @param {Record<string, any>} typeFrequency
 */
function writeTypeFrequencyJsonc(lines, typeFrequency) {
  lines.push('      "typeFrequency": {');

  const typeNames = Object.keys(typeFrequency);
  typeNames.forEach((typeName, typeIndex) => {
    const cfg = typeFrequency[typeName] || {};
    const isLastType = typeIndex === typeNames.length - 1;

    lines.push(
      `        "${typeName}": ${formatInlineValue(cfg)}${isLastType ? "" : ","}`
    );
  });

  lines.push("      },");
}

/**
 * Builds a JSONC string for the entire config object.
 *
 * We keep a fairly strict order:
 *   - area
 *   - calendarTitle
 *   - streetPickup
 *   - types
 *   - years (with weeks formatted + optional month comments)
 *
 * @param {any} config
 * @param {boolean} withMonthComments
 * @returns {string}
 */
function buildJsoncOutput(config, withMonthComments) {
  const lines = [];
  lines.push("{");

  const hasArea = Object.prototype.hasOwnProperty.call(config, "area");
  const hasCalendarTitle = Object.prototype.hasOwnProperty.call(config, "calendarTitle");
  const hasStreetPickup = Array.isArray(config.streetPickup);
  const hasTypes = Array.isArray(config.types);
  const hasYears = Array.isArray(config.years);

  // area
  if (hasArea) {
    lines.push(`  "area": ${JSON.stringify(config.area)},`);
  }

  // calendarTitle
  if (hasCalendarTitle) {
    lines.push(`  "calendarTitle": ${JSON.stringify(config.calendarTitle)},`);
  }

  // streetPickup
  if (hasStreetPickup) {
    lines.push(`  "streetPickup": [`);
    config.streetPickup.forEach((sp, index) => {
      const trailingComma = index === config.streetPickup.length - 1 ? "" : ",";
      lines.push(`    ${formatInlineValue(sp)}${trailingComma}`);
    });
    lines.push("  ],");
  }

  // types
  if (hasTypes) {
    lines.push(`  "types": [`);
    config.types.forEach((t, index) => {
      const trailingComma = index === config.types.length - 1 ? "" : ",";
      lines.push(`    ${formatInlineValue(t)}${trailingComma}`);
    });
    lines.push("  ],");
  }

  // years
  if (hasYears) {
    lines.push(`  "years": [`);
    config.years.forEach((yearEntry, idx) => {
      const isLastYear = idx === config.years.length - 1;
      const year = Number(yearEntry.year);
      const typeFrequency = yearEntry.typeFrequency || {};
      const weeks = Array.isArray(yearEntry.weeks) ? yearEntry.weeks : [];

      lines.push("    {");
      // year
      lines.push(`      "year": ${year},`);

      // typeFrequency (with one-line manual arrays)
      writeTypeFrequencyJsonc(lines, typeFrequency);

      // weeks (JSONC array with optional month comments)
      lines.push(`      "weeks": [`);
      if (weeks.length > 0) {
        const tmpLines = [];
        writeWeeksArrayJsonc(tmpLines, year, weeks, "        ", withMonthComments);
        tmpLines.forEach((l) => lines.push(l));
      }
      lines.push("      ]");

      lines.push(`    }${isLastYear ? "" : ","}`);
    });
    lines.push("  ]");
  }

  lines.push("}");
  return lines.join("\n");
}

// ===========================================================================
// CLI entry
// ===========================================================================

/**
 * Loads a config file, generates weeks, and returns updated config.
 *
 * @param {string} inputPath
 * @returns {any|null}
 */
function buildUpdatedConfigFromFile(inputPath) {
  const config = loadConfigFromFile(inputPath);
  if (!config) {
    return null;
  }

  return populateWeeksInConfig(config);
}

/**
 * Returns formatted output for an updated config.
 *
 * @param {any} updatedConfig
 * @param {boolean} withMonthComments
 * @returns {string}
 */
function getUpdatedConfigOutput(updatedConfig, withMonthComments) {
  if (withMonthComments) {
    return buildJsoncOutput(updatedConfig, true);
  }
  return JSON.stringify(updatedConfig, null, 2);
}

/**
 * Writes the updated config to disk and returns the absolute output path.
 *
 * @param {any} updatedConfig
 * @param {string} outputPath
 * @param {boolean} withMonthComments
 * @returns {string|null}
 */
function writeUpdatedConfigToFile(updatedConfig, outputPath, withMonthComments) {
  if (!outputPath) {
    return null;
  }

  const absoluteOutput = path.resolve(process.cwd(), outputPath);
  const output = getUpdatedConfigOutput(updatedConfig, withMonthComments);
  fs.writeFileSync(absoluteOutput, output, "utf8");
  return absoluteOutput;
}

/**
 * CLI:
 *   node area_generator.js <input.jsonc> [output.jsonc] [--without-month-comments]
 */
function main() {
  const args = process.argv.slice(2);

  const inputPath = args[0];
  const outputPath = args[1] && !args[1].startsWith("--") ? args[1] : null;
  const withoutMonthComments = args.includes("--without-month-comments");

  if (!inputPath) {
    console.error(
      "Usage: node area_generator.js <input.jsonc> [output.jsonc] [--without-month-comments]"
    );
    process.exit(1);
  }

  const updatedConfig = buildUpdatedConfigFromFile(inputPath);
  if (!updatedConfig) {
    process.exit(1);
  }

  const withMonthComments = !withoutMonthComments;
  const output = getUpdatedConfigOutput(updatedConfig, withMonthComments);

  if (outputPath) {
    const absoluteOutput = writeUpdatedConfigToFile(updatedConfig, outputPath, withMonthComments);
    console.log(
      `Written updated ${withMonthComments ? "JSONC" : "JSON"} to:`,
      absoluteOutput
    );
  } else {
    console.log(output);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

// Export some pieces for possible reuse or testing
module.exports = {
  stripJsonComments,
  loadConfigFromFile,
  getISOWeek,
  getISOWeeksInYear,
  getMonthNameForWeek,
  generateWeeksForYear,
  writeWeeksArrayJsonc,
  normalizeTypeFrequencyForYear,
  writeTypeFrequencyJsonc,
  populateWeeksInConfig,
  buildJsoncOutput,
  buildUpdatedConfigFromFile,
  getUpdatedConfigOutput,
  writeUpdatedConfigToFile
};


