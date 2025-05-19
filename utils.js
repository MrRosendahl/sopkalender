const fs = require('fs'); // Import file system module
const { setISOWeek, setISODay, addDays } = require('date-fns'); // Import date-fns functions for date manipulation

/// <summary>
/// Pads a number with leading zeros to ensure it is at least two digits.
/// </summary>
/// <param name="n">The number to pad.</param>
/// <returns>A zero-padded string representation of the number.</returns>
const formatToTwoDigits = (n) => n.toString().padStart(2, '0');

/// <summary>
/// Calculates the date from a given ISO week number and day offset.
/// </summary>
/// <param name="year">The year of the date.</param>
/// <param name="weekNumber">The ISO week number.</param>
/// <param name="baseDay">The ISO weekday number (1 = Monday, 7 = Sunday).</param>
/// <param name="pickupDayDiff">The offset in days from the base day.</param>
/// <returns>A string representing the date in YYYYMMDD format.</returns>
function getDateFromWeek(year, weekNumber, baseDay, pickupDayDiff = 0) {
  const baseDate = setISODay(setISOWeek(new Date(year, 0, 4), weekNumber), baseDay);
  const pickupDate = addDays(baseDate, pickupDayDiff);

  // Format the date as YYYYMMDD
  const yearStr = pickupDate.getFullYear();
  const monthStr = (pickupDate.getMonth() + 1).toString().padStart(2, '0');
  const dayStr = pickupDate.getDate().toString().padStart(2, '0');

  return `${yearStr}${monthStr}${dayStr}`;
}

/// <summary>
/// Converts a street name to a file-safe string.
/// </summary>
/// <param name="name">The street name to convert.</param>
/// <returns>A file-safe string representation of the street name.</returns>
function toFileSafeName(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/[^a-zA-Z0-9-_]/g, '') // Remove invalid characters
    .toLowerCase();
}

/// <summary>
/// Ensures that a folder exists, creating it if necessary.
/// </summary>
/// <param name="folderPath">The path of the folder to ensure exists.</param>
function ensureFolderExists(folderPath) {
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

function readJsonFile(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    console.error(`❌ Error reading or parsing ${filePath}:`, err.message);
    return null;
  }
}

function writeFileSync(filePath, data, encoding = 'utf8') {
  try {
    fs.writeFileSync(filePath, data, encoding);
    return true;
  } catch (err) {
    console.error(`❌ Error writing file ${filePath}:`, err.message);
    return false;
  }
}

/// <summary>
/// Calculates the end date based on a start date and duration.
/// </summary>
/// <param name="startDate">The start date in YYYYMMDD format.</param>
/// <param name="duration">The duration in ISO 8601 format (e.g., "P1D").</param>
/// <returns>A string representing the end date in YYYYMMDD format.</returns>
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
  writeFileSync,
  formatToTwoDigits,
  getEndDateForDate
};