/**
 * lib/geo/seed.ts
 * Seeds geo_regions, geo_provinces, geo_municipalities from bundled geo.json.
 * Safe to call multiple times — INSERT OR IGNORE prevents duplicates.
 */
import { getDb } from '@/db/database';
import geoData from './data/geo.json';

interface GeoJsonData {
  regions: Array<{ id: number; name: string }>;
  provinces: Array<{ id: number; region_id: number; name: string }>;
  municipalities: Array<{ id: number; province_id: number; name: string }>;
}

export async function seedGeoData(): Promise<void> {
  const db = getDb();
  const data = geoData as GeoJsonData;

  // Check if already seeded
  const existingCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM geo_regions'
  );
  if (existingCount && existingCount.count > 0) {
    return; // Already seeded
  }

  console.log('[Geo] Seeding geo data...');

  for (const region of data.regions) {
    await db.runAsync(
      'INSERT OR IGNORE INTO geo_regions (id, name) VALUES (?, ?)',
      [region.id, region.name]
    );
  }

  for (const province of data.provinces) {
    await db.runAsync(
      'INSERT OR IGNORE INTO geo_provinces (id, region_id, name) VALUES (?, ?, ?)',
      [province.id, province.region_id, province.name]
    );
  }

  for (const municipality of data.municipalities) {
    await db.runAsync(
      'INSERT OR IGNORE INTO geo_municipalities (id, province_id, name) VALUES (?, ?, ?)',
      [municipality.id, municipality.province_id, municipality.name]
    );
  }

  console.log(
    `[Geo] Seeded ${data.regions.length} regions, ${data.provinces.length} provinces, ${data.municipalities.length} municipalities.`
  );
}
