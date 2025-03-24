# 🗑️ Sopkalender (iCal Generator for Waste Pickup)

This project generates `.ics` calendar files for home waste pickup — supporting both **Restavfall** and **Matavfall**.

You can use the generated `.ics` files to **subscribe in your calendar app** (Google Calendar, Outlook, Apple Calendar, etc) and get reminders for pickup days.

---

## 📦 Features

- ✅ All-day events  
- ✅ Supports both specific dates (`YYYY-MM-DD`) and ISO week format (`YYYY-Wnn`)  
- ✅ Automatically resolves week-based entries to **Tuesdays** unless a explicit date is scheduled
- ✅ Separates **Restavfall** and **Matavfall** into different calendars and also a combined **all** calendar.

---

## 📁 File Structure
```
. ├── generate.js         # Script to generate .ics files
  ├── waste-schedule.json # json file which includes the pickup schedules
  ├── calendars/  # Output folder with generated .ics files
  ├──── all.ics   # Calendar that includes both matavfall and restavfall
  ├──── matavfall.ics 
  ├──── restavfall.ics
  │
  ├── package.json 
  └── README.md
```

---

## 🧰 Requirements

- Node.js v18+ (or v20+ recommended)
- `ics` library
- `date-fns` library

Install dependencies:

```bash
npm install
```

## 🚀 Usage
```bash
node generate
```
The .ics files will be written to the calendars/ folder.

