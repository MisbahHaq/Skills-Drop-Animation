// Common storage utility functions for the extension

// Get all blocked sites
export async function getBlockedSites() {
  const result = await chrome.storage.sync.get('blockedSites');
  return result.blockedSites || [];
}

// Save a blocked site (add or update)
export async function saveBlockedSite(site) {
  const sites = await getBlockedSites();
  
  // Generate an ID if one doesn't exist
  if (!site.id) {
    site.id = crypto.randomUUID();
  }
  
  // Check if site already exists
  const existingIndex = sites.findIndex(s => s.id === site.id);
  
  if (existingIndex >= 0) {
    // Update existing site
    sites[existingIndex] = site;
  } else {
    // Add new site
    sites.push(site);
  }
  
  await chrome.storage.sync.set({ blockedSites: sites });
  
  // Notify service worker of changes
  chrome.runtime.sendMessage({ action: 'updateBlockedSites' });
  
  return site;
}

// Remove a blocked site
export async function removeBlockedSite(siteId) {
  const sites = await getBlockedSites();
  const filteredSites = sites.filter(site => site.id !== siteId);
  
  await chrome.storage.sync.set({ blockedSites: filteredSites });
  
  // Notify service worker of changes
  chrome.runtime.sendMessage({ action: 'updateBlockedSites' });
}

// Toggle site blocking status
export async function toggleSiteBlocking(siteId) {
  const sites = await getBlockedSites();
  const site = sites.find(s => s.id === siteId);
  
  if (site) {
    site.isCurrentlyBlocked = !site.isCurrentlyBlocked;
    await saveBlockedSite(site);
  }
}

// Get all schedules
export async function getSchedules() {
  const result = await chrome.storage.sync.get('schedules');
  return result.schedules || [];
}

// Save a schedule (add or update)
export async function saveSchedule(schedule) {
  const schedules = await getSchedules();
  
  // Generate an ID if one doesn't exist
  if (!schedule.id) {
    schedule.id = crypto.randomUUID();
  }
  
  // Check if schedule already exists
  const existingIndex = schedules.findIndex(s => s.id === schedule.id);
  
  if (existingIndex >= 0) {
    // Update existing schedule
    schedules[existingIndex] = schedule;
  } else {
    // Add new schedule
    schedules.push(schedule);
  }
  
  await chrome.storage.sync.set({ schedules });
  
  // Notify service worker of changes
  chrome.runtime.sendMessage({ action: 'updateBlockedSites' });
  
  return schedule;
}

// Remove a schedule
export async function removeSchedule(scheduleId) {
  const schedules = await getSchedules();
  const filteredSchedules = schedules.filter(schedule => schedule.id !== scheduleId);
  
  await chrome.storage.sync.set({ schedules: filteredSchedules });
  
  // Notify service worker of changes
  chrome.runtime.sendMessage({ action: 'updateBlockedSites' });
}

// Check if a time is within a schedule's time range
export function isTimeInSchedule(currentTime, startTime, endTime) {
  if (startTime <= endTime) {
    // Normal time range (e.g., 9:00 - 17:00)
    return currentTime >= startTime && currentTime <= endTime;
  } else {
    // Overnight time range (e.g., 22:00 - 6:00)
    return currentTime >= startTime || currentTime <= endTime;
  }
}

// Get current Pomodoro session
export async function getCurrentSession() {
  const result = await chrome.storage.sync.get('currentSession');
  return result.currentSession || null;
}

// Check if ad blocking is enabled
export async function isAdBlockingEnabled() {
  const result = await chrome.storage.sync.get('adBlockingEnabled');
  return result.adBlockingEnabled !== false; // Default to true
}

// Toggle ad blocking
export async function toggleAdBlocking() {
  const enabled = await isAdBlockingEnabled();
  await chrome.storage.sync.set({ adBlockingEnabled: !enabled });
  
  // Update declarativeNetRequest rules
  await updateAdBlockingRules(!enabled);
  
  return !enabled;
}

// Update ad blocking rules based on enabled status
async function updateAdBlockingRules(enabled) {
  // This is a placeholder for now since we can't directly manipulate
  // declarativeNetRequest rules in the service worker
  // In a real extension, this would update the rules
  console.log(`Ad blocking ${enabled ? 'enabled' : 'disabled'}`);
}

