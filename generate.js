const fs = require('fs'); // Import file system module for reading and writing files
const path = require('path'); // Import path module for file path manipulation
const { execSync } = require('child_process'); // Import child_process module for executing shell commands
const { ensureFolderExists } = require('./utils'); // Import utility functions
const { generateCalendarsForAreaConfig } = require('./area_file_processor'); // Import area file processing functions
const {
  buildUpdatedConfigFromFile,
  writeUpdatedConfigToFile
} = require('./areas/area-updater'); // Import area updater helpers

// Define paths for areas and calendars
const areasFolder = path.resolve(__dirname, 'areas'); // Folder containing area JSON files
const templatesFolder = path.resolve(__dirname, 'areas', 'templates'); // Folder containing template area JSON files
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

  const args = process.argv.slice(2);
  const writeAreaFiles = args.includes('--write-area-files');
  const inputFolder = fs.existsSync(templatesFolder) ? templatesFolder : areasFolder;

  const areaFiles = fs
    .readdirSync(inputFolder) // Read all files in the input folder
    .filter((file) => file.startsWith('area_') && file.endsWith('.jsonc')); // Filter for area JSON files
  
  const dtstamp = createDTSTAMP(); // Generate the current timestamp in UTC format

  // Generate street calendars for each area file
  areaFiles.forEach((file) => {
    const inputPath = path.join(inputFolder, String(file));
    const updatedConfig = buildUpdatedConfigFromFile(inputPath);
    if (!updatedConfig) {
      return;
    }

    if (writeAreaFiles) {
      const outputPath = path.join(areasFolder, String(file));
      writeUpdatedConfigToFile(updatedConfig, outputPath, true);
    }

    generateCalendarsForAreaConfig(updatedConfig, calendarPath, dtstamp, inputPath);
  });

  // Run update-readme-links.js after all files are processed
  execSync('node update-readme-links.js', { stdio: 'inherit' });
  console.log('✅ Successfully executed update-readme-links.js');
} catch (err) {
  console.error('❌ Error during processing:', err);
}
