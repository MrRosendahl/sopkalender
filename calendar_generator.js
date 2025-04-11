const { createEvents } = require('ics'); // Import library to create ICS files
const { getDateFromWeek, toFileSafeName, writeFileSync, formatToTwoDigits } = require('./utils'); // Import utility functions

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
        status: 'CONFIRMED', // Event status
      };
    });
  }

/// <summary>
/// Writes an ICS file to disk based on the provided events and calendar name.
/// </summary>
/// <param name="filePath">The file path to write the ICS file to.</param>
/// <param name="events">An array of ICS event objects.</param>
/// <param name="calendarName">The name of the calendar.</param>
function generateCalendar(filePath, events, calendarName) {
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

  // Replace all DTSTAMPs with consistent values to avoid unnecessary changes
  // This is done to ensure that the ICS file remains unchanged when re-generated unless the events change
  // We use the first event's start date for consistency
  output = output.replace(/DTSTAMP:[^\n]*/gi, () => {
    const firstEventStart = events[0].start; // Use the first event's start date for consistency
    return `DTSTAMP:${firstEventStart[0]}${formatToTwoDigits(firstEventStart[1])}${formatToTwoDigits(firstEventStart[2])}T000000Z`;
  });

  // Write the ICS file to disk
  writeFileSync(filePath, output, 'utf8');
  console.log(`✅ Successfully generated calendar "${calendarName}" at ${filePath}`);
}

module.exports = {
    generateCalendar,
    createEventsForStreet,
  };