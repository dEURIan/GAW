import { DatabaseSync } from 'node:sqlite';

/**
 * Opens a SQLite database (in-memory by default) with foreign keys enabled and initializes GAW tables.
 */
export function createDatabase(filename = ':memory:'): DatabaseSync {
  const db = new DatabaseSync(filename);

  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('employer', 'employee')),
      tier TEXT NOT NULL DEFAULT 'FREE' CHECK(tier IN ('FREE', 'PRO')),
      barangay TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gigs (
      id TEXT PRIMARY KEY,
      employer_id TEXT NOT NULL REFERENCES users(id),
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      estimated_hours REAL NOT NULL,
      offered_price_php REAL NOT NULL,
      minimum_required_php REAL NOT NULL,
      ai_recommended_php REAL NOT NULL,
      followed_ai_recommendation INTEGER NOT NULL,
      urgency TEXT NOT NULL,
      barangay TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'ASSIGNED', 'COMPLETED', 'CANCELLED')),
      assigned_employee_id TEXT REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS saved_gigs (
      employee_id TEXT NOT NULL REFERENCES users(id),
      gig_id TEXT NOT NULL REFERENCES gigs(id),
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      PRIMARY KEY (employee_id, gig_id)
    );

    CREATE TABLE IF NOT EXISTS gig_applications (
      id TEXT PRIMARY KEY,
      gig_id TEXT NOT NULL REFERENCES gigs(id),
      employee_id TEXT NOT NULL REFERENCES users(id),
      message TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
      created_at TEXT NOT NULL,
      UNIQUE(gig_id, employee_id)
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      gig_id TEXT NOT NULL UNIQUE REFERENCES gigs(id),
      employer_id TEXT NOT NULL REFERENCES users(id),
      employee_id TEXT NOT NULL REFERENCES users(id),
      gross_amount_php REAL NOT NULL,
      minimum_required_php REAL NOT NULL,
      employer_fee_php REAL NOT NULL,
      employer_total_charge_php REAL NOT NULL,
      employee_fee_php REAL NOT NULL,
      worker_net_payout_php REAL NOT NULL,
      platform_revenue_php REAL NOT NULL,
      fee_protected_by_min_wage INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_gigs_status ON gigs(status);
    CREATE INDEX IF NOT EXISTS idx_gigs_employer_status ON gigs(employer_id, status);
    CREATE INDEX IF NOT EXISTS idx_applications_employee_status ON gig_applications(employee_id, status);
    CREATE INDEX IF NOT EXISTS idx_transactions_employer ON transactions(employer_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_employee ON transactions(employee_id);
  `);

  return db;
}
