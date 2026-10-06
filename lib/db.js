import { Pool } from "pg";

// DATABASE_URL pointe vers le service "db" (nom du service Compose, pas localhost)
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export function query(text, params) {
  return pool.query(text, params);
}
