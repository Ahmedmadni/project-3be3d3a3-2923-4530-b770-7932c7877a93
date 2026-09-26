import type { EmergencyContact } from "@/types/medical";

/**
 * Picks emergency contacts for a country/region.
 * Region-specific rows (e.g. 911) are shown only when the region matches.
 * Country-wide rows (region_code = null) are always included.
 * Without any data, falls back to the static config.
 */
export function selectEmergencyContacts(all: EmergencyContact[], countryCode = "SA", regionCode?: string | null): EmergencyContact[] {
  return all
    .filter((c) => c.is_active && c.country_code === countryCode && (c.region_code == null || (!!regionCode && c.region_code === regionCode)))
    .sort((a, b) => b.priority - a.priority);
}

export function primaryAmbulance(contacts: EmergencyContact[]) {
  return contacts.find((c) => c.service_type === "ambulance");
}
