const pool = require('./config/db');

async function ensureResumeFields() {
  await pool.query(`
    ALTER TABLE experience
      ADD COLUMN IF NOT EXISTS subheading VARCHAR(250) DEFAULT '',
      ADD COLUMN IF NOT EXISTS current_job BOOLEAN DEFAULT FALSE
  `);
}

module.exports = { ensureResumeFields };
