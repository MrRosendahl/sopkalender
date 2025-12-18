const fs = require('fs');
const path = require('path');

const calendarsDir = path.join(__dirname, 'calendars');
const readmePath = path.join(__dirname, 'README.md');
const githubBaseUrl = 'https://raw.githubusercontent.com/MrRosendahl/sopkalender/refs/heads/main/calendars';

/**
 * Recursively finds all .ics files under a directory.
 *
 * @param {any} dir Root directory to search.
 * @returns Array of file paths.
 */
function findIcsFiles(dir) {
  // Walk the calendars directory and collect .ics file paths.
  let files = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(findIcsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.ics')) {
      files.push(fullPath);
    }
  });
  return files;
}

/**
 * Groups calendar links by area number.
 *
 * @param {any} icsFiles Array of .ics file paths.
 * @returns Map of area number to markdown links.
 */
function groupByArea(icsFiles) {
  // Build a map: area number -> markdown links.
  const grouped = {};

  icsFiles.forEach(filePath => {
    const relPath = path.relative(calendarsDir, filePath).replace(/\\/g, '/');
    const url = `${githubBaseUrl}/${relPath}`;
    const fileName = path.basename(filePath);
    
    const match = fileName.match(/^area_(\d+)_/);
    if (!match) return;

    const area = match[1];
    if (!grouped[area]) grouped[area] = [];

    grouped[area].push(`- 🗓️ [${fileName}](${url})`);
  });

  return grouped;
}

/**
 * Formats grouped links into markdown <details> blocks.
 *
 * @param {any} grouped Grouped link map.
 * @returns Markdown string.
 */
function formatGroupedMarkdown(grouped) {
  // Render the grouped links as expandable sections.
  return Object.entries(grouped)
    .sort(([a], [b]) => Number(a) - Number(b)) // sort by area number
    .map(([area, links]) => {
      return `<details>\n<summary>Area ${area}</summary>\n\n${links.join('\n')}\n\n</details>`;
    })
    .join('\n\n');
}

/**
 * Replaces the auto-generated calendar block in README.md.
 *
 * @param {any} newBlock New markdown block to insert.
 */
function updateReadme(newBlock) {
  // Replace the auto-generated block in README.md.
  const startMarker = '<!-- auto-generated-calendar-links:start -->';
  const endMarker = '<!-- auto-generated-calendar-links:end -->';

  const readme = fs.readFileSync(readmePath, 'utf8');
  const startIndex = readme.indexOf(startMarker);
  const endIndex = readme.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    console.error('❌ Missing markers in README.md');
    process.exit(1);
  }

  const before = readme.slice(0, startIndex + startMarker.length);
  const after = readme.slice(endIndex);

  const updated = `${before}\n\n${newBlock}\n\n${after}`;
  fs.writeFileSync(readmePath, updated, 'utf8');
  console.log('✅ README.md updated with grouped calendar links');
}

// Run the generator
const files = findIcsFiles(calendarsDir);
const grouped = groupByArea(files);
const markdown = formatGroupedMarkdown(grouped);
updateReadme(markdown);

