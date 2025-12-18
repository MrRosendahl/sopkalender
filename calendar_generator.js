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
const compareIgnorePrefixes = ['DTSTAMP', 'LAST-MODIFIED', 'SEQUENCE']; // Fields ignored when checking for changes

/**
 * Extracts a single-line property value from a VEVENT block.
 *
 * @param {any} block The VEVENT text block.
 * @param {any} prefix The property name to read (e.g., "UID").
 * @returns The property value or null if missing.
 */
function getLineValue(block, prefix) {
  // Extract a single-line property value from a VEVENT block.
  const match = block.match(new RegExp(`^${prefix}:(.*)$`, 'm'));
  return match ? match[1].trim() : null;
}

/**
 * Normalizes a VEVENT block for change detection by removing volatile fields.
 *
 * @param {any} block The VEVENT text block.
 * @returns A normalized string representation.
 */
function normalizeEventBlock(block) {
  // Create a stable fingerprint by removing volatile properties.
  const lines = block.replace(/\r\n/g, '\n').split('\n').filter(Boolean);
  const filtered = lines.filter((line) => {
    return !compareIgnorePrefixes.some((prefix) => line.startsWith(`${prefix}:`));
  });
  return filtered.join('\n');
}

/**
 * Parses existing .ics file events into a UID-indexed map.
 *
 * @param {any} filePath The calendar file path.
 * @returns A map of UID to event metadata.
 */
function parseExistingEvents(filePath) {
  // Build a UID -> event metadata map from the existing .ics file.
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

/**
 * Inserts or replaces a property line within a VEVENT block.
 *
 * @param {any} lines VEVENT lines array.
 * @param {any} prefix Property name to insert or update.
 * @param {any} value Property value.
 * @param {any} insertBefore Line to insert before if missing.
 * @returns The updated lines array.
 */
function upsertLine(lines, prefix, value, insertBefore) {
  // Replace or insert a property line in a VEVENT block.
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

/**
 * Ensures DTSTAMP/LAST-MODIFIED/SEQUENCE are set inside a VEVENT.
 *
 * @param {any} event The VEVENT text block.
 * @param {any} dtstamp DTSTAMP value to apply.
 * @param {any} lastModified LAST-MODIFIED value or null to remove.
 * @param {any} sequence SEQUENCE value to apply.
 * @returns The updated VEVENT text block.
 */
function applyEventTimestamps(event, dtstamp, lastModified, sequence) {
  // Ensure DTSTAMP/LAST-MODIFIED/SEQUENCE are consistent and in the VEVENT.
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

/**
 * Creates ICS events based on a weekly schedule and pickup day.
 *
 * @param {any} area The area identifier.
 * @param {any} street The name of the street.
 * @param {any} year The year of the events.
 * @param {any} weeks An array of week objects containing schedule information.
 * @param {any} typeMap A map of types to metadata (icon, description).
 * @param {any} pickupDayName The name of the pickup day (e.g., "Monday").
 * @returns An array of ICS event objects.
 */
function createEventsForStreet(area, street, year, weeks, typeMap, pickupDayName, dtstamp) {
    const baseDay = weekdayMap[pickupDayName.toLowerCase()]; // Map pickup day to ISO weekday
  
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

/**
 * Builds the VCALENDAR header section.
 *
 * @param {any} calendarName Calendar name shown to clients.
 * @param {any} calendarDescription Calendar description text.
 * @returns Header string for the calendar.
 */
function getCalendarHeader(calendarName, calendarDescription) {
  // Build the VCALENDAR header.
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

/**
 * Writes an ICS file to disk based on the provided events and calendar name.
 *
 * @param {any} filePath The file path to write the ICS file to.
 * @param {any} events An array of ICS event objects.
 * @param {any} calendarName The name of the calendar.
 * @param {any} currentDate The current Date.
 */
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
      // Preserve timestamps and sequence for unchanged events.
      const eventDtstamp = getLineValue(event, 'DTSTAMP');
      const preservedDtstamp = existing.dtstamp || eventDtstamp;
      const preservedLastModified = existing.lastModified || preservedDtstamp;
      return applyEventTimestamps(event, preservedDtstamp, preservedLastModified, existing.sequence);
    }

    // New or changed event: stamp with the current run's timestamp.
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

