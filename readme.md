# 🗑️ Sopkalender (iCal Generator for Waste Pickup)

Generate `.ics` calendar files with household waste pickup schedules — easily importable into calendar apps like **Google Calendar**, **Apple Calendar**, or **Outlook**.

---

## 📦 Features

- 📅 Generates **.ics files per street** and per area
- 🏘 Supports **multiple streets per area** with individual pickup days
- 📆 Uses **ISO week numbers** with proper weekday offset support
- 🕒 Adds **custom pickup notes** (e.g. "Låt sopkärlet stå tills det blir tömt.")
- 🔁 Uses **stable event UIDs** for smooth calendar syncing
- 🧾 Custom calendar names using `X-WR-CALNAME` (shown in some apps)
- 🔧 Easily extendable by editing JSON files — no code changes needed

---

## 📁 File Structure

```
├── generate.js          # Script to generate .ics files
├── areas/
│   ├── area_29.json     # JSON file defining pickup schedule, types, and streets
├── calendars/           # Output folder for generated .ics files
│   ├── area_29/
│   │   ├── area_29_bergelesgatan.ics
│   │   └── ...
├── package.json
└── README.md
```

---

## 🧰 Requirements

- **Node.js** v18 or higher (v20+ recommended)
- `ics` and `date-fns` libraries

Install dependencies:

```bash
npm install
```

---

## 🚀 Usage

To generate calendar files:

```bash
node generate
```

All `.ics` files will be written to the `calendars/` folder, organized per area.

---

## 🌐 Available Calendars

You can subscribe directly via GitHub Raw URLs.  
When clicking on the calendar link it will open in a new browser tab.  
Copy the url and [import that to your calendar app](#-importing-to-calendar-apps).

<details>
<summary>Click to show a list of available calendar subscriptions</summary>

<!-- auto-generated-calendar-links:start -->
<!-- auto-generated-calendar-links:end -->
</details>

## 📥 Importing to Calendar Apps

You can subscribe to the generated `.ics` files in most calendar apps:

### 🔗 Google Calendar

> Note: `X-WR-CALNAME` is ignored when using public URL subscriptions.

1. In Google Calendar:
   - Click the `+` next to **Other calendars**
   - Select **From URL**
   - Paste the `.ics` file URL
2. (Optional) Rename the calendar manually
3. (Optional) Change the color of the calendar

### 🍎 Apple Calendar

1. In Calendar app: **File → New Calendar Subscription**
2. Paste the `.ics` file URL
3. Apple will show the name from `X-WR-CALNAME` 🎉

---

## ✍️ Example JSON (area_29.json)

```json
{
  "area": 29,
  "calendarTitle": "Sopkalender 2025",
  "streetPickup": [
    {
      "street": "Bergelésgatan",
      "pickupDay": "Tuesday"
    },
    {
      "street": "Innövervägen",
      "pickupDay": "Tuesday"			
    },
    {
      "street": "Tallhedsgatan",
      "pickupDay": "Tuesday"			
    },
    {
      "street": "Porsnäsvägen",
      "pickupDay": "Tuesday"			
		}
  ],
  "types": [
    {
      "type": "M",
      "description": "Matavfall",
      "icon": "🟫"
    },
    {
      "type": "R",
      "description": "Restavfall",
      "icon": "🟩"
    }
  ],
  "year": 2025,
  "week": [
    {
      "weekNumber": 2,
      "type": "M",
      "pickupDayDiff": 0,
      "description": "Trettondedag jul: Låt sopkärlet stå tills det blir tömt."
    }
    {
      "weekNumber": 3,
      "type": "R"
    },
    {
      "weekNumber": 6,
      "type": "M"
    },
    ...
  ]
}
```

---

## 🛠️ Customizing

You can add more areas and streets by creating new JSON files in the `areas/` folder using the same structure.

---

## 📄 License

MIT — free to use and adapt for your municipality or neighborhood.
