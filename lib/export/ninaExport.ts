/**
 * lib/export/ninaExport.ts
 *
 * Exports a NINA assessment as an .xlsx file whose rows and columns mirror
 * the official NNC "NINA Consolidation Tool" template exactly.
 *
 * Layout:
 *   Col A  – component / question label  (same text as template col A)
 *   Col B  – sub-label / field name       (same text as template col B)
 *   Col C  – this assessment's data       (Team N column in the template)
 *
 * HOW TO PASTE INTO THE TEMPLATE:
 *   1. Open this exported file.
 *   2. Click on cell C1 (the very first cell of column C).
 *   3. Press Ctrl+Shift+End to select down to the last row (C202).
 *   4. Copy (Ctrl+C).
 *   5. Open the NINA Consolidation Tool (.xlsm).
 *   6. Click the correct team column at row 1:
 *        Team 1 = C1, Team 2 = D1, Team 3 = E1, Team 4 = F1, Team 5 = G1
 *   7. Paste Special: Ctrl+Alt+V → check "Skip Blanks" → OK.
 *   Rows that are locked in the template are intentionally blank here —
 *   Skip Blanks ensures Excel never tries to write into them.
 */
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import {
  getEvent, getAssessment, getGeoTeam,
  getRespondents, getDemographics,
  getIycfServices, getSupplies,
  getTools, getMam,
  getRelief, getReliefItems, getNotes,
} from '@/db/queries/nina';

// ─── Types ───────────────────────────────────────────────────────────────────

type Cell = string | number | null;
type Row  = [Cell, Cell, Cell];   // [colA, colB, colC]

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns "Yes" / null for the "Yes" row of a yes/no pair. */
const yRow = (v: number | boolean | null | undefined): 'Yes' | null =>
  v ? 'Yes' : null;

/** Returns "No" / null for the "No" row of a yes/no pair. */
const nRow = (v: number | boolean | null | undefined): 'No' | null =>
  v ? null : 'No';

/** Coerces a nullable number to a number (0 if absent). */
const n = (v: number | null | undefined): number => v ?? 0;

/** Coerces a nullable string to a string ('' if absent). */
const s = (v: string | null | undefined): string => v ?? '';

// ─── Locked rows in the template (0-based index into rows[]) ─────────────────
//
// These correspond to section headers and label rows in the official .xlsm
// that are protected. Col C is intentionally null for these rows so that
// Paste Special → Skip Blanks never attempts to write into a locked cell.
//
const LOCKED_INDICES = new Set([
  0, 1, 4, 5, 11, 18, 31, 34, 37, 40, 43, 46, 49, 52,
  55, 56, 57, 59, 60, 62, 63, 65, 66, 68, 69, 72, 73, 74,
  76, 77, 79, 80, 82, 83, 89, 90, 91, 93, 94, 96, 97, 99,
  100, 102, 103, 105, 106, 108, 109, 111, 112, 114, 115,
  122, 123, 125, 126, 128, 129, 131, 132, 134, 135, 137,
  138, 140, 141, 142, 144, 145, 147, 148, 150, 151, 153,
  154, 156, 157, 159, 160, 166, 201,
]);

/** Returns colC value only if this row index is unlocked in the template. */
const cell = (idx: number, value: Cell): Cell =>
  LOCKED_INDICES.has(idx) ? null : value;

// ─── Main export ─────────────────────────────────────────────────────────────