// Get custom ad blocking rules
export async function getCustomRules() {
  const result = await chrome.storage.sync.get('customRules');
  return result.customRules || [];
}

// Add a custom ad blocking rule
export async function addCustomRule(ruleText) {
  const rules = await getCustomRules();
  
  const newRule = {
    id: crypto.randomUUID(),
    rule: ruleText,
    dateAdded: Date.now()
  };
  
  rules.push(newRule);
  await chrome.storage.sync.set({ customRules: rules });
  
  // Update declarativeNetRequest rules
  await updateCustomRules();
  
  return newRule;
}

// Remove a custom ad blocking rule
export async function removeCustomRule(ruleId) {
  const rules = await getCustomRules();
  const filteredRules = rules.filter(rule => rule.id !== ruleId);
  
  await chrome.storage.sync.set({ customRules: filteredRules });
  
  // Update declarativeNetRequest rules
  await updateCustomRules();
}

// Update custom rules in declarativeNetRequest
async function updateCustomRules() {
  // Placeholder for updating the rules
  console.log('Custom rules updated');
}

// Get whitelist domains
export async function getWhitelist() {
  const result = await chrome.storage.sync.get('whitelist');
  return result.whitelist || [];
}

// Add a domain to whitelist
export async function addToWhitelist(domain) {
  const whitelist = await getWhitelist();
  
  // Check if domain already exists
  if (whitelist.some(item => item.domain === domain)) {
    return;
  }
  
  const newEntry = {
    id: crypto.randomUUID(),
    domain: domain,
    dateAdded: Date.now()
  };
  
  whitelist.push(newEntry);
  await chrome.storage.sync.set({ whitelist });
  
  // Update whitelist in declarativeNetRequest
  await updateWhitelist();
  
  return newEntry;
}

// Remove a domain from whitelist
export async function removeFromWhitelist(entryId) {
  const whitelist = await getWhitelist();
  const filteredWhitelist = whitelist.filter(entry => entry.id !== entryId);
  
  await chrome.storage.sync.set({ whitelist: filteredWhitelist });
  
  // Update whitelist in declarativeNetRequest
  await updateWhitelist();
}

// Update whitelist in declarativeNetRequest
async function updateWhitelist() {
  // Placeholder for updating the whitelist
  console.log('Whitelist updated');
}

// Get password protection settings
export async function getPasswordProtection() {
  const result = await chrome.storage.sync.get('passwordProtection');
  
  return result.passwordProtection || {
    enabled: false,
    password: ''
  };
}

// Set password protection settings
export async function setPasswordProtection(settings) {
  await chrome.storage.sync.set({ passwordProtection: settings });
}

// Export all settings as JSON
export async function exportSettings() {
  const keys = [
    'blockedSites',
    'schedules',
    'adBlockingEnabled',
    'customRules',
    'whitelist',
    'passwordProtection'
  ];
  
  const data = await chrome.storage.sync.get(keys);
  
  // Remove sensitive data
  if (data.passwordProtection && data.passwordProtection.enabled) {
    data.passwordProtection.password = '';
  }
  
  return JSON.stringify(data, null, 2);
}

// Import settings from JSON
export async function importSettings(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    
    // Validate data structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format');
    }
    
    // Import each setting
    const keys = [
      'blockedSites',
      'schedules',
      'adBlockingEnabled',
      'customRules',
      'whitelist'
    ];
    
    // Only import the keys that exist in the data
    const dataToImport = {};
    keys.forEach(key => {
      if (data[key] !== undefined) {
        dataToImport[key] = data[key];
      }
    });
    
    // Don't import password
    
    await chrome.storage.sync.set(dataToImport);
    
    // Notify service worker of changes
    chrome.runtime.sendMessage({ action: 'updateBlockedSites' });
    
    return true;
  } catch (error) {
    console.error('Error importing settings:', error);
    throw error;
  }
}

// Reset all settings to default
export async function resetAllSettings() {
  await chrome.storage.sync.clear();
  
  // Set default settings
  await chrome.storage.sync.set({
    blockedSites: [],
    schedules: [],
    adBlockingEnabled: true,
    customRules: [],
    whitelist: [],
    passwordProtection: {
      enabled: false,
      password: ''
    },
    currentSession: null
  });
  
  // Notify service worker of changes
  chrome.runtime.sendMessage({ action: 'updateBlockedSites' });
}