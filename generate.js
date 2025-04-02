const fs = require('fs');
const path = require('path');
const { createEvents } = require('ics');
const { setISOWeek, setISODay, addDays } = require('date-fns');
const { execSync } = require('child_process');

const areasFolder = path.join(__dirname, 'areas');
const calendarPath = path.join(__dirname, 'calendars');

if (!fs.existsSync(calendarPath)) {
  fs.mkdirSync(calendarPath);
}

// Get correct [YYYY, MM, DD] from ISO week and pickupDayDiff
function getDateFromWeek(year, weekNumber, baseDay, pickupDayDiff = 0) {
  // This returns January 4th, which is guaranteed to be in ISO week 1.
  const baseDate = setISODay(setISOWeek(new Date(year, 0, 4), weekNumber), baseDay);
  const pickupDate = addDays(baseDate, pickupDayDiff);
  return [pickupDate.getFullYear(), pickupDate.getMonth() + 1, pickupDate.getDate()];
}

// Maps weekday name to ISO weekday number (Mon=1, Sun=7)
const weekdayMap = {
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  sunday: 7
};

// Create ICS events based on weekly schedule and pickup day
function createEventsForStreet(area, street, year, weeks, typeMap, pickupDayName) {
  const baseDay = weekdayMap[pickupDayName.toLowerCase()];  

  if (baseDay === undefined) {
    console.warn(`⚠ Unknown pickup day "${pickupDayName}" — skipping`);
    return [];
  }

  return weeks
    .map(week => {
      const typeMeta = typeMap[week.type];
      const uid = `area${area}_${slugifyStreet(street)}_${year}_week${week.weekNumber}_${week.type}`;
      const start = getDateFromWeek(year, week.weekNumber, baseDay, week.pickupDayDiff || 0);

      if (!typeMeta) return null;

      return {
        uid: uid,
        title: `${typeMeta.icon} ${typeMeta.description}`,
        description: week.description || '',
        start: start,
        duration: { days: 1 },
        status: 'CONFIRMED'
      };
    })
    .filter(Boolean);
}

// Helper function to create a zero-padded string
// (e.g., 1 -> "01", 10 -> "10")
const pad = (n) => n.toString().padStart(2, '0');

// Write .ics file to disk
function generateCalendar(filePath, events, calendarName) {
  const { error, value } = createEvents(events);
  if (error) {
    console.error(`❌ Error generating ${filePath}:`, error);
    return;
  }

  // Inject X-WR-CALNAME just after CALSCALE
  let output = value.replace(
    'CALSCALE:GREGORIAN',
    `CALSCALE:GREGORIAN\nX-WR-CALNAME:${calendarName}`
  );  

  // Optional: Replace all DTSTAMPs with something consistent (like event start)
  events.forEach(event => {
    const dt = event.start; // [YYYY, M, D]
    const stamp = `DTSTAMP:${dt[0]}${pad(dt[1])}${pad(dt[2])}T000000Z`;
    output = output.replace(/DTSTAMP:[^\n]*/i, stamp); // replaces first or all if looped
  });

  fs.writeFileSync(filePath, output, 'utf8');
  console.log(`✅ Wrote: ${filePath}`);
}

// Slugify street name to file-friendly string
function slugifyStreet(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/\s+/g, '-') // spaces to dashes
    .replace(/[^a-zA-Z0-9-_]/g, '') // remove anything weird
    .toLowerCase();
}

// Main loop
fs.readdirSync(areasFolder)
  .filter(file => file.startsWith('area_') && file.endsWith('.json'))
  .forEach(file => {
    const fullPath = path.join(areasFolder, file);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    const { area, year, week, types, streetPickup, calendarTitle } = data;

    // Create map: { "M": { icon, description }, ... }
    const typeMap = types.reduce((acc, t) => {
      acc[t.type] = { icon: t.icon, description: t.description };
      return acc;
    }, {});

    // Generate one calendar per street
    streetPickup.forEach(({ street, pickupDay }) => {
      const events = createEventsForStreet(area, street, year, week, typeMap, pickupDay);

      const safeStreet = slugifyStreet(street);
      const fileName = `area_${area}_${safeStreet}.ics`;

      // Output folder per area
      const areaFolder = path.join(calendarPath, `area_${area}`);
      if (!fs.existsSync(areaFolder)) {
        fs.mkdirSync(areaFolder);
      }

      const filePath = path.join(areaFolder, fileName);
      const fullTitle = `${calendarTitle} – ${street}`;
      generateCalendar(filePath, events, fullTitle);
    });
  });

// Run update-readme-links.js after all files are processed
try {
  execSync('node update-readme-links.js', { stdio: 'inherit' });
  console.log('✅ Successfully executed update-readme-links.js');
} catch (err) {
  console.error('❌ Error executing update-readme-links.js:', err.message);
}
