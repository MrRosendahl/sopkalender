# 🗑️ Sopkalender (iCal Generator for Waste Pickup)

This project generates `.ics` calendar files for home waste pickup.

You can use the generated `.ics` files to **subscribe in your calendar app** (Google Calendar, Outlook, Apple Calendar, etc) and get reminders for pickup days.

---

## 📦 Features

- ✅ All-day events

---

## 📁 File Structure
```
. ├── generate.js         # Script to generate .ics files
  ├── areas/
  ├──── area_29-2025.json # json file which includes the pickup schedules for an area and its streets
  ├── calendars/  # Output folder with generated .ics files
  ├──── area_29_<streetname>.ics
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

