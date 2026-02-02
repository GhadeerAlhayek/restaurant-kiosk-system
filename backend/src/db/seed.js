const fs = require('fs');
const path = require('path');
const { db } = require('../config/database');

async function runSeeds() {
  try {
    console.log('Starting database seeding...');

    const seedsDir = path.join(__dirname, 'seeds');
    const files = fs
      .readdirSync(seedsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`Running seed: ${file}`);

      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');

      await new Promise((resolve, reject) => {
        db.exec(sql, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      console.log(`✓ ${file} completed`);
    }

    console.log('All seeds completed successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
    throw error;
  }
}

if (require.main === module) {
  runSeeds()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runSeeds };
