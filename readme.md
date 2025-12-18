# Sopkalender (iCal Generator for Waste Pickup)

Generate `.ics` calendar files for household waste pickup schedules. Import into Google Calendar, Apple Calendar, or Outlook.

---

## Features

- Generates `.ics` files per street and area
- Supports multiple streets per area with individual pickup days
- Uses ISO week numbers with weekday offsets
- Supports custom pickup notes
- Custom calendar names via `X-WR-CALNAME`
- No code changes needed when adding or editing areas

---

## File Structure

```
├── generate.js            # Main script to generate .ics files
├── area_processor.js      # Processes area configs and prepares data for calendar generation
├── calendar_generator.js  # Creates ICS files and events
├── utils.js               # File/date helpers
├── areas/                 # Source area configs (JSONC)
│   ├── area_29.jsonc
│   └── _generated/        # Optional verification outputs (gitignored)
├── calendars/             # Output .ics files per area
│   └── area_29/
│       └── area_29_bergelesgatan.ics
├── package.json
└── readme.md
```

---

## Requirements

- Node.js v18 or higher (v20+ recommended)
- Dependencies: `date-fns`

Install dependencies:

```bash
npm install
```

---

## Usage

Generate `.ics` files:

```bash
node generate.js
```

This reads source configs from `areas/*.jsonc` and writes calendars into `calendars/`.

### Verify generated area files

If you want to inspect the generated `weeks` output, run:

```bash
node generate.js --write-area-files
```

This writes JSONC files into `areas/_generated/` for verification. The folder is gitignored.

---

## Key Files

### `generate.js`

Main entry point. It:

1. Reads all `areas/*.jsonc` source files.
2. Generates `weeks` using `areas/area_generator.js`.
3. Produces `.ics` files per street using `calendar_generator.js`.
4. Optionally writes verification area files to `areas/_generated/`.

### `area_processor.js`

Takes a fully populated area config (including `years[].weeks`) and generates the per-street calendars.

### `areas/area_generator.js`

Generates `years[].weeks` from `years[].typeFrequency` (automatic or manual). Can be used standalone:

```bash
node .\areas\area_generator.js .\areas\area_29.jsonc .\areas\_generated\area_29.jsonc
```

If both `automatic` and `manual` are provided for the same type in a year, `manual` takes precedence and `automatic` is ignored in the generated output.

---

## Available Calendars

You can subscribe directly via GitHub Raw URLs. When you click a calendar link, it opens in a browser tab. Copy the URL and import it in your calendar app.

<!-- auto-generated-calendar-links:start -->

<details>
<summary>Area 29</summary>

- 🗓️ [area_29_bergelesgatan.ics](https://raw.githubusercontent.com/MrRosendahl/sopkalender/refs/heads/main/calendars/area_29/area_29_bergelesgatan.ics)
- 🗓️ [area_29_innovervagen.ics](https://raw.githubusercontent.com/MrRosendahl/sopkalender/refs/heads/main/calendars/area_29/area_29_innovervagen.ics)
- 🗓️ [area_29_porsnasvagen.ics](https://raw.githubusercontent.com/MrRosendahl/sopkalender/refs/heads/main/calendars/area_29/area_29_porsnasvagen.ics)
- 🗓️ [area_29_tallhedsgatan.ics](https://raw.githubusercontent.com/MrRosendahl/sopkalender/refs/heads/main/calendars/area_29/area_29_tallhedsgatan.ics)

</details>

<!-- auto-generated-calendar-links:end -->

---

## Importing to Calendar Apps

### Google Calendar

Note: `X-WR-CALNAME` is ignored for public URL subscriptions.

1. Click `+` next to Other calendars
2. Select From URL
3. Paste the `.ics` file URL
4. Optionally rename and recolor

### Apple Calendar

1. File → New Calendar Subscription
2. Paste the `.ics` file URL
3. Apple shows the name from `X-WR-CALNAME`

---

## Example Area Config (JSONC)

Any type used in `typeFrequency` must also be defined in `types`. If it’s missing, the weeks still get generated, but events for that type are skipped (with a warning).

```jsonc
{
  "area": 29,
  "calendarTitle": "Sopkalender",
  "streetPickup": [
    { "street": "Bergelesgatan", "pickupDay": "Tuesday" },
    { "street": "Innovervagen", "pickupDay": "Tuesday" }
  ],
  "types": [
    { "type": "R", "description": "Plast och Restavfall", "icon": "🟩" },
    { "type": "M", "description": "Matavfall", "icon": "🟫" },
    { "type": "PR", "description": "Plast och Restavfall", "icon": "🟪⬛" },
    { "type": "PM", "description": "Papper och Matavfall", "icon": "🟨🟫" }
  ],
  "years": [
    {
      "year": 2026,
      "typeFrequency": {
        "M": { "manual": [2, 6, 10] },
        "R": { "manual": [3, 7, 11] }
      },
      "weeks": []
    }
  ]
}
```

---

## License

MIT - free to use and adapt for your municipality or neighborhood.
