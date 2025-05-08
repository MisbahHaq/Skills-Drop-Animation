import { 
  getBlockedSites,
  getSchedules,
  saveBlockedSite,
  saveSchedule,
  removeBlockedSite,
  removeSchedule,
  isAdBlockingEnabled,
  toggleAdBlocking,
  getCustomRules,
  getWhitelist,
  addCustomRule,
  removeCustomRule,
  addToWhitelist,
  removeFromWhitelist,
  getPasswordProtection,
  setPasswordProtection,
  exportSettings,
  importSettings,
  resetAllSettings
} from './storage.js';

// Tab navigation
document.addEventListener('DOMContentLoaded', () => {
  // Initialize tabs
  initTabs();
  
  // Load data
  loadAllData();
  
  // Set up event listeners
  setupBlockingListeners();
  setupScheduleListeners();
  setupAdBlockingListeners();
  setupSecurityListeners();
  setupDataManagementListeners();
});

// Initialize tab navigation
function initTabs() {
  const tabs = document.querySelectorAll('.settings-tabs a');
  const sections = document.querySelectorAll('.settings-section');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      
      // Remove active class from all tabs and sections
      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      
      // Add active class to selected tab and section
      tab.classList.add('active');
      const targetSection = document.querySelector(tab.getAttribute('href'));
      if (targetSection) targetSection.classList.add('active');
    });
  });
}

// Load all data from storage
async function loadAllData() {
  loadBlockedSites();
  loadSchedules();
  loadAdBlockingSettings();
  loadSecuritySettings();
}

// ========== Website Blocking Tab ==========

