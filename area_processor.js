const path = require('path'); // Import path module for file path manipulation
const { ensureFolderExists, toFileSafeName, readJsoncFile } = require('./utils'); // Import utility functions
const { createEventsForStreet, generateCalendar } = require('./calendar_generator'); // Import calendar generation functions

/**
 * Creates a map of types to metadata (icon, description).
 *
 * @param {any} types An array of type objects.
 * @returns A map of types to metadata.
 */
function createTypeMap(types) {
  return types.reduce((acc, t) => {
    acc[t.type] = { icon: t.icon, description: t.description };
    return acc;
  }, {});
}

/**
 * Generates a file path for a street's calendar file.
 *
 * @param {any} area The area identifier.
 * @param {any} street The name of the street.
 * @returns The file path for the street's calendar file.
 */
function getStreetFilePath(area, street, calendarPath) {
  const safeStreet = toFileSafeName(street); // Convert street name to a file-safe string
  return path.join(calendarPath, `area_${String(area)}`, `area_${String(area)}_${safeStreet}.ics`); // Ensure area is a string
}

/**
 * Processes a single area config object to generate calendars for its streets.
 *
 * @param {any} data The parsed area config object.
 * @param {any} calendarPath The path to the calendar folder.
 * @param {any} sourceLabel Optional label for logging.
 */
function generateCalendarsForAreaConfig(data, calendarPath, dtstamp, sourceLabel = 'area config') {
  if (!data) {
    console.error(`? No data provided for ${sourceLabel}`);
    return;
  }

  const { area, years, types, streetPickup, calendarTitle } = data;
  const typeMap = createTypeMap(types); // Create a map of types

  if (!Array.isArray(years) || years.length === 0) {
    console.error(`? No years data found in ${sourceLabel} (area ${area})`);
    return;
  }

  // Ensure the folder for the area exists
  const areaFolder = path.join(calendarPath, `area_${area}`);
  ensureFolderExists(areaFolder);

  // Generate one calendar per street, containing events from all years
  streetPickup.forEach(({ street, pickupDay }) => {
    let events = [];

    years.forEach(({ year, weeks }) => {
      if (!year || !Array.isArray(weeks)) {
        console.warn(`? Invalid year entry in ${sourceLabel} (area ${area}) - skipping`);
        return;
      }
      // Merge per-year events into a single street calendar.
      events = events.concat(
        createEventsForStreet(area, street, year, weeks, typeMap, pickupDay, dtstamp)
      );
    });

    const filePath = getStreetFilePath(area, street, calendarPath);
    const fullTitle = `${calendarTitle} - ${street}`;
    generateCalendar(filePath, events, fullTitle, dtstamp);
  });

}

/**
 * Reads an area JSONC file and generates calendars for its streets.
 *
 * @param {any} file The area filename to process (e.g., "area_29.jsonc").
 * @param {any} areasFolder The folder containing area JSONC files.
 * @param {any} calendarPath The path to the calendars output folder.
 * @param {any} dtstamp UTC timestamp string for the run (e.g., "20250102T135959Z").
 */
function generateCalendarsForAreaFile(file, areasFolder, calendarPath, dtstamp) {
  const fullPath = path.join(areasFolder, String(file)); // Ensure file is a string
  let data;

  try {
    data = readJsoncFile(fullPath); // Use the readJsoncFile function to read and parse the JSON file
  } catch (err) {
    console.error(`? Error reading or parsing ${file}:`, err.message);
    return;
  }

  generateCalendarsForAreaConfig(data, calendarPath, dtstamp, fullPath);
}

module.exports = {
  generateCalendarsForAreaFile,
  generateCalendarsForAreaConfig
};

