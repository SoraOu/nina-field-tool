/**
 * db/queries/nina.ts
 * All NINA read/write queries. Pure data layer — no UI imports.
 */
import { getDb } from '../database';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssessmentStatus = 'draft' | 'complete' | 'submitted';

export interface NinaEvent {
  id: number;
  disaster_type: string;
  disaster_name: string;
  onset_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface NinaAssessment {
  id: number;
  event_id: number;
  team_number: number;
  status: AssessmentStatus;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NinaGeoTeam {
  assessment_id: number;
  region: string | null;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
  evacuation_center: string | null;
  date_of_assessment: string | null;
  team_leader_name: string | null;
  team_leader_desig: string | null;
  team_leader_agency: string | null;
  team_leader_contact: string | null;
  alt_contact_name: string | null;
  alt_contact_number: string | null;
}

export interface NinaRespondent {
  id: number;
  assessment_id: number;
  seq: number;
  name: string | null;
  designation: string | null;
  office_agency: string | null;
  contact: string | null;
}

export interface NinaDemographics {
  assessment_id: number;
  all_ages_male: number;
  all_ages_female: number;
  u6mo_male: number;
  u6mo_female: number;
  m6to23_male: number;
  m6to23_female: number;
  m24to59_male: number;
  m24to59_female: number;
  y60up_male: number;
  y60up_female: number;
  pwd_male: number;
  pwd_female: number;
  pregnant_total: number;
  pregnant_tri1_2: number;
  pregnant_tri3: number;
  lactating: number;
  female_adolescents: number;
}

export interface NinaIycfServices {
  assessment_id: number;
  has_bf_area: number;
  bf_area_count: number;
  has_comm_kitchen: number;
  comm_kitchen_count: number;
  has_iycf_support_group: number;
  iycf_support_group_count: number;
  has_milk_bank: number;
  milk_bank_count: number;
  has_bms_donations: number;
  bms_donor_name: string | null;
  bms_actions_done: string | null;
}

export interface NinaSupplies {
  assessment_id: number;
  iycf_counselling_cards: number;
  bf_flipcharts: number;
  eo51_posters: number;
  bf_iycf_kits: number;
  vita_100iu: number;
  vita_200iu: number;
  mnp_sachets: number;
  iron_drops: number;
  iron_200mg_fa400: number;
  iron_60mg_fa28: number;
  iron_syrup: number;
  ors_sachets: number;
  zinc_drops_syrup: number;
  other_supplies: string | null;
}

export interface NinaTools {
  assessment_id: number;
  muac_children: number;
  muac_adults: number;
  infant_scale: number;
  adult_scale: number;
  length_height_board: number;
  wfl_reference_table: number;
}

export interface NinaMam {
  assessment_id: number;
  rusf_tubs: number;
  rusf_sachets: number;
  rutf_sachets: number;
  f75_sachets_cans: number;
  f100_sachets_cans: number;
  resomal_sachets: number;
  heb_sachets: number;
  other_commodities: string | null;
}

export interface NinaRelief {
  assessment_id: number;
  has_accessible_market: number;
  diarrhea_children_count: number;
}

export interface NinaReliefItem {
  id: number;
  assessment_id: number;
  item_type: string;
  received: number;
  has_gap: number;
  org_name: string | null;
}

export interface NinaNotes {
  assessment_id: number;
  overall_notes: string | null;
}

// ─── Events ───────────────────────────────────────────────────────────────────

export async function getAllEvents(): Promise<NinaEvent[]> {
  const db = getDb();
  return db.getAllAsync<NinaEvent>(
    'SELECT * FROM nina_events ORDER BY created_at DESC'
  );
}

export async function getEvent(id: number): Promise<NinaEvent | null> {
  const db = getDb();
  return db.getFirstAsync<NinaEvent>(
    'SELECT * FROM nina_events WHERE id = ?',
    [id]
  );
}

export async function createEvent(
  disaster_type: string,
  disaster_name: string,
  onset_date: string | null
): Promise<number> {
  const db = getDb();
  const result = await db.runAsync(
    'INSERT INTO nina_events (disaster_type, disaster_name, onset_date) VALUES (?, ?, ?)',
    [disaster_type, disaster_name, onset_date]
  );
  return result.lastInsertRowId;
}

export async function updateEvent(
  id: number,
  disaster_type: string,
  disaster_name: string,
  onset_date: string | null
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE nina_events
     SET disaster_type = ?, disaster_name = ?, onset_date = ?,
         updated_at = datetime('now')
     WHERE id = ?`,
    [disaster_type, disaster_name, onset_date, id]
  );
}

// ─── Assessments ──────────────────────────────────────────────────────────────

export async function getAssessmentsForEvent(
  event_id: number
): Promise<NinaAssessment[]> {
  const db = getDb();
  return db.getAllAsync<NinaAssessment>(
    'SELECT * FROM nina_assessments WHERE event_id = ? ORDER BY team_number',
    [event_id]
  );
}

export async function getAssessment(id: number): Promise<NinaAssessment | null> {
  const db = getDb();
  return db.getFirstAsync<NinaAssessment>(
    'SELECT * FROM nina_assessments WHERE id = ?',
    [id]
  );
}

export async function createAssessment(
  event_id: number,
  team_number: number
): Promise<number> {
  const db = getDb();
  const result = await db.runAsync(
    'INSERT INTO nina_assessments (event_id, team_number) VALUES (?, ?)',
    [event_id, team_number]
  );
  const assessmentId = result.lastInsertRowId;

  // Seed default empty rows for every section table
  await db.runAsync(
    'INSERT OR IGNORE INTO nina_geo_team (assessment_id) VALUES (?)',
    [assessmentId]
  );
  await db.runAsync(
    'INSERT OR IGNORE INTO nina_demographics (assessment_id) VALUES (?)',
    [assessmentId]
  );
  await db.runAsync(
    'INSERT OR IGNORE INTO nina_iycf_services (assessment_id) VALUES (?)',
    [assessmentId]
  );
  await db.runAsync(
    'INSERT OR IGNORE INTO nina_supplies (assessment_id) VALUES (?)',
    [assessmentId]
  );
  await db.runAsync(
    'INSERT OR IGNORE INTO nina_tools (assessment_id) VALUES (?)',
    [assessmentId]
  );
  await db.runAsync(
    'INSERT OR IGNORE INTO nina_mam (assessment_id) VALUES (?)',
    [assessmentId]
  );
  await db.runAsync(
    'INSERT OR IGNORE INTO nina_relief (assessment_id) VALUES (?)',
    [assessmentId]
  );
  await db.runAsync(
    'INSERT OR IGNORE INTO nina_notes (assessment_id) VALUES (?)',
    [assessmentId]
  );

  // Seed 7 relief items
  const reliefItems = [
    'food', 'water', 'hygiene', 'toilet', 'utensils', 'clothing', 'shelter',
  ];
  for (const item_type of reliefItems) {
    await db.runAsync(
      'INSERT OR IGNORE INTO nina_relief_items (assessment_id, item_type) VALUES (?, ?)',
      [assessmentId, item_type]
    );
  }

  return assessmentId;
}

export async function updateAssessmentStatus(
  id: number,
  status: AssessmentStatus,
  submitted_at?: string
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE nina_assessments
     SET status = ?, submitted_at = ?, updated_at = datetime('now')
     WHERE id = ?`,
    [status, submitted_at ?? null, id]
  );
}

// ─── Section 2: Geo + Team ────────────────────────────────────────────────────

export async function getGeoTeam(
  assessment_id: number
): Promise<NinaGeoTeam | null> {
  const db = getDb();
  return db.getFirstAsync<NinaGeoTeam>(
    'SELECT * FROM nina_geo_team WHERE assessment_id = ?',
    [assessment_id]
  );
}

export async function upsertGeoTeam(data: NinaGeoTeam): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO nina_geo_team
       (assessment_id, region, province, municipality, barangay, evacuation_center,
        date_of_assessment, team_leader_name, team_leader_desig, team_leader_agency,
        team_leader_contact, alt_contact_name, alt_contact_number)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(assessment_id) DO UPDATE SET
       region              = excluded.region,
       province            = excluded.province,
       municipality        = excluded.municipality,
       barangay            = excluded.barangay,
       evacuation_center   = excluded.evacuation_center,
       date_of_assessment  = excluded.date_of_assessment,
       team_leader_name    = excluded.team_leader_name,
       team_leader_desig   = excluded.team_leader_desig,
       team_leader_agency  = excluded.team_leader_agency,
       team_leader_contact = excluded.team_leader_contact,
       alt_contact_name    = excluded.alt_contact_name,
       alt_contact_number  = excluded.alt_contact_number`,
    [
      data.assessment_id, data.region, data.province, data.municipality,
      data.barangay, data.evacuation_center, data.date_of_assessment,
      data.team_leader_name, data.team_leader_desig, data.team_leader_agency,
      data.team_leader_contact, data.alt_contact_name, data.alt_contact_number,
    ]
  );
}

// ─── Section 3: Respondents ───────────────────────────────────────────────────

export async function getRespondents(
  assessment_id: number
): Promise<NinaRespondent[]> {
  const db = getDb();
  return db.getAllAsync<NinaRespondent>(
    'SELECT * FROM nina_respondents WHERE assessment_id = ? ORDER BY seq',
    [assessment_id]
  );
}

export async function upsertRespondent(
  assessment_id: number,
  seq: number,
  name: string | null,
  designation: string | null,
  office_agency: string | null,
  contact: string | null
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO nina_respondents (assessment_id, seq, name, designation, office_agency, contact)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(assessment_id, seq) DO UPDATE SET
       name          = excluded.name,
       designation   = excluded.designation,
       office_agency = excluded.office_agency,
       contact       = excluded.contact`,
    [assessment_id, seq, name, designation, office_agency, contact]
  );
}

