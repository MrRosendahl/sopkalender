const fs = require('fs');
const path = require('path');

const calendarsDir = path.join(__dirname, 'calendars');
const readmePath = path.join(__dirname, 'README.md');
const githubBaseUrl = 'https://raw.githubusercontent.com/MrRosendahl/sopkalender/refs/heads/main/calendars';

// Recursively find all .ics files
function findIcsFiles(dir) {
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

// Group links by area number
function groupByArea(icsFiles) {
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

// Format grouped links into <details> blocks
function formatGroupedMarkdown(grouped) {
  return Object.entries(grouped)
    .sort(([a], [b]) => Number(a) - Number(b)) // sort by area number
    .map(([area, links]) => {
      return `<details>\n<summary>Area ${area}</summary>\n\n${links.join('\n')}\n\n</details>`;
    })
    .join('\n\n');
}

// Update README.md between start/end markers
function updateReadme(newBlock) {
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
