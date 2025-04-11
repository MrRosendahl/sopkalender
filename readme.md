# 🗑️ Sopkalender (iCal Generator for Waste Pickup)

Generate `.ics` calendar files with household waste pickup schedules — easily importable into calendar apps like **Google Calendar**, **Apple Calendar**, or **Outlook**.

---

## 📦 Features

- 📅 Generates **.ics files per street** and per area
- 🏘 Supports **multiple streets per area** with individual pickup days
- 📆 Uses **ISO week numbers** with proper weekday offset support
- 🕒 Adds **custom pickup notes** (e.g. "Låt sopkärlet stå tills det blir tömt.")
- 🧾 Custom calendar names using `X-WR-CALNAME` (shown in some apps)
- 🔧 Easily extendable by editing JSON files — no code changes needed

---

## 📁 File Structure

```
├── generate.js            # Main script to generate .ics files
├── area_file_processor.js # Processes area JSON files and prepares data for calendar generation
├── calendar_generator.js  # Handles the creation of ICS files and stable DTSTAMP generation
├── utils.js               # Utility functions for file handling, date formatting, and more
├── areas/
│   ├── area_29.json       # JSON file defining pickup schedule, types, and streets
├── calendars/             # Output folder for generated .ics files
│   ├── area_29/
│   │   ├── area_29_bergelesgatan.ics
│   │   └── ...
├── package.json           # Project dependencies and metadata
├── package-lock.json      # Dependency lock file
└── README.md              # Project documentation
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

## 📜 Comments on Key Files

### `generate.js`

This is the main entry point for generating `.ics` files. It orchestrates the following steps:

1. Ensures the output folder (`calendars/`) exists.
2. Reads all JSON files in the `areas/` folder.
3. Processes each area file using `area_file_processor.js`.
4. Generates `.ics` files for each street in the area using `calendar_generator.js`.
5. Runs `update-readme-links.js` to update the README with links to the generated calendars.

Run this script with:

```bash
node generate
```

---

### `area_file_processor.js`

This module processes the JSON files in the `areas/` folder. It performs the following tasks:

1. Reads and validates the structure of the JSON files.
2. Extracts relevant data such as area, streets, pickup days, and event types.
3. Prepares the data for use by `calendar_generator.js`.

This module ensures that the input data is clean and ready for calendar generation.

---

### `calendar_generator.js`

This module handles the creation of `.ics` files. It includes:

1. **Event Generation**:
   - Converts the processed data into ICS-compatible events.
   - Sets `DTSTAMP` to the current runtime.

2. **File Writing**:
   - Writes the generated `.ics` files to the appropriate folder.

3. **Custom Calendar Names**:
   - Adds `X-WR-CALNAME` to the ICS file for better display in calendar apps.

This module ensures that the `.ics` files are correctly formatted and ready for use.

---

## 🌐 Available Calendars

You can subscribe directly via GitHub Raw URLs.  
When clicking on the calendar link it will open in a new browser tab.  
Copy the url and [import that to your calendar app](#-importing-to-calendar-apps).

<!-- auto-generated-calendar-links:start -->

<details>
<summary>Area 29</summary>

- 🗓️ [area_29_bergelesgatan.ics](https://raw.githubusercontent.com/MrRosendahl/sopkalender/refs/heads/main/calendars/area_29/area_29_bergelesgatan.ics)
- 🗓️ [area_29_innovervagen.ics](https://raw.githubusercontent.com/MrRosendahl/sopkalender/refs/heads/main/calendars/area_29/area_29_innovervagen.ics)
- 🗓️ [area_29_porsnasvagen.ics](https://raw.githubusercontent.com/MrRosendahl/sopkalender/refs/heads/main/calendars/area_29/area_29_porsnasvagen.ics)
- 🗓️ [area_29_tallhedsgatan.ics](https://raw.githubusercontent.com/MrRosendahl/sopkalender/refs/heads/main/calendars/area_29/area_29_tallhedsgatan.ics)

</details>

<!-- auto-generated-calendar-links:end -->

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