export async function deleteRespondent(
  assessment_id: number,
  seq: number
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    'DELETE FROM nina_respondents WHERE assessment_id = ? AND seq = ?',
    [assessment_id, seq]
  );
}

// ─── Section 4: Demographics ──────────────────────────────────────────────────

export async function getDemographics(
  assessment_id: number
): Promise<NinaDemographics | null> {
  const db = getDb();
  return db.getFirstAsync<NinaDemographics>(
    'SELECT * FROM nina_demographics WHERE assessment_id = ?',
    [assessment_id]
  );
}

export async function upsertDemographics(data: NinaDemographics): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO nina_demographics VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(assessment_id) DO UPDATE SET
       all_ages_male      = excluded.all_ages_male,
       all_ages_female    = excluded.all_ages_female,
       u6mo_male          = excluded.u6mo_male,
       u6mo_female        = excluded.u6mo_female,
       m6to23_male        = excluded.m6to23_male,
       m6to23_female      = excluded.m6to23_female,
       m24to59_male       = excluded.m24to59_male,
       m24to59_female     = excluded.m24to59_female,
       y60up_male         = excluded.y60up_male,
       y60up_female       = excluded.y60up_female,
       pwd_male           = excluded.pwd_male,
       pwd_female         = excluded.pwd_female,
       pregnant_total     = excluded.pregnant_total,
       pregnant_tri1_2    = excluded.pregnant_tri1_2,
       pregnant_tri3      = excluded.pregnant_tri3,
       lactating          = excluded.lactating,
       female_adolescents = excluded.female_adolescents`,
    [
      data.assessment_id,
      data.all_ages_male, data.all_ages_female,
      data.u6mo_male, data.u6mo_female,
      data.m6to23_male, data.m6to23_female,
      data.m24to59_male, data.m24to59_female,
      data.y60up_male, data.y60up_female,
      data.pwd_male, data.pwd_female,
      data.pregnant_total, data.pregnant_tri1_2, data.pregnant_tri3,
      data.lactating, data.female_adolescents,
    ]
  );
}

// ─── Section 5: IYCF Services ─────────────────────────────────────────────────

export async function getIycfServices(
  assessment_id: number
): Promise<NinaIycfServices | null> {
  const db = getDb();
  return db.getFirstAsync<NinaIycfServices>(
    'SELECT * FROM nina_iycf_services WHERE assessment_id = ?',
    [assessment_id]
  );
}

export async function upsertIycfServices(data: NinaIycfServices): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO nina_iycf_services VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(assessment_id) DO UPDATE SET
       has_bf_area              = excluded.has_bf_area,
       bf_area_count            = excluded.bf_area_count,
       has_comm_kitchen         = excluded.has_comm_kitchen,
       comm_kitchen_count       = excluded.comm_kitchen_count,
       has_iycf_support_group   = excluded.has_iycf_support_group,
       iycf_support_group_count = excluded.iycf_support_group_count,
       has_milk_bank            = excluded.has_milk_bank,
       milk_bank_count          = excluded.milk_bank_count,
       has_bms_donations        = excluded.has_bms_donations,
       bms_donor_name           = excluded.bms_donor_name,
       bms_actions_done         = excluded.bms_actions_done`,
    [
      data.assessment_id,
      data.has_bf_area, data.bf_area_count,
      data.has_comm_kitchen, data.comm_kitchen_count,
      data.has_iycf_support_group, data.iycf_support_group_count,
      data.has_milk_bank, data.milk_bank_count,
      data.has_bms_donations, data.bms_donor_name, data.bms_actions_done,
    ]
  );
}

