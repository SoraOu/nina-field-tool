import * as SQLite from 'expo-sqlite';
// seedGeoData is imported lazily to avoid circular dep at init time

let db: SQLite.SQLiteDatabase | null = null;

export function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

export async function initDatabase(): Promise<void> {
  if (db) return;

  db = await SQLite.openDatabaseAsync('mogpog_mno.db');

  // Enable WAL mode and foreign keys
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Run migrations in order
  await runMigrations(db);
  // Seed geo data after migrations
  const { seedGeoData } = await import('../lib/geo/seed');
  await seedGeoData();
}

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  // Create migrations tracker if it doesn't exist
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      ran_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const migrations: { name: string; sql: string }[] = [
    { name: '004_nina_tables', sql: NINA_TABLES_SQL },
    { name: '005_fix_constraints', sql: FIX_CONSTRAINTS_SQL },
  ];

  for (const migration of migrations) {
    const existing = await database.getFirstAsync<{ id: number }>(
      'SELECT id FROM _migrations WHERE name = ?',
      [migration.name]
    );
    if (!existing) {
      await database.execAsync(migration.sql);
      await database.runAsync(
        'INSERT INTO _migrations (name) VALUES (?)',
        [migration.name]
      );
      console.log(`[DB] Migration applied: ${migration.name}`);
    }
  }
}

// ─── 005_fix_constraints ──────────────────────────────────────────────────────
// Recreates nina_respondents and nina_relief_items with proper UNIQUE constraints
// that were missing in the initial migration. Safe to run on existing data.
const FIX_CONSTRAINTS_SQL = `
CREATE TABLE IF NOT EXISTS nina_respondents_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES nina_assessments(id),
  seq           INTEGER NOT NULL,
  name          TEXT,
  designation   TEXT,
  office_agency TEXT,
  contact       TEXT,
  UNIQUE(assessment_id, seq)
);
INSERT OR IGNORE INTO nina_respondents_new
  SELECT id, assessment_id, seq, name, designation, office_agency, contact
  FROM nina_respondents;
DROP TABLE nina_respondents;
ALTER TABLE nina_respondents_new RENAME TO nina_respondents;

CREATE TABLE IF NOT EXISTS nina_relief_items_new (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES nina_assessments(id),
  item_type     TEXT NOT NULL,
  received      INTEGER DEFAULT 0,
  has_gap       INTEGER DEFAULT 0,
  org_name      TEXT,
  UNIQUE(assessment_id, item_type)
);
INSERT OR IGNORE INTO nina_relief_items_new
  SELECT id, assessment_id, item_type, received, has_gap, org_name
  FROM nina_relief_items;
DROP TABLE nina_relief_items;
ALTER TABLE nina_relief_items_new RENAME TO nina_relief_items;
`;
const NINA_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS nina_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  disaster_type TEXT NOT NULL,
  disaster_name TEXT NOT NULL,
  onset_date    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nina_assessments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id      INTEGER NOT NULL REFERENCES nina_events(id),
  team_number   INTEGER NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'draft',
  submitted_at  TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS nina_geo_team (
  assessment_id       INTEGER PRIMARY KEY REFERENCES nina_assessments(id),
  region              TEXT,
  province            TEXT,
  municipality        TEXT,
  barangay            TEXT,
  evacuation_center   TEXT,
  date_of_assessment  TEXT,
  team_leader_name    TEXT,
  team_leader_desig   TEXT,
  team_leader_agency  TEXT,
  team_leader_contact TEXT,
  alt_contact_name    TEXT,
  alt_contact_number  TEXT
);

CREATE TABLE IF NOT EXISTS nina_respondents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES nina_assessments(id),
  seq           INTEGER NOT NULL,
  name          TEXT,
  designation   TEXT,
  office_agency TEXT,
  contact       TEXT,
  UNIQUE(assessment_id, seq)
);

