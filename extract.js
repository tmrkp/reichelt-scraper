const fs = require('fs');
const path = require('path');

const CATEGORY_ID = '2875';
const CATEGORY_DIR = path.join(__dirname, CATEGORY_ID);

// Ensure the directory exists
if (!fs.existsSync(CATEGORY_DIR)) {
  console.error(`Directory ${CATEGORY_DIR} does not exist.`);
  process.exit(1);
}

const files = fs.readdirSync(CATEGORY_DIR);

for (const file of files) {
  if (path.extname(file).toLowerCase() !== '.json') continue;

  const filePath = path.join(CATEGORY_DIR, file);
  let data;
  try {
    data = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`Error reading ${file}:`, err);
    continue;
  }

  let json;
  try {
    json = JSON.parse(data);
  } catch (err) {
    console.error(`Invalid JSON in ${file}:`, err);
    continue;
  }

  if (json.html) {
    const htmlFileName = file.replace(/\.json$/i, '.html');
    const htmlFilePath = path.join(CATEGORY_DIR, htmlFileName);
    try {
      fs.writeFileSync(htmlFilePath, json.html);
      console.log(`✔ Extracted: ${htmlFileName}`);
    } catch (err) {
      console.error(`Error writing ${htmlFileName}:`, err);
    }
  } else {
    console.warn(`⚠ Missing "html" field in ${file}`);
  }
}
