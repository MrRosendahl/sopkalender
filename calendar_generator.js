const { createEvents } = require('ics'); // Import library to create ICS files
const { getDateFromWeek, toFileSafeName, writeFileSync, formatToTwoDigits } = require('./utils'); // Import utility functions
const crypto = require('crypto'); // Import crypto module for hashing

// Maps weekday names to ISO weekday numbers (Monday = 1, Sunday = 7)
const weekdayMap = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 7,
  };

/// <summary>
/// Creates ICS events based on a weekly schedule and pickup day.
/// </summary>
/// <param name="area">The area identifier.</param>
/// <param name="street">The name of the street.</param>
/// <param name="year">The year of the events.</param>
/// <param name="weeks">An array of week objects containing schedule information.</param>
/// <param name="typeMap">A map of types to metadata (icon, description).</param>
/// <param name="pickupDayName">The name of the pickup day (e.g., "Monday").</param>
/// <returns>An array of ICS event objects.</returns>
function createEventsForStreet(area, street, year, weeks, typeMap, pickupDayName) {
    const baseDay = weekdayMap[pickupDayName.toLowerCase()]; // Get ISO weekday number
  
    if (baseDay === undefined) {
      console.warn(`⚠ Unknown pickup day "${pickupDayName}" for street "${street}" in area "${area}" — skipping`);
      return [];
    }
  
    return weeks.flatMap((week) => {
      // Retrieve metadata for the current week's type from the typeMap
      const typeMeta = typeMap[week.type];
      if (!typeMeta) {
        // If the type is unknown, log a warning and skip this week
        console.warn(`⚠ Unknown type "${week.type}" for area "${area}" — skipping`);
        return []; // Return an empty array to be flattened
      }
  
      // Generate a unique identifier for the event
      const uid = `area${area}_${toFileSafeName(street)}_${year}_week${week.weekNumber}_${week.type}`;
      
      // Calculate the event's start date based on the year, week number, and pickup day
      const start = getDateFromWeek(year, week.weekNumber, baseDay, week.pickupDayDiff || 0);
  
      // Return an event object with all necessary details
      return {
        uid, // Unique identifier for the event
        title: `${typeMeta.icon} ${typeMeta.description}`, // Event title with icon and description
        description: week.description || '', // Optional description for the event
        start, // Start date of the event
        duration: { days: 1 }, // Duration of the event (1 day)
        status: 'CONFIRMED', // Event status,
        busyStatus: 'FREE', // Event busy status
      };
    });
  }

/**
 * Generates a deterministic DTSTAMP string based on the entire event content.
 * Ensures DTSTAMP only changes if the event data changes.
 * @param {Array} events - Array of event objects.
 * @returns {string} - Valid iCal UTC datetime string.
 */
function generateStableDTSTAMP(events) {
  const crypto = require('crypto');

  const content = JSON.stringify(events);
  const hash = crypto.createHash('md5').update(content).digest();
  
  // Get a signed integer between -7200 and +7200 seconds (±2 hours)
  const offsetInSeconds = (hash.readInt16BE(0) % 7200);

  const now = new Date();
  now.setUTCSeconds(now.getUTCSeconds() + offsetInSeconds);

  const pad = (n) => String(n).padStart(2, '0');
  const year = now.getUTCFullYear();
  const month = pad(now.getUTCMonth() + 1);
  const day = pad(now.getUTCDate());
  const hour = pad(now.getUTCHours());
  const minute = pad(now.getUTCMinutes());
  const second = pad(now.getUTCSeconds());

  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

/// <summary>
/// Writes an ICS file to disk based on the provided events and calendar name.
/// </summary>
/// <param name="filePath">The file path to write the ICS file to.</param>
/// <param name="events">An array of ICS event objects.</param>
/// <param name="calendarName">The name of the calendar.</param>
/// <param name="currentDate">The current Date.</param>
function generateCalendar(filePath, events, calendarName, currentDate) {
  const { error, value } = createEvents(events); // Generate ICS content
  if (error) {
    console.error(`❌ Error generating calendar "${calendarName}" at ${filePath}:`, error.message);
    return;
  }

  // Inject X-WR-CALNAME just after CALSCALE
  let output = value.replace(
    'CALSCALE:GREGORIAN',
    `CALSCALE:GREGORIAN\nX-WR-CALNAME:${calendarName}`
  );

  // Replace all DTSTAMPs the current time
  output = output.replace(/DTSTAMP:[^\n]*/gi, () => {
    const pad = (n) => String(n).padStart(2, '0');
    const year = currentDate.getUTCFullYear();
    const month = pad(currentDate.getUTCMonth() + 1);
    const day = pad(currentDate.getUTCDate());
    const hour = pad(currentDate.getUTCHours());
    const minute = pad(currentDate.getUTCMinutes());
    const second = pad(currentDate.getUTCSeconds());
  
    return `DTSTAMP:${year}${month}${day}T${hour}${minute}${second}Z`;
  });

  // Write the ICS file to disk
  writeFileSync(filePath, output, 'utf8');
  console.log(`✅ Successfully generated calendar "${calendarName}" at ${filePath}`);
}

module.exports = {
    generateCalendar,
    createEventsForStreet,
  };