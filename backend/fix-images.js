const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'kiosk.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    UPDATE category_ingredients
    SET image_url = '/uploads/' || image_url
    WHERE image_url IS NOT NULL
    AND image_url NOT LIKE '/uploads/%'
  `, (err) => {
    if (err) {
      console.error('Error:', err);
    } else {
      console.log('✓ Fixed ingredient image URLs');
    }

    db.close();
  });
});
