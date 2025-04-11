const path = require('path'); // Import path module for file path manipulation
const { ensureFolderExists, toFileSafeName, readJsonFile } = require('./utils'); // Import utility functions
const { createEventsForStreet, generateCalendar } = require('./calendar_generator'); // Import calendar generation functions

/// <summary>
/// Creates a map of types to metadata (icon, description).
/// </summary>
/// <param name="types">An array of type objects.</param>
/// <returns>A map of types to metadata.</returns>
function createTypeMap(types) {
  return types.reduce((acc, t) => {
    acc[t.type] = { icon: t.icon, description: t.description };
    return acc;
  }, {});
}

/// <summary>
/// Generates a file path for a street's calendar file.
/// </summary>
/// <param name="area">The area identifier.</param>
/// <param name="street">The name of the street.</param>
/// <returns>The file path for the street's calendar file.</returns>
function getStreetFilePath(area, street, calendarPath) {
  const safeStreet = toFileSafeName(street); // Convert street name to a file-safe string
  return path.join(calendarPath, `area_${String(area)}`, `area_${String(area)}_${safeStreet}.ics`); // Ensure area is a string
}


/// <summary>
/// Processes a single area file to generate calendars for its streets.
/// </summary>
/// <param name="file">The name of the area file to process.</param>
/// <param name="areasFolder">The folder containing area files.</param>
/// <param name="calendarPath">The path to the calendar folder.</param>
function generateCalendarsForAreaFile(file, areasFolder, calendarPath, currentDate) {
  const fullPath = path.join(areasFolder, String(file)); // Ensure file is a string
  let data;

  try {
    //data = JSON.parse(fs.readFileSync(fullPath, 'utf8')); // Read and parse the JSON file
    data = readJsonFile(fullPath); // Use the readJsonFile function to read and parse the JSON file
  } catch (err) {
    console.error(`❌ Error reading or parsing ${file}:`, err.message);
    return;
  }

  const { area, year, week, types, streetPickup, calendarTitle } = data;
  const typeMap = createTypeMap(types); // Create a map of types

  // Ensure the folder for the area exists
  const areaFolder = path.join(calendarPath, `area_${area}`);
  ensureFolderExists(areaFolder);

  // Generate one calendar per street
  streetPickup.forEach(({ street, pickupDay }) => {
    const events = createEventsForStreet(area, street, year, week, typeMap, pickupDay);
    const filePath = getStreetFilePath(area, street, calendarPath);
    const fullTitle = `${calendarTitle} – ${street}`;
    generateCalendar(filePath, events, fullTitle, currentDate);
  });
}

module.exports = {
  generateCalendarsForAreaFile
};