// ─── Section 5: Supplies ──────────────────────────────────────────────────────

export async function getSupplies(
  assessment_id: number
): Promise<NinaSupplies | null> {
  const db = getDb();
  return db.getFirstAsync<NinaSupplies>(
    'SELECT * FROM nina_supplies WHERE assessment_id = ?',
    [assessment_id]
  );
}

export async function upsertSupplies(data: NinaSupplies): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO nina_supplies VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(assessment_id) DO UPDATE SET
       iycf_counselling_cards = excluded.iycf_counselling_cards,
       bf_flipcharts          = excluded.bf_flipcharts,
       eo51_posters           = excluded.eo51_posters,
       bf_iycf_kits           = excluded.bf_iycf_kits,
       vita_100iu             = excluded.vita_100iu,
       vita_200iu             = excluded.vita_200iu,
       mnp_sachets            = excluded.mnp_sachets,
       iron_drops             = excluded.iron_drops,
       iron_200mg_fa400       = excluded.iron_200mg_fa400,
       iron_60mg_fa28         = excluded.iron_60mg_fa28,
       iron_syrup             = excluded.iron_syrup,
       ors_sachets            = excluded.ors_sachets,
       zinc_drops_syrup       = excluded.zinc_drops_syrup,
       other_supplies         = excluded.other_supplies`,
    [
      data.assessment_id,
      data.iycf_counselling_cards, data.bf_flipcharts, data.eo51_posters, data.bf_iycf_kits,
      data.vita_100iu, data.vita_200iu, data.mnp_sachets, data.iron_drops,
      data.iron_200mg_fa400, data.iron_60mg_fa28, data.iron_syrup,
      data.ors_sachets, data.zinc_drops_syrup, data.other_supplies,
    ]
  );
}

// ─── Section 6: Tools ─────────────────────────────────────────────────────────

export async function getTools(
  assessment_id: number
): Promise<NinaTools | null> {
  const db = getDb();
  return db.getFirstAsync<NinaTools>(
    'SELECT * FROM nina_tools WHERE assessment_id = ?',
    [assessment_id]
  );
}

export async function upsertTools(data: NinaTools): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO nina_tools VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(assessment_id) DO UPDATE SET
       muac_children       = excluded.muac_children,
       muac_adults         = excluded.muac_adults,
       infant_scale        = excluded.infant_scale,
       adult_scale         = excluded.adult_scale,
       length_height_board = excluded.length_height_board,
       wfl_reference_table = excluded.wfl_reference_table`,
    [
      data.assessment_id,
      data.muac_children, data.muac_adults,
      data.infant_scale, data.adult_scale,
      data.length_height_board, data.wfl_reference_table,
    ]
  );
}