CREATE TABLE IF NOT EXISTS nina_demographics (
  assessment_id      INTEGER PRIMARY KEY REFERENCES nina_assessments(id),
  all_ages_male      INTEGER DEFAULT 0,
  all_ages_female    INTEGER DEFAULT 0,
  u6mo_male          INTEGER DEFAULT 0,
  u6mo_female        INTEGER DEFAULT 0,
  m6to23_male        INTEGER DEFAULT 0,
  m6to23_female      INTEGER DEFAULT 0,
  m24to59_male       INTEGER DEFAULT 0,
  m24to59_female     INTEGER DEFAULT 0,
  y60up_male         INTEGER DEFAULT 0,
  y60up_female       INTEGER DEFAULT 0,
  pwd_male           INTEGER DEFAULT 0,
  pwd_female         INTEGER DEFAULT 0,
  pregnant_total     INTEGER DEFAULT 0,
  pregnant_tri1_2    INTEGER DEFAULT 0,
  pregnant_tri3      INTEGER DEFAULT 0,
  lactating          INTEGER DEFAULT 0,
  female_adolescents INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nina_iycf_services (
  assessment_id            INTEGER PRIMARY KEY REFERENCES nina_assessments(id),
  has_bf_area              INTEGER DEFAULT 0,
  bf_area_count            INTEGER DEFAULT 0,
  has_comm_kitchen         INTEGER DEFAULT 0,
  comm_kitchen_count       INTEGER DEFAULT 0,
  has_iycf_support_group   INTEGER DEFAULT 0,
  iycf_support_group_count INTEGER DEFAULT 0,
  has_milk_bank            INTEGER DEFAULT 0,
  milk_bank_count          INTEGER DEFAULT 0,
  has_bms_donations        INTEGER DEFAULT 0,
  bms_donor_name           TEXT,
  bms_actions_done         TEXT
);

CREATE TABLE IF NOT EXISTS nina_supplies (
  assessment_id          INTEGER PRIMARY KEY REFERENCES nina_assessments(id),
  iycf_counselling_cards INTEGER DEFAULT 0,
  bf_flipcharts          INTEGER DEFAULT 0,
  eo51_posters           INTEGER DEFAULT 0,
  bf_iycf_kits           INTEGER DEFAULT 0,
  vita_100iu             INTEGER DEFAULT 0,
  vita_200iu             INTEGER DEFAULT 0,
  mnp_sachets            INTEGER DEFAULT 0,
  iron_drops             INTEGER DEFAULT 0,
  iron_200mg_fa400       INTEGER DEFAULT 0,
  iron_60mg_fa28         INTEGER DEFAULT 0,
  iron_syrup             INTEGER DEFAULT 0,
  ors_sachets            INTEGER DEFAULT 0,
  zinc_drops_syrup       INTEGER DEFAULT 0,
  other_supplies         TEXT
);

CREATE TABLE IF NOT EXISTS nina_tools (
  assessment_id        INTEGER PRIMARY KEY REFERENCES nina_assessments(id),
  muac_children        INTEGER DEFAULT 0,
  muac_adults          INTEGER DEFAULT 0,
  infant_scale         INTEGER DEFAULT 0,
  adult_scale          INTEGER DEFAULT 0,
  length_height_board  INTEGER DEFAULT 0,
  wfl_reference_table  INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nina_mam (
  assessment_id     INTEGER PRIMARY KEY REFERENCES nina_assessments(id),
  rusf_tubs         INTEGER DEFAULT 0,
  rusf_sachets      INTEGER DEFAULT 0,
  rutf_sachets      INTEGER DEFAULT 0,
  f75_sachets_cans  INTEGER DEFAULT 0,
  f100_sachets_cans INTEGER DEFAULT 0,
  resomal_sachets   INTEGER DEFAULT 0,
  heb_sachets       INTEGER DEFAULT 0,
  other_commodities TEXT
);

CREATE TABLE IF NOT EXISTS nina_relief (
  assessment_id           INTEGER PRIMARY KEY REFERENCES nina_assessments(id),
  has_accessible_market   INTEGER DEFAULT 0,
  diarrhea_children_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS nina_relief_items (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  assessment_id INTEGER NOT NULL REFERENCES nina_assessments(id),
  item_type     TEXT NOT NULL,
  received      INTEGER DEFAULT 0,
  has_gap       INTEGER DEFAULT 0,
  org_name      TEXT,
  UNIQUE(assessment_id, item_type)
);

CREATE TABLE IF NOT EXISTS nina_notes (
  assessment_id INTEGER PRIMARY KEY REFERENCES nina_assessments(id),
  overall_notes TEXT
);

CREATE TABLE IF NOT EXISTS geo_regions (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS geo_provinces (
  id        INTEGER PRIMARY KEY,
  region_id INTEGER,
  name      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS geo_municipalities (
  id          INTEGER PRIMARY KEY,
  province_id INTEGER,
  name        TEXT NOT NULL
);
`;
