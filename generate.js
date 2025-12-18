const fs = require('fs'); // Import file system module for reading and writing files
const path = require('path'); // Import path module for file path manipulation
const { execSync } = require('child_process'); // Import child_process module for executing shell commands
const { ensureFolderExists } = require('./utils'); // Import utility functions
const { generateCalendarsForAreaConfig } = require('./area_processor'); // Import area processing functions
const {
  buildUpdatedConfigFromFile,
  writeUpdatedConfigToFile
} = require('./areas/area_generator'); // Import area generator helpers

// Define paths for areas and calendars
const areasFolder = path.resolve(__dirname, 'areas'); // Folder containing area JSON files
const generatedAreasFolder = path.resolve(__dirname, 'areas', '_generated'); // Folder containing generated area JSON files
const calendarPath = path.resolve(__dirname, 'calendars'); // Folder to store generated calendars

/**
 * Generates a UTC timestamp string in iCalendar format.
 *
 * @returns A string like "20250102T135959Z".
 */
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
  const writeAreaFiles = args.includes('--write-area-files'); // Toggle verification output
  const inputFolder = areasFolder;

  const areaFiles = fs
    .readdirSync(inputFolder) // Read all files in the input folder
    .filter((file) => file.startsWith('area_') && file.endsWith('.jsonc')); // Filter for area JSON files
  
  const dtstamp = createDTSTAMP(); // Generate the current timestamp in UTC format

  // Generate calendars (or write verification files) for each source config.
  areaFiles.forEach((file) => {
    const inputPath = path.join(inputFolder, String(file));
    const updatedConfig = buildUpdatedConfigFromFile(inputPath);
    if (!updatedConfig) {
      return;
    }

    // Write generated JSONC for inspection instead of calendars.
    if (writeAreaFiles) {      
      ensureFolderExists(generatedAreasFolder);
      const outputPath = path.join(generatedAreasFolder, String(file));
      console.log(`🗺️  Outputting area file: ${outputPath}`);
      writeUpdatedConfigToFile(updatedConfig, outputPath, true);
    }
    else {
      console.log(`🗺️  Generating calendars for area config: areas/${file}`);
      generateCalendarsForAreaConfig(updatedConfig, calendarPath, dtstamp, inputPath);
    }    
  });

  if (writeAreaFiles === false) {
    // Update README links only when calendars are generated.
    execSync('node update-readme-links.js', { stdio: 'inherit' });
    console.log('✅ Successfully executed update-readme-links.js');
  }  
} catch (err) {
  console.error('❌ Error during processing:', err);
}

