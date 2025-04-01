const fs = require('fs');
const path = require('path');
const { createEvents } = require('ics');
const { setISOWeek, setISODay, addDays } = require('date-fns');

const areasFolder = path.join(__dirname, 'areas');
const calendarPath = path.join(__dirname, 'calendars');

if (!fs.existsSync(calendarPath)) {
  fs.mkdirSync(calendarPath);
}

// Get correct [YYYY, MM, DD] from ISO week and pickupDayDiff
function getDateFromWeek(year, weekNumber, baseDay, pickupDayDiff = 0) {
  // baseDay: 1 = Monday, 2 = Tuesday, ...
  const baseDate = setISODay(setISOWeek(new Date(year, 0, 4), weekNumber), baseDay);
  const pickupDate = addDays(baseDate, pickupDayDiff);
  return [pickupDate.getFullYear(), pickupDate.getMonth() + 1, pickupDate.getDate()];
}

// Maps weekday name to ISO weekday number (Mon=0, Sun=6)
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
function createEventsForStreet(year, weeks, typeMap, pickupDayName) {
  const baseDay = weekdayMap[pickupDayName.toLowerCase()];
  if (baseDay === undefined) {
    console.warn(`⚠ Unknown pickup day "${pickupDayName}" — skipping`);
    return [];
  }

  return weeks
    .map(week => {
      const typeMeta = typeMap[week.type];
      if (!typeMeta) return null;

      return {
        title: `${typeMeta.icon} ${typeMeta.description}`,
        description: week.description || '',
        start: getDateFromWeek(year, week.weekNumber, baseDay, week.pickupDayDiff || 0),
        duration: { days: 1 },
        status: 'CONFIRMED'
      };
    })
    .filter(Boolean);
}

// Write .ics file to disk
function generateCalendar(filePath, events) {
  const { error, value } = createEvents(events);
  if (error) {
    console.error(`❌ Error generating ${filePath}:`, error);
    return;
  }

  fs.writeFileSync(filePath, value);
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

    const { area, year, week, types, streetPickup } = data;

    // Create map: { "M": { icon, description }, ... }
    const typeMap = types.reduce((acc, t) => {
      acc[t.type] = { icon: t.icon, description: t.description };
      return acc;
    }, {});

    // Generate one calendar per street
    streetPickup.forEach(({ street, pickupDay }) => {
      const events = createEventsForStreet(year, week, typeMap, pickupDay);

      const safeStreet = slugifyStreet(street);
      const fileName = `area_${area}_${safeStreet}.ics`;

      // Output folder per area
      const areaFolder = path.join(calendarPath, `area_${area}`);
      if (!fs.existsSync(areaFolder)) {
        fs.mkdirSync(areaFolder);
      }

      const filePath = path.join(areaFolder, fileName);
      generateCalendar(filePath, events);
    });
  });
