import { getCurrentSession, getPasswordProtection } from './storage.js';

document.addEventListener('DOMContentLoaded', initialize);

// Initialize the blocked page
async function initialize() {
  updateTimerDisplay();
  setupEventListeners();
}

// Update timer display if there's an active session
async function updateTimerDisplay() {
  const currentSession = await getCurrentSession();
  const timerInfo = document.getElementById('timer-info');
  const countdown = document.getElementById('countdown');
  
  if (currentSession && currentSession.active) {
    timerInfo.classList.remove('hidden');
    
    // Calculate remaining time
    const now = Date.now();
    const timeLeft = Math.max(0, currentSession.endTime - now);
    
    if (timeLeft > 0) {
      updateCountdown(timeLeft);
      
      // Start countdown
      window.timerInterval = setInterval(() => {
        const currentTime = Date.now();
        const remaining = Math.max(0, currentSession.endTime - currentTime);
        
        if (remaining <= 0) {
          clearInterval(window.timerInterval);
          timerInfo.classList.add('hidden');
        } else {
          updateCountdown(remaining);
        }
      }, 1000);
    } else {
      timerInfo.classList.add('hidden');
    }
  } else {
    timerInfo.classList.add('hidden');
  }
}

// Format and display the countdown
function updateCountdown(timeInMs) {
  const minutes = Math.floor(timeInMs / (60 * 1000));
  const seconds = Math.floor((timeInMs % (60 * 1000)) / 1000);
  
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  document.getElementById('countdown').textContent = formattedTime;
}

// Set up all event listeners
function setupEventListeners() {
  // Go back button
  document.getElementById('go-back').addEventListener('click', () => {
    window.history.back();
  });
  
  // Temporary access button
  document.getElementById('temp-access').addEventListener('click', showPasswordModal);
  
  // Password modal
  document.getElementById('close-modal').addEventListener('click', hidePasswordModal);
  document.getElementById('submit-password').addEventListener('click', verifyPassword);
  
  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    const modal = document.getElementById('password-modal');
    if (event.target === modal) {
      hidePasswordModal();
    }
  });
}

// Show the password modal
function showPasswordModal() {
  document.getElementById('password-modal').classList.remove('hidden');
}

// Hide the password modal
function hidePasswordModal() {
  document.getElementById('password-modal').classList.add('hidden');
}

// Verify password and grant temporary access
async function verifyPassword() {
  const passwordInput = document.getElementById('override-password').value;
  const durationSelect = document.getElementById('override-duration').value;
  
  // Get stored password
  const passwordProtection = await getPasswordProtection();
  
  if (!passwordProtection.enabled) {
    // Password protection not enabled, grant access
    grantTemporaryAccess(parseInt(durationSelect, 10));
    return;
  }
  
  if (passwordInput === passwordProtection.password) {
    // Password matches, grant access
    grantTemporaryAccess(parseInt(durationSelect, 10));
  } else {
    // Password doesn't match
    alert('Incorrect password. Please try again.');
  }
}

// Grant temporary access to the blocked site
function grantTemporaryAccess(durationMinutes) {
  // Get the URL from the referrer
  const referrer = document.referrer;
  
  if (!referrer) {
    alert('Cannot determine the original URL. Please try again.');
    return;
  }
  
  // Redirect to the original URL
  window.location.href = referrer;
  
  // Note: In a real extension, we would also need to notify the service worker
  // to temporarily allow this site for the specified duration
}