// Load blocked sites
async function loadBlockedSites() {
  const sites = await getBlockedSites();
  const sitesList = document.getElementById('sites-list');
  const scheduleSiteSelect = document.getElementById('schedule-site');
  
  // Clear current lists
  sitesList.innerHTML = '';
  
  // Rebuild the site dropdown for schedules tab
  scheduleSiteSelect.innerHTML = '<option value="">Select a website</option>';
  
  sites.forEach(site => {
    // Add to sites table
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${site.title || site.url}</td>
      <td>${site.pattern || site.url}</td>
      <td>
        <span class="status-badge ${site.isCurrentlyBlocked ? 'blocked' : 'unblocked'}">
          ${site.isCurrentlyBlocked ? 'Blocked' : 'Unblocked'}
        </span>
      </td>
      <td>
        <button class="button small secondary toggle-site" data-id="${site.id}">
          ${site.isCurrentlyBlocked ? 'Unblock' : 'Block'}
        </button>
        <button class="button small danger remove-site" data-id="${site.id}">Remove</button>
      </td>
    `;
    sitesList.appendChild(row);
    
    // Add to site dropdown
    const option = document.createElement('option');
    option.value = site.id;
    option.textContent = site.title || site.url;
    scheduleSiteSelect.appendChild(option);
  });
  
  // Add event listeners
  document.querySelectorAll('.toggle-site').forEach(button => {
    button.addEventListener('click', toggleSite);
  });
  
  document.querySelectorAll('.remove-site').forEach(button => {
    button.addEventListener('click', removeSite);
  });
}

// Set up listeners for website blocking tab
function setupBlockingListeners() {
  const addSiteButton = document.getElementById('add-site');
  addSiteButton.addEventListener('click', addSite);
}

// Add a new blocked site
async function addSite() {
  const urlInput = document.getElementById('site-url');
  const titleInput = document.getElementById('site-title');
  const patternInput = document.getElementById('site-pattern');
  
  const url = urlInput.value.trim();
  const title = titleInput.value.trim();
  const pattern = patternInput.value.trim();
  
  // Basic validation
  if (!url && !pattern) {
    alert('Please enter a URL or pattern to block.');
    return;
  }
  
  // Create new site object
  const site = {
    id: crypto.randomUUID(), // Generate a unique ID
    url: url,
    title: title || url,
    pattern: pattern,
    dateAdded: Date.now(),
    isCurrentlyBlocked: true
  };
  
  try {
    // If we have a pattern, test it's valid
    if (pattern) {
      try {
        new RegExp(pattern);
      } catch (e) {
        alert('Invalid regex pattern. Please check your syntax.');
        return;
      }
    }
    
    // Save to storage
    await saveBlockedSite(site);
    
    // Clear form
    urlInput.value = '';
    titleInput.value = '';
    patternInput.value = '';
    
    // Reload sites
    await loadBlockedSites();
  } catch (error) {
    console.error('Error adding site:', error);
    alert('Failed to add site. Please try again.');
  }
}

// Toggle site blocking status
async function toggleSite(event) {
  const siteId = event.target.dataset.id;
  if (!siteId) return;
  
  try {
    const sites = await getBlockedSites();
    const site = sites.find(s => s.id === siteId);
    
    if (site) {
      site.isCurrentlyBlocked = !site.isCurrentlyBlocked;
      await saveBlockedSite(site);
      await loadBlockedSites();
    }
  } catch (error) {
    console.error('Error toggling site:', error);
    alert('Failed to update site status. Please try again.');
  }
}

// Remove a blocked site
async function removeSite(event) {
  const siteId = event.target.dataset.id;
  if (!siteId) return;
  
  if (confirm('Are you sure you want to remove this site?')) {
    try {
      await removeBlockedSite(siteId);
      await loadBlockedSites();
    } catch (error) {
      console.error('Error removing site:', error);
      alert('Failed to remove site. Please try again.');
    }
  }
}

// ========== Schedules Tab ==========

// Load blocking schedules
async function loadSchedules() {
  const schedules = await getSchedules();
  const sites = await getBlockedSites();
  const schedulesList = document.getElementById('schedules-list');
  
  // Clear current list
  schedulesList.innerHTML = '';
  
  schedules.forEach(schedule => {
    // Find associated site
    const site = sites.find(s => s.id === schedule.siteId);
    if (!site) return;
    
    // Format days of week
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const scheduleDays = schedule.days.map(day => daysOfWeek[day]).join(', ');
    
    // Format time range
    const formatTime = (minutes) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      const period = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
    };
    
    const timeRange = `${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}`;
    
    // Create row
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${site.title || site.url}</td>
      <td>${scheduleDays}</td>
      <td>${timeRange}</td>
      <td>
        <button class="button small danger remove-schedule" data-id="${schedule.id}">Remove</button>
      </td>
    `;
    schedulesList.appendChild(row);
  });
  
  // Add event listeners
  document.querySelectorAll('.remove-schedule').forEach(button => {
    button.addEventListener('click', removeScheduleItem);
  });
}

// Set up listeners for schedules tab
function setupScheduleListeners() {
  const addScheduleButton = document.getElementById('add-schedule');
  addScheduleButton.addEventListener('click', addScheduleItem);
}

// Add a new schedule
async function addScheduleItem() {
  const siteSelect = document.getElementById('schedule-site');
  const startTimeInput = document.getElementById('schedule-start');
  const endTimeInput = document.getElementById('schedule-end');
  const dayCheckboxes = document.querySelectorAll('.day-checkbox:checked');
  
  const siteId = siteSelect.value;
  const startTime = startTimeInput.value;
  const endTime = endTimeInput.value;
  const days = Array.from(dayCheckboxes).map(cb => parseInt(cb.value, 10));
  
  // Basic validation
  if (!siteId) {
    alert('Please select a website.');
    return;
  }
  
  if (!startTime || !endTime) {
    alert('Please select start and end times.');
    return;
  }
  
  if (days.length === 0) {
    alert('Please select at least one day.');
    return;
  }
  
  // Convert time strings to minutes since midnight
  const convertTimeToMinutes = (timeString) => {
    const [hours, minutes] = timeString.split(':').map(num => parseInt(num, 10));
    return hours * 60 + minutes;
  };
  
  const startMinutes = convertTimeToMinutes(startTime);
  const endMinutes = convertTimeToMinutes(endTime);
  
  // Create new schedule object
  const schedule = {
    id: crypto.randomUUID(),
    siteId: siteId,
    days: days,
    startTime: startMinutes,
    endTime: endMinutes,
    dateAdded: Date.now()
  };
  
  try {
    // Save to storage
    await saveSchedule(schedule);
    
    // Clear form
    siteSelect.value = '';
    startTimeInput.value = '';
    endTimeInput.value = '';
    dayCheckboxes.forEach(cb => cb.checked = false);
    
    // Reload schedules
    await loadSchedules();
  } catch (error) {
    console.error('Error adding schedule:', error);
    alert('Failed to add schedule. Please try again.');
  }
}