// ─── Section 6: MAM ───────────────────────────────────────────────────────────

export async function getMam(assessment_id: number): Promise<NinaMam | null> {
  const db = getDb();
  return db.getFirstAsync<NinaMam>(
    'SELECT * FROM nina_mam WHERE assessment_id = ?',
    [assessment_id]
  );
}

export async function upsertMam(data: NinaMam): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO nina_mam VALUES (?,?,?,?,?,?,?,?,?)
     ON CONFLICT(assessment_id) DO UPDATE SET
       rusf_tubs         = excluded.rusf_tubs,
       rusf_sachets      = excluded.rusf_sachets,
       rutf_sachets      = excluded.rutf_sachets,
       f75_sachets_cans  = excluded.f75_sachets_cans,
       f100_sachets_cans = excluded.f100_sachets_cans,
       resomal_sachets   = excluded.resomal_sachets,
       heb_sachets       = excluded.heb_sachets,
       other_commodities = excluded.other_commodities`,
    [
      data.assessment_id,
      data.rusf_tubs, data.rusf_sachets, data.rutf_sachets,
      data.f75_sachets_cans, data.f100_sachets_cans,
      data.resomal_sachets, data.heb_sachets, data.other_commodities,
    ]
  );
}

// ─── Section 7: Relief ────────────────────────────────────────────────────────

export async function getRelief(
  assessment_id: number
): Promise<NinaRelief | null> {
  const db = getDb();
  return db.getFirstAsync<NinaRelief>(
    'SELECT * FROM nina_relief WHERE assessment_id = ?',
    [assessment_id]
  );
}

export async function upsertRelief(data: NinaRelief): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO nina_relief VALUES (?,?,?)
     ON CONFLICT(assessment_id) DO UPDATE SET
       has_accessible_market   = excluded.has_accessible_market,
       diarrhea_children_count = excluded.diarrhea_children_count`,
    [data.assessment_id, data.has_accessible_market, data.diarrhea_children_count]
  );
}

