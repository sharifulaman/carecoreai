import { base44 } from "@/api/base44Client";

let cachedSettings = null;
let cacheOrgId = null;

export const getOrgSettings = async () => {
  try {
    const orgs = await base44.entities.Organisation.list();
    const org = orgs[0];
    if (!org) return {};
    if (cachedSettings && cacheOrgId === org.id) return cachedSettings;
    cachedSettings = org.settings || {};
    cacheOrgId = org.id;
    return cachedSettings;
  } catch (error) {
    console.error("Failed to fetch org settings:", error);
    return {};
  }
};

export const getSetting = async (key, defaultValue) => {
  const settings = await getOrgSettings();
  return settings[key] !== undefined ? settings[key] : defaultValue;
};

export const saveSettings = async (newSettings) => {
  try {
    const orgs = await base44.entities.Organisation.list();
    const org = orgs[0];
    if (!org) throw new Error("Organisation not found");
    const merged = { ...(org.settings || {}), ...newSettings };
    await base44.entities.Organisation.update(org.id, { settings: merged });
    cachedSettings = merged;
    cacheOrgId = org.id;
    return merged;
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw error;
  }
};

export const clearSettingsCache = () => {
  cachedSettings = null;
  cacheOrgId = null;
};