// Remove a schedule
async function removeScheduleItem(event) {
  const scheduleId = event.target.dataset.id;
  if (!scheduleId) return;
  
  if (confirm('Are you sure you want to remove this schedule?')) {
    try {
      await removeSchedule(scheduleId);
      await loadSchedules();
    } catch (error) {
      console.error('Error removing schedule:', error);
      alert('Failed to remove schedule. Please try again.');
    }
  }
}

// ========== Ad Blocking Tab ==========

// Load ad blocking settings
async function loadAdBlockingSettings() {
  // Load ad blocking toggle state
  const adBlockingEnabled = await isAdBlockingEnabled();
  document.getElementById('ad-blocking-toggle').checked = adBlockingEnabled;
  
  // Load custom rules
  const customRules = await getCustomRules();
  const rulesList = document.getElementById('rules-list');
  rulesList.innerHTML = '';
  
  customRules.forEach(rule => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${rule.rule}</td>
      <td>
        <button class="button small danger remove-rule" data-id="${rule.id}">Remove</button>
      </td>
    `;
    rulesList.appendChild(row);
  });
  
  // Load whitelist
  const whitelist = await getWhitelist();
  const whitelistList = document.getElementById('whitelist-list');
  whitelistList.innerHTML = '';
  
  whitelist.forEach(site => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${site.domain}</td>
      <td>
        <button class="button small danger remove-whitelist" data-id="${site.id}">Remove</button>
      </td>
    `;
    whitelistList.appendChild(row);
  });
  
  // Add event listeners
  document.querySelectorAll('.remove-rule').forEach(button => {
    button.addEventListener('click', removeRuleItem);
  });
  
  document.querySelectorAll('.remove-whitelist').forEach(button => {
    button.addEventListener('click', removeWhitelistItem);
  });
}

// Set up listeners for ad blocking tab
function setupAdBlockingListeners() {
  const adBlockingToggle = document.getElementById('ad-blocking-toggle');
  adBlockingToggle.addEventListener('change', toggleAdBlockingHandler);
  
  const addRuleButton = document.getElementById('add-rule');
  addRuleButton.addEventListener('click', addRuleItem);
  
  const addWhitelistButton = document.getElementById('add-whitelist');
  addWhitelistButton.addEventListener('click', addWhitelistItem);
}

// Toggle ad blocking
async function toggleAdBlockingHandler() {
  try {
    await toggleAdBlocking();
  } catch (error) {
    console.error('Error toggling ad blocking:', error);
    alert('Failed to update ad blocking settings. Please try again.');
    // Reset toggle to previous state
    const adBlockingEnabled = await isAdBlockingEnabled();
    document.getElementById('ad-blocking-toggle').checked = adBlockingEnabled;
  }
}

// Add a custom rule
async function addRuleItem() {
  const ruleInput = document.getElementById('custom-rule');
  const ruleText = ruleInput.value.trim();
  
  if (!ruleText) {
    alert('Please enter a rule.');
    return;
  }
  
  try {
    await addCustomRule(ruleText);
    ruleInput.value = '';
    await loadAdBlockingSettings();
  } catch (error) {
    console.error('Error adding rule:', error);
    alert('Failed to add rule. Please try again.');
  }
}

