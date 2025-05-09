import { 
  getBlockedSites, 
  getCurrentSession,
  toggleSiteBlocking,
  isAdBlockingEnabled,
  toggleAdBlocking,
  saveBlockedSite
} from './storage.js';

document.addEventListener('DOMContentLoaded', initializePopup);

// Initialize the popup interface
async function initializePopup() {
  updateBlockingStatus();
  updateAdBlockingStatus();
  setupTimer();
  setupEventListeners();
  loadRecentSites();
}

// Set up all event listeners
function setupEventListeners() {
  // Pomodoro timer buttons
  document.getElementById('start-25').addEventListener('click', () => startTimer(25));
  document.getElementById('start-50').addEventListener('click', () => startTimer(50));
  document.getElementById('stop-timer').addEventListener('click', stopTimer);
  
  // Action buttons
  document.getElementById('block-current').addEventListener('click', blockCurrentSite);
  document.getElementById('toggle-blocking').addEventListener('click', toggleBlocking);
  
  // Settings button
  document.getElementById('open-settings').addEventListener('click', openSettings);
  
  // Ad blocking status toggle
  document.getElementById('ad-blocking-status').addEventListener('click', toggleAdBlockingStatus);
}

// Update the status indicator for site blocking
async function updateBlockingStatus() {
  const { blockingEnabled } = await chrome.storage.sync.get('blockingEnabled');
  const statusIndicator = document.getElementById('status-indicator');
  const toggleButton = document.getElementById('toggle-blocking');
  const toggleText = document.getElementById('toggle-text');
  
  if (blockingEnabled) {
    statusIndicator.textContent = 'Active';
    statusIndicator.classList.add('active');
    statusIndicator.classList.remove('inactive');
    toggleText.textContent = 'Disable Blocking';
  } else {
    statusIndicator.textContent = 'Inactive';
    statusIndicator.classList.add('inactive');
    statusIndicator.classList.remove('active');
    toggleText.textContent = 'Enable Blocking';
  }
}

// Toggle site blocking on/off
async function toggleBlocking() {
  const { blockingEnabled } = await chrome.storage.sync.get('blockingEnabled');
  await chrome.storage.sync.set({ blockingEnabled: !blockingEnabled });
  updateBlockingStatus();
}

// Show ad blocking status
async function updateAdBlockingStatus() {
  const enabled = await isAdBlockingEnabled();
  const statusElement = document.getElementById('ad-blocking-status');
  
  statusElement.textContent = `Ad blocking: ${enabled ? 'On' : 'Off'}`;
  statusElement.classList.toggle('enabled', enabled);
  statusElement.classList.toggle('disabled', !enabled);
}

// Toggle ad blocking on/off
async function toggleAdBlockingStatus() {
  await toggleAdBlocking();
  updateAdBlockingStatus();
}

// Set up timer display and functionality
async function setupTimer() {
  const currentSession = await getCurrentSession();
  const timerDisplay = document.getElementById('timer');
  const timerStatus = document.getElementById('timer-status');
  const stopButton = document.getElementById('stop-timer');
  
  if (currentSession && currentSession.active) {
    // Calculate remaining time
    const now = Date.now();
    const timeLeft = Math.max(0, currentSession.endTime - now);
    
    if (timeLeft > 0) {
      updateTimerDisplay(timeLeft);
      timerStatus.textContent = 'Focus session active';
      stopButton.disabled = false;
      
      // Start countdown
      window.timerInterval = setInterval(() => {
        const currentTime = Date.now();
        const remaining = Math.max(0, currentSession.endTime - currentTime);
        
        if (remaining <= 0) {
          clearInterval(window.timerInterval);
          resetTimerDisplay();
        } else {
          updateTimerDisplay(remaining);
        }
      }, 1000);
    } else {
      resetTimerDisplay();
    }
  } else {
    resetTimerDisplay();
  }
}

// Format and display the timer
function updateTimerDisplay(timeInMs) {
  const minutes = Math.floor(timeInMs / (60 * 1000));
  const seconds = Math.floor((timeInMs % (60 * 1000)) / 1000);
  
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  document.getElementById('timer').textContent = formattedTime;
}

// Reset the timer display
function resetTimerDisplay() {
  document.getElementById('timer').textContent = '00:00';
  document.getElementById('timer-status').textContent = 'Not running';
  document.getElementById('stop-timer').disabled = true;
  
  if (window.timerInterval) {
    clearInterval(window.timerInterval);
  }
}

