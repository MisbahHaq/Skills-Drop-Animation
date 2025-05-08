// Import utility functions
import { 
  getBlockedSites, 
  isTimeInSchedule,
  getCurrentSession,
  isAdBlockingEnabled
} from './js/storage.js';

// Initialize extension when installed
chrome.runtime.onInstalled.addListener(() => {
  console.log('FocusFlow extension installed');
  
  // Initialize default settings
  chrome.storage.sync.get(['blockedSites', 'schedules', 'sessions', 'adBlockingEnabled'], (result) => {
    if (!result.blockedSites) {
      chrome.storage.sync.set({ 
        blockedSites: [],
        schedules: [],
        sessions: [],
        adBlockingEnabled: true,
        currentSession: null,
        passwordProtection: {
          enabled: false,
          password: ''
        }
      });
    }
  });
  
  // Set up alarm for checking schedules
  chrome.alarms.create('checkSchedules', { periodInMinutes: 1 });
});

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkSchedules') {
    enforceScheduledBlocking();
  } else if (alarm.name === 'endPomodoroSession') {
    endFocusSession();
  }
});

// Enforce scheduled blocking
async function enforceScheduledBlocking() {
  const { blockedSites, schedules } = await chrome.storage.sync.get(['blockedSites', 'schedules']);
  const currentSession = await getCurrentSession();
  
  // If there's an active Pomodoro session, don't check schedules
  if (currentSession && currentSession.active) {
    return;
  }
  
  // Check if any site should be blocked based on schedule
  const now = new Date();
  const day = now.getDay();
  const hourMinute = now.getHours() * 60 + now.getMinutes();
  
  // Update whether sites should be blocked based on current time
  const updatedBlockedSites = blockedSites.map(site => {
    const siteSchedules = schedules.filter(schedule => schedule.siteId === site.id);
    
    // Site is scheduled to be blocked if any of its schedules are active
    const shouldBeBlocked = siteSchedules.some(schedule => 
      schedule.days.includes(day) && isTimeInSchedule(hourMinute, schedule.startTime, schedule.endTime)
    );
    
    return {
      ...site,
      isCurrentlyBlocked: shouldBeBlocked
    };
  });
  
  chrome.storage.sync.set({ blockedSites: updatedBlockedSites });
}

// Start a Pomodoro focus session
export async function startFocusSession(duration) {
  const minutes = parseInt(duration);
  if (isNaN(minutes) || minutes <= 0) {
    console.error('Invalid session duration');
    return;
  }
  
  const session = {
    startTime: Date.now(),
    duration: minutes * 60 * 1000, // Convert minutes to milliseconds
    endTime: Date.now() + (minutes * 60 * 1000),
    active: true
  };
  
  await chrome.storage.sync.set({ currentSession: session });
  
  // Set alarm to end the session
  chrome.alarms.create('endPomodoroSession', { delayInMinutes: minutes });
  
  // Apply blocking for all sites during focus session
  const { blockedSites } = await chrome.storage.sync.get(['blockedSites']);
  const updatedBlockedSites = blockedSites.map(site => ({
    ...site,
    isCurrentlyBlocked: true
  }));
  
  await chrome.storage.sync.set({ blockedSites: updatedBlockedSites });
  
  // Notify popup about session start
  chrome.runtime.sendMessage({ action: 'sessionStarted', session });
  
  return session;
}

// End a Pomodoro focus session
async function endFocusSession() {
  const { currentSession, blockedSites } = await chrome.storage.sync.get(['currentSession', 'blockedSites']);
  
  if (!currentSession || !currentSession.active) {
    return;
  }
  
  // End current session
  await chrome.storage.sync.set({ 
    currentSession: {
      ...currentSession,
      active: false
    }
  });
  
  // Reset blocking to scheduled status
  await enforceScheduledBlocking();
  
  // Notify popup about session end
  chrome.runtime.sendMessage({ action: 'sessionEnded' });
}

// Message handling from popup and options page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Message received:', request);
  
  if (request.action === 'startSession') {
    startFocusSession(request.duration)
      .then(session => sendResponse({ success: true, session }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the messaging channel open for the async response
  }
  
  if (request.action === 'endSession') {
    endFocusSession()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'updateBlockedSites') {
    enforceScheduledBlocking()
      .then(() => sendResponse({ success: true }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Handle navigation events for more reliable blocking
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only handle main frame navigation
  if (details.frameId !== 0) return;

  const url = details.url;
  if (!url || url === 'chrome://newtab/' || url.startsWith('chrome://') || url.includes('blocked.html')) {
    return;
  }

  try {
    const { blockedSites } = await chrome.storage.sync.get(['blockedSites']);
    
    // Get the hostname from the URL
    const urlToCheck = new URL(url).hostname;
    
    // Check if URL should be blocked
    const isBlocked = blockedSites.some(site => {
      if (!site.isCurrentlyBlocked) return false;
      
      if (site.pattern) {
        try {
          const regex = new RegExp(site.pattern);
          return regex.test(urlToCheck);
        } catch (e) {
          console.error('Invalid regex pattern:', site.pattern);
          return false;
        }
      }
      
      return site.url === urlToCheck;
    });
    
    if (isBlocked) {
      // Get the extension's blocked.html URL
      const blockedUrl = chrome.runtime.getURL('blocked.html');
      
      // Cancel the navigation and redirect to blocked page
      chrome.tabs.update(details.tabId, { url: blockedUrl });
    }
  } catch (error) {
    console.error('Error in navigation handler:', error);
  }
});

// Set up tab handling for blocked sites
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only check when URL changes
  if (changeInfo.url || (changeInfo.status === 'complete' && tab.url)) {
    const url = changeInfo.url || tab.url;
    if (!url || url === 'chrome://newtab/' || url.startsWith('chrome://') || url.includes('blocked.html')) {
      return;
    }

    try {
      const { blockedSites } = await chrome.storage.sync.get(['blockedSites']);
      
      // Get the hostname from the URL
      const urlToCheck = new URL(url).hostname;
      
      // Check if current URL should be blocked
      const isBlocked = blockedSites.some(site => {
        // Skip sites that aren't currently blocked
        if (!site.isCurrentlyBlocked) return false;
        
        // Handle pattern matching
        if (site.pattern) {
          try {
            const regex = new RegExp(site.pattern);
            return regex.test(urlToCheck);
          } catch (e) {
            console.error('Invalid regex pattern:', site.pattern);
            return false;
          }
        }
        
        // Handle exact matching
        return site.url === urlToCheck;
      });
      
      if (isBlocked) {
        // Get the extension's blocked.html URL
        const blockedUrl = chrome.runtime.getURL('blocked.html');
        
        // Only redirect if we're not already on the blocked page
        if (!tab.url.includes(blockedUrl)) {
          console.log('Blocking access to:', urlToCheck);
          chrome.tabs.update(tabId, { url: blockedUrl });
        }
      }
    } catch (error) {
      console.error('Error checking URL:', error);
    }
  }
});