// Remove a custom rule
async function removeRuleItem(event) {
  const ruleId = event.target.dataset.id;
  if (!ruleId) return;
  
  try {
    await removeCustomRule(ruleId);
    await loadAdBlockingSettings();
  } catch (error) {
    console.error('Error removing rule:', error);
    alert('Failed to remove rule. Please try again.');
  }
}

// Add a site to whitelist
async function addWhitelistItem() {
  const domainInput = document.getElementById('whitelist-site');
  const domain = domainInput.value.trim();
  
  if (!domain) {
    alert('Please enter a domain.');
    return;
  }
  
  try {
    await addToWhitelist(domain);
    domainInput.value = '';
    await loadAdBlockingSettings();
  } catch (error) {
    console.error('Error adding to whitelist:', error);
    alert('Failed to add domain to whitelist. Please try again.');
  }
}

// Remove a site from whitelist
async function removeWhitelistItem(event) {
  const siteId = event.target.dataset.id;
  if (!siteId) return;
  
  try {
    await removeFromWhitelist(siteId);
    await loadAdBlockingSettings();
  } catch (error) {
    console.error('Error removing from whitelist:', error);
    alert('Failed to remove domain from whitelist. Please try again.');
  }
}

// ========== Security Tab ==========

// Load security settings
async function loadSecuritySettings() {
  const passwordProtection = await getPasswordProtection();
  document.getElementById('password-toggle').checked = passwordProtection.enabled;
  
  const passwordForm = document.getElementById('password-form');
  if (passwordProtection.enabled) {
    passwordForm.classList.remove('hidden');
  } else {
    passwordForm.classList.add('hidden');
  }
}

// Set up listeners for security tab
function setupSecurityListeners() {
  const passwordToggle = document.getElementById('password-toggle');
  passwordToggle.addEventListener('change', togglePasswordForm);
  
  const savePasswordButton = document.getElementById('save-password');
  savePasswordButton.addEventListener('click', savePassword);
}

// Toggle password form visibility
function togglePasswordForm() {
  const passwordForm = document.getElementById('password-form');
  
  if (this.checked) {
    passwordForm.classList.remove('hidden');
  } else {
    passwordForm.classList.add('hidden');
  }
}

// Save password protection settings
async function savePassword() {
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  
  const password = passwordInput.value;
  const confirmPassword = confirmPasswordInput.value;
  
  if (!password) {
    alert('Please enter a password.');
    return;
  }
  
  if (password !== confirmPassword) {
    alert('Passwords do not match.');
    return;
  }
  
  try {
    await setPasswordProtection({
      enabled: true,
      password: password
    });
    
    alert('Password saved successfully.');
    passwordInput.value = '';
    confirmPasswordInput.value = '';
  } catch (error) {
    console.error('Error saving password:', error);
    alert('Failed to save password. Please try again.');
  }
}

// ========== Data Management ==========

// Set up listeners for data management
function setupDataManagementListeners() {
  const exportButton = document.getElementById('export-data');
  exportButton.addEventListener('click', exportData);
  
  const importButton = document.getElementById('import-data');
  importButton.addEventListener('click', importData);
  
  const resetButton = document.getElementById('reset-data');
  resetButton.addEventListener('click', resetData);
}

// Export settings
async function exportData() {
  try {
    const dataString = await exportSettings();
    
    // Create a download link
    const dataBlob = new Blob([dataString], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'focusflow_settings.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Failed to export settings. Please try again.');
  }
}

// Import settings
async function importData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const dataString = e.target.result;
        await importSettings(dataString);
        alert('Settings imported successfully.');
        
        // Reload all data
        await loadAllData();
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Failed to import settings. Please check the file and try again.');
      }
    };
    
    reader.readAsText(file);
  });
  
  input.click();
}

// Reset all settings
async function resetData() {
  if (confirm('Are you sure you want to reset all settings? This action cannot be undone.')) {
    try {
      await resetAllSettings();
      alert('All settings have been reset.');
      
      // Reload all data
      await loadAllData();
    } catch (error) {
      console.error('Error resetting data:', error);
      alert('Failed to reset settings. Please try again.');
    }
  }
}