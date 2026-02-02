const fs = require('fs');
const path = require('path');
const { db, run, query } = require('../config/database');

async function runMigrations() {
  try {
    console.log('Starting database migrations...');

    // Create migrations table
    await run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        executed_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    // Get executed migrations
    const executed = await query('SELECT name FROM migrations');
    const executedSet = new Set(executed.map((r) => r.name));

    // Run pending migrations
    for (const file of files) {
      if (!executedSet.has(file)) {
        console.log(`Running migration: ${file}`);

        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');

        // Run migration
        await new Promise((resolve, reject) => {
          db.exec(sql, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        // Record migration
        await run('INSERT INTO migrations (name) VALUES (?)', [file]);
        console.log(`✓ ${file} completed`);
      } else {
        console.log(`⊘ ${file} already executed`);
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
