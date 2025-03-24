// const fs = require('fs');
// const path = require('path');
// const { createEvents } = require('ics');
// const { parseISO, startOfISOWeek, addDays } = require('date-fns');

// // 🗂️ Waste types enum
// const WasteType = {
//   RESTAVFALL: { key: 'restavfall', title: 'Restavfall' },
//   MATAVFALL: { key: 'matavfall', title: 'Matavfall' }
// };

const fs = require('fs');
const path = require('path');
const { createEvents } = require('ics');
const { parseISO, startOfISOWeek, addDays } = require('date-fns');

// 🗂️ Waste types enum
const WasteType = {
  matavfall: { key: 'matavfall', title: 'Matavfall' },
  restavfall: { key: 'restavfall', title: 'Restavfall' }
};

// 📁 Output path for calendar files
const calendarPath = path.join(__dirname, 'calendars');
if (!fs.existsSync(calendarPath)) {
  fs.mkdirSync(calendarPath);
}

// 📥 Load schedule from JSON
const schedule = require('./waste-schedule.json');

// 🧠 Converts "YYYY-Wxx" or "YYYY-MM-DD" to [YYYY, M, D]
function parseDate(input) {
  let date;
  if (input.includes('W')) {
    const monday = parseISO(input);
    date = addDays(startOfISOWeek(monday), 1); // Tuesday
  } else {
    date = parseISO(input);
  }
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()];
}

// 🔁 Generate a calendar file from a list of event objects
function generateCalendar(filename, eventList) {
  const { error, value } = createEvents(eventList);

  if (error) {
    console.error(`❌ Error generating ${filename}:`, error);
    return;
  }

  const filePath = path.join(calendarPath, filename);
  fs.writeFileSync(filePath, value);
  console.log(`✅ Wrote: ${filePath}`);
}

// 📅 Convert type + dates to ICS-friendly events
function createEventsForType(typeKey, dates) {
  const type = WasteType[typeKey];

  const typeIcons = {
    matavfall: '🟫',
    restavfall: '🟩'
  };

  return dates.map(dateStr => ({
    title: `${typeIcons[typeKey]} ${type.title}`,
    start: parseDate(dateStr),
    duration: { days: 1 },
    status: 'CONFIRMED'
  }));
}

// 🔨 Generate individual calendars
const matavfallEvents = createEventsForType('matavfall', schedule.matavfall);
const restavfallEvents = createEventsForType('restavfall', schedule.restavfall);

generateCalendar('matavfall.ics', matavfallEvents);
generateCalendar('restavfall.ics', restavfallEvents);

// 🧃 Combine all events into one calendar (and sort by date)
const allEvents = [...matavfallEvents, ...restavfallEvents].sort((a, b) => {
  const aDate = new Date(a.start[0], a.start[1] - 1, a.start[2]);
  const bDate = new Date(b.start[0], b.start[1] - 1, b.start[2]);
  return aDate - bDate;
});

console.log(allEvents.map(e => `${e.title}: ${e.start.join('-')}`));

generateCalendar('all.ics', allEvents);