export async function getReliefItems(
  assessment_id: number
): Promise<NinaReliefItem[]> {
  const db = getDb();
  return db.getAllAsync<NinaReliefItem>(
    'SELECT * FROM nina_relief_items WHERE assessment_id = ? ORDER BY id',
    [assessment_id]
  );
}

export async function upsertReliefItem(
  assessment_id: number,
  item_type: string,
  received: number,
  has_gap: number,
  org_name: string | null
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `UPDATE nina_relief_items
     SET received = ?, has_gap = ?, org_name = ?
     WHERE assessment_id = ? AND item_type = ?`,
    [received, has_gap, org_name, assessment_id, item_type]
  );
}

// ─── Section 7: Notes ─────────────────────────────────────────────────────────

export async function getNotes(
  assessment_id: number
): Promise<NinaNotes | null> {
  const db = getDb();
  return db.getFirstAsync<NinaNotes>(
    'SELECT * FROM nina_notes WHERE assessment_id = ?',
    [assessment_id]
  );
}

export async function upsertNotes(
  assessment_id: number,
  overall_notes: string | null
): Promise<void> {
  const db = getDb();
  await db.runAsync(
    `INSERT INTO nina_notes (assessment_id, overall_notes) VALUES (?, ?)
     ON CONFLICT(assessment_id) DO UPDATE SET overall_notes = excluded.overall_notes`,
    [assessment_id, overall_notes]
  );
}

// ─── Geo lookups ──────────────────────────────────────────────────────────────

export interface GeoRegion   { id: number; name: string; }
export interface GeoProvince { id: number; region_id: number; name: string; }
export interface GeoMunicipality { id: number; province_id: number; name: string; }

export async function getRegions(): Promise<GeoRegion[]> {
  const db = getDb();
  return db.getAllAsync<GeoRegion>('SELECT * FROM geo_regions ORDER BY name');
}

export async function getProvinces(region_id: number): Promise<GeoProvince[]> {
  const db = getDb();
  return db.getAllAsync<GeoProvince>(
    'SELECT * FROM geo_provinces WHERE region_id = ? ORDER BY name',
    [region_id]
  );
}

export async function getMunicipalities(province_id: number): Promise<GeoMunicipality[]> {
  const db = getDb();
  return db.getAllAsync<GeoMunicipality>(
    'SELECT * FROM geo_municipalities WHERE province_id = ? ORDER BY name',
    [province_id]
  );
}

// ─── Delete event + all child data ────────────────────────────────────────────

