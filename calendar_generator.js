const fs = require('fs'); // Import file system module
const { getDateFromWeek, toFileSafeName, writeFileSync, getEndDateForDate } = require('./utils'); // Import utility functions

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
const compareIgnorePrefixes = ['DTSTAMP', 'LAST-MODIFIED', 'SEQUENCE'];

function getLineValue(block, prefix) {
  const match = block.match(new RegExp(`^${prefix}:(.*)$`, 'm'));
  return match ? match[1].trim() : null;
}

function normalizeEventBlock(block) {
  const lines = block.replace(/\r\n/g, '\n').split('\n').filter(Boolean);
  const filtered = lines.filter((line) => {
    return !compareIgnorePrefixes.some((prefix) => line.startsWith(`${prefix}:`));
  });
  return filtered.join('\n');
}

function parseExistingEvents(filePath) {
  if (!fs.existsSync(filePath)) {
    return new Map();
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const blocks = content.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT(?:\r?\n|$)/g) || [];
  const events = new Map();

  blocks.forEach((block) => {
    const uid = getLineValue(block, 'UID');
    if (!uid) {
      return;
    }

    events.set(uid, {
      dtstamp: getLineValue(block, 'DTSTAMP'),
      lastModified: getLineValue(block, 'LAST-MODIFIED'),
      sequence: getLineValue(block, 'SEQUENCE'),
      normalized: normalizeEventBlock(block)
    });
  });

  return events;
}

function upsertLine(lines, prefix, value, insertBefore) {
  const line = `${prefix}:${value}`;
  const index = lines.findIndex((l) => l.startsWith(`${prefix}:`));
  if (index !== -1) {
    lines[index] = line;
    return lines;
  }

  const insertIndex = lines.findIndex((l) => l === insertBefore);
  if (insertIndex === -1) {
    lines.splice(lines.length - 1, 0, line);
  } else {
    lines.splice(insertIndex, 0, line);
  }

  return lines;
}

function applyEventTimestamps(event, dtstamp, lastModified, sequence) {
  const lines = event.split(lineEnding).filter((line) => line.length > 0);
  upsertLine(lines, 'DTSTAMP', dtstamp, 'END:VEVENT');

  if (lastModified === null) {
    const filtered = lines.filter((line) => !line.startsWith('LAST-MODIFIED:'));
    lines.length = 0;
    lines.push(...filtered);
  } else if (lastModified) {
    upsertLine(lines, 'LAST-MODIFIED', lastModified, 'END:VEVENT');
  }

  if (sequence !== null && sequence !== undefined) {
    upsertLine(lines, 'SEQUENCE', sequence, 'END:VEVENT');
  }

  return lines.join(lineEnding) + lineEnding;
}

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
      const duration = "P1D"; // Duration of 1 day
      const end = getEndDateForDate(start, duration);
  
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
      `DTEND;VALUE=DATE:${end}${lineEnding}` +
      `STATUS:CONFIRMED${lineEnding}` +
      `TRANSP:TRANSPARENT${lineEnding}` + // Add this line to mark the event as "available"
      `X-MICROSOFT-CDO-BUSYSTATUS:FREE${lineEnding}` +
      `CLASS:PUBLIC${lineEnding}` +
      `DURATION:P1DT${lineEnding}` +
      `DESCRIPTION:${description}${lineEnding}` +
      `LAST-MODIFIED:${dtstamp}${lineEnding}` +
      `END:VEVENT${lineEnding}`;
      
      return event;
    });
  } 

function getCalendarHeader(calendarName, calendarDescription) {
  // Add lines at the top of the calendar
  const header =
    `BEGIN:VCALENDAR${lineEnding}` +
    `VERSION:2.0${lineEnding}` +
    `CALSCALE:GREGORIAN${lineEnding}` +
    `X-WR-CALNAME:${calendarName}${lineEnding}` +
    `X-WR-CALDESC:${calendarDescription}${lineEnding}` +
    `X-WR-TIMEZONE:UTC${lineEnding}` +	
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
function generateCalendar(filePath, events, calendarName, calendarDescription) {
  const header = getCalendarHeader(calendarName, calendarDescription); // Add lines at the top of the calendar
  const existingEvents = parseExistingEvents(filePath);
  const updatedEvents = events.map((event) => {
    const uid = getLineValue(event, 'UID');
    if (!uid) {
      return event;
    }

    const normalized = normalizeEventBlock(event);
    const existing = existingEvents.get(uid);

    if (existing && existing.normalized === normalized) {
      const eventDtstamp = getLineValue(event, 'DTSTAMP');
      const preservedDtstamp = existing.dtstamp || eventDtstamp;
      const preservedLastModified = existing.lastModified || preservedDtstamp;
      return applyEventTimestamps(event, preservedDtstamp, preservedLastModified, existing.sequence);
    }

    const newDtstamp = getLineValue(event, 'DTSTAMP');
    return applyEventTimestamps(event, newDtstamp, newDtstamp);
  });
  const eventsResponse = updatedEvents.join(lineEnding);  

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