// Start a new focus session timer
async function startTimer(minutes) {
  // Clear any existing timer
  if (window.timerInterval) {
    clearInterval(window.timerInterval);
  }
  
  // Request the service worker to start a new session
  chrome.runtime.sendMessage(
    { action: 'startSession', duration: minutes },
    async (response) => {
      if (response && response.success) {
        document.getElementById('timer-status').textContent = `${minutes} min focus session`;
        document.getElementById('stop-timer').disabled = false;
        
        // Set up the countdown
        await setupTimer();
      } else {
        console.error('Failed to start session:', response?.error);
        alert('Failed to start focus session. Please try again.');
      }
    }
  );
}

// Stop the current focus session
function stopTimer() {
  chrome.runtime.sendMessage(
    { action: 'endSession' },
    (response) => {
      if (response && response.success) {
        resetTimerDisplay();
      } else {
        console.error('Failed to end session:', response?.error);
      }
    }
  );
}

// Block the current website
async function blockCurrentSite() {
  try {
    // Get the active tab URL
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentTab = tabs[0];
    
    if (currentTab && currentTab.url) {
      const url = new URL(currentTab.url);
      
      // Skip chrome:// URLs and extension pages
      if (url.protocol === 'chrome:' || url.protocol === 'chrome-extension:') {
        alert('Cannot block browser or extension pages.');
        return;
      }
      
      const hostname = url.hostname;
      
      // Add this site to blocked sites
      await saveBlockedSite({
        url: hostname,
        title: currentTab.title || hostname,
        dateAdded: Date.now(),
        isCurrentlyBlocked: true
      });
      
      // Enable blocking if it's not already enabled
      const { blockingEnabled } = await chrome.storage.sync.get('blockingEnabled');
      if (!blockingEnabled) {
        await chrome.storage.sync.set({ blockingEnabled: true });
        updateBlockingStatus();
      }
      
      // Refresh the blocked sites list
      await loadRecentSites();
      
      // Update UI and notify user
      alert(`${hostname} has been blocked. The page will refresh to apply blocking.`);
      
      // Refresh the current tab to apply blocking
      chrome.tabs.reload(currentTab.id);
    }
  } catch (error) {
    console.error('Error blocking site:', error);
    alert('Failed to block site. Please try again.');
  }
}

// Load and display recently blocked sites
async function loadRecentSites() {
  const sites = await getBlockedSites();
  const sitesList = document.getElementById('recent-sites');
  
  // Clear current list
  sitesList.innerHTML = '';
  
  if (sites.length === 0) {
    const emptyMessage = document.createElement('li');
    emptyMessage.className = 'empty-message';
    emptyMessage.textContent = 'No recently blocked sites';
    sitesList.appendChild(emptyMessage);
    return;
  }
  
  // Get the 5 most recently added sites
  const recentSites = [...sites]
    .sort((a, b) => b.dateAdded - a.dateAdded)
    .slice(0, 5);
  
  // Create list items
  recentSites.forEach(site => {
    const listItem = document.createElement('li');
    listItem.className = `site-item ${site.isCurrentlyBlocked ? 'blocked' : 'unblocked'}`;
    
    const siteInfo = document.createElement('div');
    siteInfo.className = 'site-info';
    
    const siteTitle = document.createElement('span');
    siteTitle.className = 'site-title';
    siteTitle.textContent = site.title || site.url;
    
    const siteUrl = document.createElement('span');
    siteUrl.className = 'site-url';
    siteUrl.textContent = site.url;
    
    const toggleButton = document.createElement('button');
    toggleButton.className = 'button small ' + (site.isCurrentlyBlocked ? 'danger' : 'primary');
    toggleButton.textContent = site.isCurrentlyBlocked ? 'Unblock' : 'Block';
    toggleButton.dataset.siteId = site.id;
    toggleButton.addEventListener('click', toggleSiteBlock);
    
    siteInfo.appendChild(siteTitle);
    siteInfo.appendChild(siteUrl);
    listItem.appendChild(siteInfo);
    listItem.appendChild(toggleButton);
    sitesList.appendChild(listItem);
  });
}

// Toggle blocking for a specific site
async function toggleSiteBlock(event) {
  const siteId = event.target.dataset.siteId;
  if (!siteId) return;
  
  try {
    await toggleSiteBlocking(siteId);
    await loadRecentSites();
    
    // Refresh all tabs with this site to apply changes
    const sites = await getBlockedSites();
    const site = sites.find(s => s.id === siteId);
    
    if (site) {
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        if (tab.url && tab.url.includes(site.url)) {
          chrome.tabs.reload(tab.id);
        }
      });
    }
  } catch (error) {
    console.error('Error toggling site:', error);
    alert('Failed to update site status. Please try again.');
  }
}

// Open settings page
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Listen for messages from the service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'sessionStarted') {
    setupTimer();
  } else if (message.action === 'sessionEnded') {
    resetTimerDisplay();
  }
});