export async function deleteEvent(event_id: number): Promise<void> {
  const db = getDb();
  const assessments = await db.getAllAsync<{ id: number }>(
    'SELECT id FROM nina_assessments WHERE event_id = ?',
    [event_id]
  );
  for (const a of assessments) {
    const aid = a.id;
    await db.runAsync('DELETE FROM nina_geo_team      WHERE assessment_id = ?', [aid]);
    await db.runAsync('DELETE FROM nina_respondents   WHERE assessment_id = ?', [aid]);
    await db.runAsync('DELETE FROM nina_demographics  WHERE assessment_id = ?', [aid]);
    await db.runAsync('DELETE FROM nina_iycf_services WHERE assessment_id = ?', [aid]);
    await db.runAsync('DELETE FROM nina_supplies      WHERE assessment_id = ?', [aid]);
    await db.runAsync('DELETE FROM nina_tools         WHERE assessment_id = ?', [aid]);
    await db.runAsync('DELETE FROM nina_mam           WHERE assessment_id = ?', [aid]);
    await db.runAsync('DELETE FROM nina_relief        WHERE assessment_id = ?', [aid]);
    await db.runAsync('DELETE FROM nina_relief_items  WHERE assessment_id = ?', [aid]);
    await db.runAsync('DELETE FROM nina_notes         WHERE assessment_id = ?', [aid]);
  }
  await db.runAsync('DELETE FROM nina_assessments WHERE event_id = ?', [event_id]);
  await db.runAsync('DELETE FROM nina_events      WHERE id = ?',       [event_id]);
}

// ─── Smart resume: returns first incomplete section number (1–7) ──────────────

export async function getAssessmentProgress(assessment_id: number): Promise<number> {
  const db = getDb();

  // S1: disaster name filled
  const s1 = await db.getFirstAsync<{ disaster_name: string | null }>(
    `SELECT e.disaster_name FROM nina_events e
     JOIN nina_assessments a ON a.event_id = e.id
     WHERE a.id = ?`,
    [assessment_id]
  );
  if (!s1?.disaster_name) return 1;

  // S2: municipality filled
  const s2 = await db.getFirstAsync<{ municipality: string | null }>(
    'SELECT municipality FROM nina_geo_team WHERE assessment_id = ?',
    [assessment_id]
  );
  if (!s2?.municipality) return 2;

  // S3: at least one respondent with a name
  const s3 = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM nina_respondents WHERE assessment_id = ? AND name IS NOT NULL AND name != ""',
    [assessment_id]
  );
  if (!s3 || s3.cnt === 0) return 3;

  // S4: all_ages total > 0
  const s4 = await db.getFirstAsync<{ total: number }>(
    'SELECT (all_ages_male + all_ages_female) as total FROM nina_demographics WHERE assessment_id = ?',
    [assessment_id]
  );
  if (!s4 || s4.total === 0) return 4;

  // S5: iycf row exists
  const s5 = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM nina_iycf_services WHERE assessment_id = ?',
    [assessment_id]
  );
  if (!s5 || s5.cnt === 0) return 5;

  // S6: tools row exists
  const s6 = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM nina_tools WHERE assessment_id = ?',
    [assessment_id]
  );
  if (!s6 || s6.cnt === 0) return 6;

  // S7: relief row exists
  const s7 = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM nina_relief WHERE assessment_id = ?',
    [assessment_id]
  );
  if (!s7 || s7.cnt === 0) return 7;

  return 7; // all sections touched → land on last section (or you can return 8 to go to review)
}

// ─── Delete a single assessment + its section data ────────────────────────────

export async function deleteAssessment(assessment_id: number): Promise<void> {
  const db = getDb();
  await db.runAsync('DELETE FROM nina_geo_team      WHERE assessment_id = ?', [assessment_id]);
  await db.runAsync('DELETE FROM nina_respondents   WHERE assessment_id = ?', [assessment_id]);
  await db.runAsync('DELETE FROM nina_demographics  WHERE assessment_id = ?', [assessment_id]);
  await db.runAsync('DELETE FROM nina_iycf_services WHERE assessment_id = ?', [assessment_id]);
  await db.runAsync('DELETE FROM nina_supplies      WHERE assessment_id = ?', [assessment_id]);
  await db.runAsync('DELETE FROM nina_tools         WHERE assessment_id = ?', [assessment_id]);
  await db.runAsync('DELETE FROM nina_mam           WHERE assessment_id = ?', [assessment_id]);
  await db.runAsync('DELETE FROM nina_relief        WHERE assessment_id = ?', [assessment_id]);
  await db.runAsync('DELETE FROM nina_relief_items  WHERE assessment_id = ?', [assessment_id]);
  await db.runAsync('DELETE FROM nina_notes         WHERE assessment_id = ?', [assessment_id]);
  await db.runAsync('DELETE FROM nina_assessments   WHERE id = ?',            [assessment_id]);
}
