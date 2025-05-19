const fs = require('fs'); // Import file system module for reading and writing files
const path = require('path'); // Import path module for file path manipulation
const { execSync } = require('child_process'); // Import child_process module for executing shell commands
const { ensureFolderExists } = require('./utils'); // Import utility functions
const { generateCalendarsForAreaFile } = require('./area_file_processor'); // Import area file processing functions

// Define paths for areas and calendars
const areasFolder = path.resolve(__dirname, 'areas'); // Folder containing area JSON files
const calendarPath = path.resolve(__dirname, 'calendars'); // Folder to store generated calendars

function createDTSTAMP() {
  const pad = (n) => String(n).padStart(2, '0');
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = pad(now.getUTCMonth() + 1);
  const day = pad(now.getUTCDate());
  const hour = pad(now.getUTCHours());
  const minute = pad(now.getUTCMinutes());
  const second = pad(now.getUTCSeconds());

  return `${year}${month}${day}T${hour}${minute}${second}Z`;
}

// Main loop
try {
  ensureFolderExists(calendarPath);

  const areaFiles = fs
    .readdirSync(areasFolder) // Read all files in the areas folder
    .filter((file) => file.startsWith('area_') && file.endsWith('.json')); // Filter for area JSON files

  const dtstamp = createDTSTAMP(); // Generate the current timestamp in UTC format

  // Generate street calendars for each area file
  areaFiles.forEach((file) => {
    generateCalendarsForAreaFile(String(file), areasFolder, calendarPath, dtstamp);
  });

  // Run update-readme-links.js after all files are processed
  execSync('node update-readme-links.js', { stdio: 'inherit' });
  console.log('✅ Successfully executed update-readme-links.js');
} catch (err) {
  console.error('❌ Error during processing:', err);
}