const fs = require('fs'); // Import file system module
const { setISOWeek, setISODay, addDays } = require('date-fns'); // Import date-fns functions for date manipulation

/**
 * Pads a number with leading zeros to ensure it is at least two digits.
 *
 * @param {any} n The number to pad.
 * @returns A zero-padded string representation of the number.
 */
const formatToTwoDigits = (n) => n.toString().padStart(2, '0');

/**
 * Calculates the date from a given ISO week number and day offset.
 *
 * @param {any} year The year of the date.
 * @param {any} weekNumber The ISO week number.
 * @param {any} baseDay The ISO weekday number (1 = Monday, 7 = Sunday).
 * @param {any} pickupDayDiff The offset in days from the base day.
 * @returns A string representing the date in YYYYMMDD format.
 */
function getDateFromWeek(year, weekNumber, baseDay, pickupDayDiff = 0) {
  const baseDate = setISODay(setISOWeek(new Date(year, 0, 4), weekNumber), baseDay);
  const pickupDate = addDays(baseDate, pickupDayDiff);

  // Format the date as YYYYMMDD
  const yearStr = pickupDate.getFullYear();
  const monthStr = (pickupDate.getMonth() + 1).toString().padStart(2, '0');
  const dayStr = pickupDate.getDate().toString().padStart(2, '0');

  return `${yearStr}${monthStr}${dayStr}`;
}

/**
 * Converts a street name to a file-safe string.
 *
 * @param {any} name The street name to convert.
 * @returns A file-safe string representation of the street name.
 */
function toFileSafeName(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/[^a-zA-Z0-9-_]/g, '') // Remove invalid characters
    .toLowerCase();
}

/**
 * Ensures that a folder exists, creating it if necessary.
 *
 * @param {any} folderPath The path of the folder to ensure exists.
 */
function ensureFolderExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

/**
 * Reads a JSONC file and parses it to an object.
 *
 * @param {any} filePath Path to the JSONC file.
 * @returns Parsed object or null on error.
 */
function readJsoncFile(filePath) {
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    // Strip simple JSONC comments before parsing.
    const withoutComments = text
      .replace(/\/\/.*$/gm, '')           // line comments
      .replace(/\/\*[\s\S]*?\*\//g, '');  // block comments

    return JSON.parse(withoutComments);
    // return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`❌ Error reading or parsing ${filePath}:`, err.message);
    return null;
  }
}

/**
 * Reads a JSON file and parses it to an object.
 *
 * @param {any} filePath Path to the JSON file.
 * @returns Parsed object or null on error.
 */
function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`❌ Error reading or parsing ${filePath}:`, err.message);
    return null;
  }
}

/**
 * Writes a string to a file, returning success state.
 *
 * @param {any} filePath Path to write to.
 * @param {any} data Content to write.
 * @param {any} encoding Text encoding (default: utf8).
 * @returns True on success, false on error.
 */
function writeFileSync(filePath, data, encoding = 'utf8') {
  try {
    // Shared write helper to keep logging consistent.
    fs.writeFileSync(filePath, data, encoding);
    return true;
  } catch (err) {
    console.error(`❌ Error writing file ${filePath}:`, err.message);
    return false;
  }
}

/**
 * Calculates the end date based on a start date and duration.
 *
 * @param {any} startDate The start date in YYYYMMDD format.
 * @param {any} duration The duration in ISO 8601 format (e.g., "P1D").
 * @returns A string representing the end date in YYYYMMDD format.
 */
function getEndDateForDate(startDate, duration) {
  // Parse the start date
  const year = parseInt(startDate.slice(0, 4), 10);
  const month = parseInt(startDate.slice(4, 6), 10) - 1; // Months are 0-indexed in JavaScript
  const day = parseInt(startDate.slice(6, 8), 10);

  const start = new Date(year, month, day);

  // Extract the number of days from the duration (e.g., "P1D" -> 1 day)
  const daysToAdd = parseInt(duration.replace('P', '').replace('D', ''), 10);

  // Calculate the end date
  const endDate = addDays(start, daysToAdd);

  // Format the end date as YYYYMMDD
  const yearStr = endDate.getFullYear();
  const monthStr = (endDate.getMonth() + 1).toString().padStart(2, '0');
  const dayStr = endDate.getDate().toString().padStart(2, '0');

  return `${yearStr}${monthStr}${dayStr}`;
}


module.exports = {
  getDateFromWeek,
  ensureFolderExists,
  toFileSafeName,
  readJsonFile,
  readJsoncFile,
  writeFileSync,
  formatToTwoDigits,
  getEndDateForDate
};