export async function exportAssessment(
  assessmentId: number,
  eventId: number
): Promise<void> {

  // ── Load all data ──────────────────────────────────────────────────────────
  const [
    event, assessment, geo, respondents, demo,
    iycf, supplies, tools, mam, relief, reliefItems, notes,
  ] = await Promise.all([
    getEvent(eventId),
    getAssessment(assessmentId),
    getGeoTeam(assessmentId),
    getRespondents(assessmentId),
    getDemographics(assessmentId),
    getIycfServices(assessmentId),
    getSupplies(assessmentId),
    getTools(assessmentId),
    getMam(assessmentId),
    getRelief(assessmentId),
    getReliefItems(assessmentId),
    getNotes(assessmentId),
  ]);

  // ── Relief item lookup ─────────────────────────────────────────────────────
  const ri = (type: string, field: 'received' | 'has_gap' | 'org_name'): Cell => {
    const item = reliefItems.find((i) => i.item_type === type);
    if (!item) return field === 'org_name' ? null : null;
    const val = item[field];
    if (field === 'org_name') return s(val as string | null);
    return val as number | null;
  };
  const riYes  = (type: string) => yRow(ri(type, 'received') as number | null);
  const riNo   = (type: string) => nRow(ri(type, 'received') as number | null);
  const riGap  = (type: string) =>
    (ri(type, 'has_gap') as number | null) ? 'Gap' : null;
  const riOrg  = (type: string) => ri(type, 'org_name') as string | null;

  // ── Respondent helpers ─────────────────────────────────────────────────────
  const r = (idx: number, field: 'name' | 'designation' | 'office_agency' | 'contact'): string =>
    s(respondents[idx]?.[field]);

  // ── Supply yes/no helpers ──────────────────────────────────────────────────
  const supYes = (v: number | null | undefined) => yRow(n(v) > 0 ? 1 : 0);
  const supNo  = (v: number | null | undefined) => nRow(n(v) > 0 ? 1 : 0);

  // ── Team label for column header ───────────────────────────────────────────
  const teamLabel = `Team ${assessment?.team_number ?? 1} – ${s(event?.disaster_name)}`;

  // ─── 202-row sheet (1 blank + 201 data rows to align with template) ────────
  //
  // Row 0 (index 0): blank — aligns app row 1 with template row 2.
  // Rows 1–201 match template rows 2–202.
  //
  // Col C is null for any row whose index is in LOCKED_INDICES.
  // Use "Paste Special → Skip Blanks" when pasting into the template.
  //
  const i = (idx: number, value: Cell): Cell => cell(idx, value);

  const rows: Row[] = [
    // 0 — blank alignment row (template row 1 is empty)
    [null, null, null],
    // 1
    ['Emergency/Disaster Information',         null,                                         i(1,  null)],
    // 2
    ['Type of Emergency/Disaster',             null,                                         i(2,  s(event?.disaster_type))],
    // 3
    ['Name of Emergency/Disaster (specify)',   null,                                         i(3,  s(event?.disaster_name))],
    // 4 — column header row; col C carries the team identifier
    ['COMPONENTS',                             'Team 1 / Team 2 / Team 3 / Team 4 / Team 5', i(4, teamLabel)],
    // 5
    ['Geographic Information',                 null,                                         i(5,  null)],
    // 6
    ['Region',                                 null,                                         i(6,  s(geo?.region))],
    // 7
    ['Province',                               null,                                         i(7,  s(geo?.province))],
    // 8
    ['City/Municipality',                      null,                                         i(8,  s(geo?.municipality))],
    // 9
    ['Barangay(s)',                             null,                                         i(9,  s(geo?.barangay))],
    // 10
    ['Evacuation Center(s)',                   null,                                         i(10, s(geo?.evacuation_center))],
    // 11
    ['Assessment Team Information',            null,                                         i(11, null)],
    // 12
    ['Date of Assessment',                     null,                                         i(12, s(geo?.date_of_assessment))],
    // 13
    ['Name of Team Leader',                    null,                                         i(13, s(geo?.team_leader_name))],
    // 14
    ['Designation and Agency',                 null,                                         i(14, `${s(geo?.team_leader_desig)}${geo?.team_leader_agency ? ' / ' + geo.team_leader_agency : ''}`)],
    // 15
    ['Cellphone Number',                       null,                                         i(15, s(geo?.team_leader_contact))],
    // 16
    ['Name of alternate contact person',       null,                                         i(16, s(geo?.alt_contact_name))],
    // 17
    ['Cellphone Number',                       null,                                         i(17, s(geo?.alt_contact_number))],
    // 18
    ["Respondents' Profile",                   null,                                         i(18, null)],
    // 19
    ['1. Names of Person Interviewed',         null,                                         i(19, r(0, 'name'))],
    // 20
    ['Designation',                            null,                                         i(20, r(0, 'designation'))],
    // 21
    ['Office/Agency',                          null,                                         i(21, r(0, 'office_agency'))],
    // 22
    ['Cellphone Number',                       null,                                         i(22, r(0, 'contact'))],
    // 23
    ['2. Names of Person Interviewed',         null,                                         i(23, r(1, 'name'))],
    // 24
    ['Designation',                            null,                                         i(24, r(1, 'designation'))],
    // 25
    ['Office/Agency',                          null,                                         i(25, r(1, 'office_agency'))],
    // 26
    ['Cellphone Number',                       null,                                         i(26, r(1, 'contact'))],
    // 27
    ['3. Names of Person Interviewed',         null,                                         i(27, r(2, 'name'))],
    // 28
    ['Designation',                            null,                                         i(28, r(2, 'designation'))],
    // 29
    ['Office/Agency',                          null,                                         i(29, r(2, 'office_agency'))],
    // 30
    ['Cellphone Number',                       null,                                         i(30, r(2, 'contact'))],
    // 31
    ['Demographic Data of the Affected Population', null,                                    i(31, null)],
    // 32
    ['All Age Groups',                         '# of Males',                                 i(32, n(demo?.all_ages_male))],
    // 33
    [null,                                     '# of Females',                               i(33, n(demo?.all_ages_female))],
    // 34
    [null,                                     'Total',                                      i(34, n(demo?.all_ages_male) + n(demo?.all_ages_female))],
    // 35
    ['Less than 6 months',                     '# of Males',                                 i(35, n(demo?.u6mo_male))],
    // 36
    [null,                                     '# of Females',                               i(36, n(demo?.u6mo_female))],
    // 37
    [null,                                     'Total',                                      i(37, n(demo?.u6mo_male) + n(demo?.u6mo_female))],
    // 38
    ['6 to 23 months',                         '# of Males',                                 i(38, n(demo?.m6to23_male))],
    // 39
    [null,                                     '# of Females',                               i(39, n(demo?.m6to23_female))],
    // 40
    [null,                                     'Total',                                      i(40, n(demo?.m6to23_male) + n(demo?.m6to23_female))],
    // 41
    ['24 to 59 months',                        '# of Males',                                 i(41, n(demo?.m24to59_male))],
    // 42
    [null,                                     '# of Females',                               i(42, n(demo?.m24to59_female))],
    // 43
    [null,                                     'Total',                                      i(43, n(demo?.m24to59_male) + n(demo?.m24to59_female))],
    // 44
    ['60 years old and above',                 '# of Males',                                 i(44, n(demo?.y60up_male))],
    // 45
    [null,                                     '# of Females',                               i(45, n(demo?.y60up_female))],
    // 46
    [null,                                     'Total',                                      i(46, n(demo?.y60up_male) + n(demo?.y60up_female))],
    // 47
    ['Persons with Disabilities (PWDs)',        '# of Males',                                 i(47, n(demo?.pwd_male))],
    // 48
    [null,                                     '# of Females',                               i(48, n(demo?.pwd_female))],
    // 49
    [null,                                     'Total',                                      i(49, n(demo?.pwd_male) + n(demo?.pwd_female))],
    // 50
    ['Pregnant Women',                         '1st & 2nd Trimester',                        i(50, n(demo?.pregnant_tri1_2))],
    // 51
    [null,                                     '3rd Trimester',                              i(51, n(demo?.pregnant_tri3))],
    // 52
    [null,                                     'Total',                                      i(52, n(demo?.pregnant_total))],
    // 53
    ['Lactating Mothers',                      'Total',                                      i(53, n(demo?.lactating))],
    // 54
    ['Female Adolescents',                     'Total',                                      i(54, n(demo?.female_adolescents))],
    // 55
    ['Infant and Young Child Feeding (IYCF)',   null,                                         i(55, null)],
    // 56
    ['Are there clearly identified IYCF/breastfeeding areas/spaces?', 'Yes',                 i(56, yRow(iycf?.has_bf_area))],
    // 57
    [null,                                     'No',                                         i(57, nRow(iycf?.has_bf_area))],
    // 58
    ['# of breastfeeding areas, if none put "0"', 'How many?',                              i(58, n(iycf?.bf_area_count))],
    // 59
    ['Are there community kitchens in the area?', 'Yes',                                     i(59, yRow(iycf?.has_comm_kitchen))],
    // 60
    [null,                                     'No',                                         i(60, nRow(iycf?.has_comm_kitchen))],
    // 61
    ['# of community kitchen, if none put "0"', 'How many?',                                i(61, n(iycf?.comm_kitchen_count))],
    // 62
    ['Are there IYCF support groups deployed in the area?', 'Yes',                           i(62, yRow(iycf?.has_iycf_support_group))],
    // 63
    [null,                                     'No',                                         i(63, nRow(iycf?.has_iycf_support_group))],
    // 64
    ['# of IYCF support groups, if none put "0"', 'How many?',                              i(64, n(iycf?.iycf_support_group_count))],
    // 65
    ['Is there an available human milk bank in the area?', 'Yes',                            i(65, yRow(iycf?.has_milk_bank))],
    // 66
    [null,                                     'No',                                         i(66, nRow(iycf?.has_milk_bank))],
    // 67
    ['# of human milk bank, if none put "0"',   'How many?',                                 i(67, n(iycf?.milk_bank_count))],
    // 68
    ['Are there donations of breastmilk substitutes and/or baby bottles/teats since the onset of emergency/disaster?', 'Yes', i(68, yRow(iycf?.has_bms_donations))],
    // 69
    [null,                                     'No',                                         i(69, nRow(iycf?.has_bms_donations))],
    // 70
    ['name of donor, if none put "0"',          'By whom?',                                   i(70, s(iycf?.bms_donor_name))],
    // 71
    ['Actions done',                            'Actions',                                    i(71, s(iycf?.bms_actions_done))],
    // 72
    ['Infant and Young Child Feeding (IYCF) Supplies', null,                                 i(72, null)],
    // 73
    ['IYCF Counselling Cards',                  'Yes',                                        i(73, supYes(supplies?.iycf_counselling_cards))],
    // 74
    [null,                                     'No',                                         i(74, supNo(supplies?.iycf_counselling_cards))],
    // 75
    ['# of IYCF counselling cards, if none put "0"', '# of pcs',                            i(75, n(supplies?.iycf_counselling_cards))],
    // 76
    ['Breastfeeding Flip Charts',               'Yes',                                        i(76, supYes(supplies?.bf_flipcharts))],
    // 77
    [null,                                     'No',                                         i(77, supNo(supplies?.bf_flipcharts))],
    // 78
    ['# of breastfeeding flip charts, if none put "0"', '# of pcs',                         i(78, n(supplies?.bf_flipcharts))],
    // 79
    ['EO 51 Milk Code posters',                'Yes',                                        i(79, supYes(supplies?.eo51_posters))],
    // 80
    [null,                                     'No',                                         i(80, supNo(supplies?.eo51_posters))],
    // 81
    ['# of EO 51 Milk code posters, if none put "0"', '# of pcs',                           i(81, n(supplies?.eo51_posters))],
    // 82
    ['Breastfeeding/IYCF Kits',                'Yes',                                        i(82, supYes(supplies?.bf_iycf_kits))],
    // 83
    [null,                                     'No',                                         i(83, supNo(supplies?.bf_iycf_kits))],
    // 84
    ['# of breastfeeding kits, if none put "0"', '# of pcs',                                i(84, n(supplies?.bf_iycf_kits))],
    // 85
    ['Other IYCF Supplies',                    'Specify',                                    i(85, s(supplies?.other_supplies))],
    // 86
    [null,                                     '# of pcs',                                   i(86, null)],
    // 87
    [null,                                     'Specify',                                    i(87, null)],
    // 88
    [null,                                     '# of pcs',                                   i(88, null)],
    // 89
    ['Micronutrient Supplementation Supplies',  null,                                         i(89, null)],
    // 90
    ['Vitamin A Capsules: 100,000 IU',          'Yes',                                        i(90, supYes(supplies?.vita_100iu))],
    // 91
    [null,                                     'No',                                         i(91, supNo(supplies?.vita_100iu))],
    // 92
    ['# of vitamin A capsules, if none put "0"', '# of capsules',                            i(92, n(supplies?.vita_100iu))],
    // 93
    [' Vitamin A Capsules: 200,000 IU',         'Yes',                                        i(93, supYes(supplies?.vita_200iu))],
    // 94
    [null,                                     'No',                                         i(94, supNo(supplies?.vita_200iu))],
    // 95
    ['# of vitamin A capsules, if none put "0"', '# of capsules',                            i(95, n(supplies?.vita_200iu))],
    // 96
    ['Multiple Micronutrient Powder',           'Yes',                                        i(96, supYes(supplies?.mnp_sachets))],
    // 97
    [null,                                     'No',                                         i(97, supNo(supplies?.mnp_sachets))],
    // 98
    ['# of MNP sachets, if none put "0"',       '# of sachets',                              i(98, n(supplies?.mnp_sachets))],
    // 99
    ['Iron Drops: 15 mg iron/0.6 ml',           'Yes',                                        i(99, supYes(supplies?.iron_drops))],
    // 100
    [null,                                     'No',                                         i(100, supNo(supplies?.iron_drops))],
    // 101
    ['# of Iron drops, if none put "0"',        '# of bottles',                              i(101, n(supplies?.iron_drops))],
    // 102
    ['Iron 200 mg with Folic Acid 400 IU',      'Yes',                                        i(102, supYes(supplies?.iron_200mg_fa400))],
    // 103
    [null,                                     'No',                                         i(103, supNo(supplies?.iron_200mg_fa400))],
    // 104
    ['# of Iron tablets, if none put "0"',      '# of tablets',                              i(104, n(supplies?.iron_200mg_fa400))],
    // 105
    [' Iron 60 mg with Folic Acid 2.8 mg',      'Yes',                                        i(105, supYes(supplies?.iron_60mg_fa28))],
    // 106
    [null,                                     'No',                                         i(106, supNo(supplies?.iron_60mg_fa28))],
    // 107
    ['# of Iron tablets, if none put "0"',      '# of tablets',                              i(107, n(supplies?.iron_60mg_fa28))],
    // 108
    [' Iron syrup: 150 mg iron/5ml',            'Yes',                                        i(108, supYes(supplies?.iron_syrup))],
    // 109
    [null,                                     'No',                                         i(109, supNo(supplies?.iron_syrup))],
    // 110
    ['# of Iron syrup, if none put "0"',        '# of bottles',                              i(110, n(supplies?.iron_syrup))],
    // 111
    ['Oral Rehydration Salt Solution',          'Yes',                                        i(111, supYes(supplies?.ors_sachets))],
    // 112
    [null,                                     'No',                                         i(112, supNo(supplies?.ors_sachets))],
    // 113
    ['# of ORS sachets, if none put "0"',       '# of sachets',                              i(113, n(supplies?.ors_sachets))],
    // 114
    ['Zinc drops or syrup',                     'Yes',                                        i(114, supYes(supplies?.zinc_drops_syrup))],
    // 115
    [null,                                     'No',                                         i(115, supNo(supplies?.zinc_drops_syrup))],
    // 116
    ['# of Zinc drops, if none put "0"',        '# of bottles',                              i(116, n(supplies?.zinc_drops_syrup))],
    // 117
    ['Other supplies',                          'Specify',                                    i(117, s(supplies?.other_supplies))],
    // 118
    [null,                                     '# of pcs',                                   i(118, null)],
    // 119
    [null,                                     'Specify',                                    i(119, null)],
    // 120
    [null,                                     '# of pcs',                                   i(120, null)],
    // 121
    ['Availability of Nutrition Anthropometric Tools', null,                                  i(121, null)],
    // 122
    ['MUAC Tape for children',                  'Yes',                                        i(122, supYes(tools?.muac_children))],
    // 123
    [null,                                     'No',                                         i(123, supNo(tools?.muac_children))],
    // 124
    ['# of MUAC tape for children, if none put "0"', '# of pcs',                            i(124, n(tools?.muac_children))],
    // 125
    ['MUAC Tape for adults',                    'Yes',                                        i(125, supYes(tools?.muac_adults))],
    // 126
    [null,                                     'No',                                         i(126, supNo(tools?.muac_adults))],
    // 127
    ['# of MUAC tape for adults, if none put "0"', '# of pcs',                              i(127, n(tools?.muac_adults))],
    // 128
    ['Infant Weighing Scale',                   'Yes',                                        i(128, supYes(tools?.infant_scale))],
    // 129
    [null,                                     'No',                                         i(129, supNo(tools?.infant_scale))],
    // 130
    ['# of infant weighing scales, if none put "0"', '# of pcs',                            i(130, n(tools?.infant_scale))],
    // 131
    ['Weighing Scale (Adult)',                  'Yes',                                        i(131, supYes(tools?.adult_scale))],
    // 132
    [null,                                     'No',                                         i(132, supNo(tools?.adult_scale))],
    // 133
    ['# of weighing scales (adult), if none put "0"', '# of pcs',                           i(133, n(tools?.adult_scale))],
    // 134
    ['Length/Height Board',                     'Yes',                                        i(134, supYes(tools?.length_height_board))],
    // 135
    [null,                                     'No',                                         i(135, supNo(tools?.length_height_board))],
    // 136
    ['# of length/height board, if none put "0"', '# of pcs',                               i(136, n(tools?.length_height_board))],
    // 137
    ['Wt for Length/Ht Reference Table',        'Yes',                                        i(137, supYes(tools?.wfl_reference_table))],
    // 138
    [null,                                     'No',                                         i(138, supNo(tools?.wfl_reference_table))],
    // 139
    ['# of reference table, if none put "0"',   '# of pcs',                                  i(139, n(tools?.wfl_reference_table))],
    // 140
    ['Commodities of Management of Acute Malnutrition', null,                                i(140, null)],
    // 141
    ['RUSF tubs',                               'Yes',                                        i(141, supYes(mam?.rusf_tubs))],
    // 142
    [null,                                     'No',                                         i(142, supNo(mam?.rusf_tubs))],
    // 143
    ['# of RUSF, if none put "0"',              '# of tubs',                                  i(143, n(mam?.rusf_tubs))],
    // 144
    ['RUSF sachets',                            'Yes',                                        i(144, supYes(mam?.rusf_sachets))],
    // 145
    [null,                                     'No',                                         i(145, supNo(mam?.rusf_sachets))],
    // 146
    ['# of RUSF, if none put "0"',              '# of sachets',                              i(146, n(mam?.rusf_sachets))],
    // 147
    ['RUTF sachets',                            'Yes',                                        i(147, supYes(mam?.rutf_sachets))],
    // 148
    [null,                                     'No',                                         i(148, supNo(mam?.rutf_sachets))],
    // 149
    ['# of RUTF, if none put "0"',              '# of sachets',                              i(149, n(mam?.rutf_sachets))],
    // 150
    ['Therapeutic Milk F75',                    'Yes',                                        i(150, supYes(mam?.f75_sachets_cans))],
    // 151
    [null,                                     'No',                                         i(151, supNo(mam?.f75_sachets_cans))],
    // 152
    ['# of Therapeutic Milk F75, if none put "0"', '# of sachets',                           i(152, n(mam?.f75_sachets_cans))],
    // 153
    ['Therapeutic Milk F100',                   'Yes',                                        i(153, supYes(mam?.f100_sachets_cans))],
    // 154
    [null,                                     'No',                                         i(154, supNo(mam?.f100_sachets_cans))],
    // 155
    ['# of Therapeutic Milk F100, if none put "0"', '# of sachets',                          i(155, n(mam?.f100_sachets_cans))],
    // 156
    ['ReSoMal',                                 'Yes',                                        i(156, supYes(mam?.resomal_sachets))],
    // 157
    [null,                                     'No',                                         i(157, supNo(mam?.resomal_sachets))],
    // 158
    ['# of ReSoMal sachets, if none put "0"',   '# of sachets',                              i(158, n(mam?.resomal_sachets))],
    // 159
    ['High Energy Biscuit',                     'Yes',                                        i(159, supYes(mam?.heb_sachets))],
    // 160
    [null,                                     'No',                                         i(160, supNo(mam?.heb_sachets))],
    // 161
    ['# of High Energy Biscuits, if none put "0"', '# of packets',                           i(161, n(mam?.heb_sachets))],
    // 162
    ['Others',                                  'Specify',                                    i(162, s(mam?.other_commodities))],
    // 163
    [null,                                     '# of sachets',                               i(163, null)],
    // 164
    [null,                                     'Specify:',                                   i(164, null)],
    // 165
    [null,                                     '# of sachets',                               i(165, null)],
    // 166
    ['Ongoing Relief Efforts/ Assistance',      null,                                         i(166, null)],
    // 167
    ['Are there available and accessible markets selling food to the community?', 'Yes',      i(167, yRow(relief?.has_accessible_market))],
    // 168
    [null,                                     'No',                                         i(168, nRow(relief?.has_accessible_market))],
    // 169
    [null,                                     "Don't Know",                                 i(169, null)],
    // 170
    ['Number of children (0-59 months old) experiencing diarrhea (3 or more watery stools in the past 24 hours)',
                                               '# of 0-59 mos old children',                 i(170, n(relief?.diarrhea_children_count))],
    // 171
    ['Food',                                   'Yes',                                         i(171, riYes('food'))],
    // 172
    [null,                                     'No',                                         i(172, riNo('food'))],
    // 173
    [null,                                     'Perceived gap?',                             i(173, riGap('food'))],
    // 174
    ['Specify name of organization/donor',      'donor',                                      i(174, riOrg('food'))],
    // 175
    ['Specify food items',                      'food items',                                 i(175, null)],
    // 176
    ['Safe Drinking Water',                     'Yes',                                        i(176, riYes('water'))],
    // 177
    [null,                                     'No',                                         i(177, riNo('water'))],
    // 178
    [null,                                     'Perceived gap?',                             i(178, riGap('water'))],
    // 179
    ['Specify name of organization/donor',      'donor',                                      i(179, riOrg('water'))],
    // 180
    ['Hygiene Kit',                             'Yes',                                        i(180, riYes('hygiene'))],
    // 181
    [null,                                     'No',                                         i(181, riNo('hygiene'))],
    // 182
    [null,                                     'Perceived gap?',                             i(182, riGap('hygiene'))],
    // 183
    ['Specify name of organization/donor',      'donor',                                      i(183, riOrg('hygiene'))],
    // 184
    ['Toilet/Portalet/Latrine',                 'Yes',                                        i(184, riYes('toilet'))],
    // 185
    [null,                                     'No',                                         i(185, riNo('toilet'))],
    // 186
    [null,                                     'Perceived gap?',                             i(186, riGap('toilet'))],
    // 187
    ['Specify name of organization/donor',      'donor',                                      i(187, riOrg('toilet'))],
    // 188
    ['Cooking Utensils',                        'Yes',                                        i(188, riYes('utensils'))],
    // 189
    [null,                                     'No',                                         i(189, riNo('utensils'))],
    // 190
    ['# of cooking utensils',                   'Perceived gap?',                             i(190, riGap('utensils'))],
    // 191
    ['Specify name of organization/donor',      'donor',                                      i(191, riOrg('utensils'))],
    // 192
    ['Clothing',                                'Yes',                                        i(192, riYes('clothing'))],
    // 193
    [null,                                     'No',                                         i(193, riNo('clothing'))],
    // 194
    [null,                                     'Perceived gap?',                             i(194, riGap('clothing'))],
    // 195
    ['Specify name of organization/donor',      'donor',                                      i(195, riOrg('clothing'))],
    // 196
    ['Temporary Shelter',                       'Yes',                                        i(196, riYes('shelter'))],
    // 197
    [null,                                     'No',                                         i(197, riNo('shelter'))],
    // 198
    [null,                                     'Perceived gap?',                             i(198, riGap('shelter'))],
    // 199
    ['Specify name of organization/donor',      'donor',                                      i(199, riOrg('shelter'))],
    // 200
    ['Overall assessment/Notes',               null,                                         i(200, s(notes?.overall_notes))],
    // 201 — footnote row (locked in template)
    ['*subject to changes depending on the development of other relevant assessment forms', null, i(201, null)],
  ];

  // ── Verify row count ───────────────────────────────────────────────────────
  if (__DEV__ && rows.length !== 202) {
    console.warn(`[ninaExport] Row count mismatch: expected 202, got ${rows.length}`);
  }

  // ── Build worksheet ────────────────────────────────────────────────────────
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 72 }, { wch: 30 }, { wch: 36 }];

  // ── Paste guide sheet ──────────────────────────────────────────────────────
  const guideRows: [string][] = [
    ['HOW TO PASTE INTO THE NINA CONSOLIDATION TOOL'],
    [''],
    ['1. In this file, click cell C1.'],
    ['2. Press Ctrl+Shift+End to select down to C202.'],
    ['3. Copy (Ctrl+C).'],
    ['4. Open the NINA Consolidation Tool (.xlsm).'],
    ['5. Click the correct team column at row 1:'],
    ['     Team 1 = C1,  Team 2 = D1,  Team 3 = E1,  Team 4 = F1,  Team 5 = G1'],
    ['6. Open Paste Special: Ctrl+Alt+V'],
    ['7. Check "Skip Blanks" then click OK.'],
    [''],
    ['WHY SKIP BLANKS?'],
    ['Some rows in the template are locked (section headers, labels).'],
    ['This exported file leaves those rows blank in column C on purpose.'],
    ['"Skip Blanks" tells Excel to skip over blank cells when pasting,'],
    ['so it never tries to write into a locked row — no password needed.'],
    [''],
    [`Export generated: ${new Date().toLocaleString('en-PH')}`],
    [`Assessment:        ${teamLabel}`],
    [`Barangay:          ${s(geo?.barangay) || '(not set)'}`],
    [`Evacuation Center: ${s(geo?.evacuation_center) || '(not set)'}`],
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 80 }];

  // ── Workbook ───────────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'NINA Consolidation');
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Paste Guide');

  // ── Write → cache → share ──────────────────────────────────────────────────
  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

  const filename = `NINA_${s(event?.disaster_name).replace(/\s+/g, '_') || 'Assessment'}_Team${assessment?.team_number ?? 1}_${Date.now()}.xlsx`;
  const fileUri = (FileSystem.cacheDirectory ?? '') + filename;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Share NINA Assessment',
      UTI: 'com.microsoft.excel.xlsx',
    });
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}