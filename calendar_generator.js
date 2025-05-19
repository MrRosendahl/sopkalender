const { getDateFromWeek, toFileSafeName, writeFileSync } = require('./utils'); // Import utility functions

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

const lineEnding = '\r\n'; // Use CRLF for iCalendar format
const descLineEnding = '\\n';

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
function createEventsForStreet(area, street, year, weeks, typeMap, pickupDayName, dtstamp) {
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
      // Replace linebreakes in the description with escaped line endings
      const summaryDescription = (typeMeta.description || '').replace(/\r?\n/g, descLineEnding);
      const description = (week.description || '').replace(/\r?\n/g, descLineEnding);

      const event =
      `BEGIN:VEVENT${lineEnding}` +
      `UID:${uid}${lineEnding}` +
      `SUMMARY:${typeMeta.icon} ${summaryDescription}${lineEnding}` +      
      `DTSTAMP:${dtstamp}${lineEnding}` +
      `DTSTART;VALUE=DATE:${start}${lineEnding}` +
      `DTEND;VALUE=DATE:${start}${lineEnding}` +
      `STATUS:CONFIRMED${lineEnding}` +
      `TRANSP:TRANSPARENT${lineEnding}` + // Add this line to mark the event as "available"
      `X-MICROSOFT-CDO-BUSYSTATUS:FREE${lineEnding}` +
      `DURATION:P1DT${lineEnding}` +
      `DESCRIPTION:${description}${lineEnding}` +
      `END:VEVENT${lineEnding}`;
      
      return event;
    });
  } 

function getCalendarHeader(calendarName) {
  // Add lines at the top of the calendar
  const header =
    `BEGIN:VCALENDAR${lineEnding}` +
    `VERSION:2.0${lineEnding}` +
    `CALSCALE:GREGORIAN${lineEnding}` +
    `X-WR-CALNAME:${calendarName}${lineEnding}` +
    `PRODID:adamgibbons/ics${lineEnding}` +
    `METHOD:PUBLISH${lineEnding}` +
    `X-PUBLISHED-TTL:PT1H${lineEnding}`;
  return header;
}

/// <summary>
/// Writes an ICS file to disk based on the provided events and calendar name.
/// </summary>
/// <param name="filePath">The file path to write the ICS file to.</param>
/// <param name="events">An array of ICS event objects.</param>
/// <param name="calendarName">The name of the calendar.</param>
/// <param name="currentDate">The current Date.</param>
function generateCalendar(filePath, events, calendarName) {
  const header = getCalendarHeader(calendarName); // Add lines at the top of the calendar
  const eventsResponse = events.join(lineEnding);  

  // Inject X-WR-CALNAME just after CALSCALE
  let output = eventsResponse.replace(
    'CALSCALE:GREGORIAN',
    `CALSCALE:GREGORIAN\nX-WR-CALNAME:${calendarName}`
  );    

  output = header + output;

  // Write the ICS file to disk
  writeFileSync(filePath, output, 'utf8');
  console.log(`✅ Successfully generated calendar "${calendarName}" at ${filePath}`);
}

module.exports = {
  generateCalendar,
  createEventsForStreet,
};