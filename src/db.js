import sqlite3 from "sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "..", "data.sqlite3");

sqlite3.verbose();
const db = new sqlite3.Database(DB_PATH);

// 테이블/인덱스 생성
db.serialize(() => {
  db.run(`
CREATE TABLE IF NOT EXISTS entries (
id INTEGER PRIMARY KEY AUTOINCREMENT,
name TEXT NOT NULL CHECK(length(name) <= 30),
message TEXT NOT NULL CHECK(length(message) <= 500),
status TEXT NOT NULL CHECK(status IN ('PENDING','APPROVED','REJECTED')),
created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
)
`);
  db.run(
    `CREATE INDEX IF NOT EXISTS idx_entries_status_created_at ON entries(status, created_at DESC)`,
  );
});

// Promise helper
export const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });

export const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });

export const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });

export default db;
