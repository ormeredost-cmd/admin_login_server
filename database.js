// bgmi-api/database.js
const path = require('path');
const { Low } = require('lowdb');
const { JSONFile } = require('lowdb/node');

const DB_FILE =
  process.env.DB_FILE || path.join(__dirname, 'bgmi.json');

const adapter = new JSONFile(DB_FILE);
const db = new Low(adapter, { users: [], otps: [] });

async function initDb() {
  await db.read();
  db.data ||= { users: [], otps: [] };
  await db.write();
  console.log('LowDB connected at', DB_FILE);
}

module.exports = { db, initDb };
