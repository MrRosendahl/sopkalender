const fs = require('fs');
const path = require('path');

const calendarsDir = path.join(__dirname, 'calendars');
const readmePath = path.join(__dirname, 'README.md');

// GitHub raw base URL
const githubBaseUrl = 'https://raw.githubusercontent.com/MrRosendahl/sopkalender/refs/heads/main/calendars';

// Find all .ics files recursively
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

// Convert to markdown link
function formatMarkdownLink(filePath) {
  const relPath = path.relative(calendarsDir, filePath).replace(/\\/g, '/');
  const url = `${githubBaseUrl}/${relPath}`;
  return `- 🗓️ [${path.basename(filePath)}](${url})`;
}

// Update README.md
function updateReadme(links) {
  const readme = fs.readFileSync(readmePath, 'utf8');

  const startMarker = '<!-- auto-generated-calendar-links:start -->';
  const endMarker = '<!-- auto-generated-calendar-links:end -->';

  const startIndex = readme.indexOf(startMarker);
  const endIndex = readme.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1) {
    console.error('❌ Missing markers in README.md');
    process.exit(1);
  }

  const before = readme.slice(0, startIndex + startMarker.length);
  const after = readme.slice(endIndex);

  const newContent = `\n\n${links.join('\n')}\n\n`;
  const updated = before + newContent + after;

  fs.writeFileSync(readmePath, updated, 'utf8');
  console.log('✅ README.md updated with calendar links');
}

// Run
const icsFiles = findIcsFiles(calendarsDir);
const markdownLinks = icsFiles.map(formatMarkdownLink);
updateReadme(markdownLinks);
