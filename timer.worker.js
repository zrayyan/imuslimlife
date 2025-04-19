/* eslint-disable no-restricted-globals */
/**
 * Prayer Times Web Worker 
 * Provides background processing for prayer time tracking even when browser tabs are inactive
 */

let timerId = null;
let prayerTimes = [];
let lastPrayerCheck = Date.now();
let lastNotificationTime = {}; // Track when notifications were last sent
let athanSettings = {}; // Store athan settings

// This is the entry point for messages from the main thread
this.onmessage = function (e) {
    const { command } = e.data;
    
    if (command === 'start') {
        // Clear any existing timer
        if (timerId) {
            clearInterval(timerId);
        }

        const { interval } = e.data;
        
        // Update prayer times if provided
        if (e.data.prayerTimes) {
            prayerTimes = e.data.prayerTimes;
        }

        // Update athan settings if provided
        if (e.data.athanSettings) {
            athanSettings = e.data.athanSettings;
        }

        console.log(`[Prayer Worker] Starting prayer time tracking with ${prayerTimes.length} prayers`);

        // Start the timer with high precision
        timerId = setInterval(() => {
            const now = Date.now();
            
            // Check prayer times every second
            const checkResult = checkPrayerTimes();
            
            // If a prayer time is happening right now, notify the main thread
            if (checkResult.activePrayer) {
                self.postMessage({ 
                    type: 'athanTime',
                    prayer: checkResult.activePrayer.name,
                    dateTime: checkResult.activePrayer.dateTime,
                    settings: athanSettings
                });
            }
            
            // Every 10 seconds, send an update to the main thread
            if (now - lastPrayerCheck >= 10000) {
                lastPrayerCheck = now;
                
                if (checkResult.nextPrayer) {
                    const minutesRemaining = Math.ceil((new Date(checkResult.nextPrayer.dateTime) - new Date()) / (1000 * 60));
                    
                    self.postMessage({ 
                        type: 'prayerUpdate',
                        nextPrayer: checkResult.nextPrayer.name,
                        minutesRemaining,
                        time: new Date().toISOString()
                    });
                    
                    // If prayer is imminent (within 5 minutes), send a more frequent update
                    if (minutesRemaining <= 5) {
                        self.postMessage({ 
                            type: 'prayerImminent',
                            prayer: checkResult.nextPrayer.name,
                            minutesRemaining
                        });
                        
                        // Attempt to register a notification if it's 5 minutes before prayer time
                        attemptNotification(checkResult.nextPrayer, minutesRemaining);
                    }
                }
            }
            
            // Send heartbeat every 30 seconds to keep the worker alive
            if (now % 30000 < 1000) {
                self.postMessage({ 
                    type: 'heartbeat',
                    timestamp: new Date().toISOString()
                });
                
                // Check if we need to wake up the main thread
                checkWakeupNeeded();
            }
            
        }, interval || 1000);
    }
    else if (command === 'updatePrayerTimes') {
        // Update prayer times data
        if (e.data.prayerTimes) {
            console.log('[Prayer Worker] Updating prayer times data');
            prayerTimes = e.data.prayerTimes;
        }
    }
    else if (command === 'updateSettings') {
        // Update athan settings
        if (e.data.athanSettings) {
            console.log('[Prayer Worker] Updating athan settings');
            athanSettings = e.data.athanSettings;
        }
    }
    else if (command === 'stop') {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
            console.log('[Prayer Worker] Timer stopped by request');
            self.postMessage({ type: 'stopped' });
        }
    }
    else if (command === 'ping') {
        // Respond to ping for testing worker communication
        console.log('[Prayer Worker] Received ping, sending pong');
        self.postMessage({ type: 'pong', timestamp: new Date().toISOString() });
    }
    else {
        // Handle unknown commands
        console.warn('[Prayer Worker] Unknown command:', command);
    }
};

// Check prayer times and return information about next and active prayers
function checkPrayerTimes() {
    if (!prayerTimes || prayerTimes.length === 0) {
        return { nextPrayer: null, activePrayer: null };
    }
    
    const now = new Date();
    let nextPrayer = null;
    let activePrayer = null;
    
    // Find the next prayer time
    for (const prayer of prayerTimes) {
        const prayerTime = new Date(prayer.dateTime);
        
        // Check if this prayer is happening right now (within 30 seconds)
        const timeDiff = prayerTime - now;
        if (Math.abs(timeDiff) < 30000) {
            activePrayer = prayer;
        }
        
        // Find next upcoming prayer
        if (prayerTime > now) {
            if (!nextPrayer || prayerTime < new Date(nextPrayer.dateTime)) {
                nextPrayer = prayer;
            }
        }
    }
    
    // If no next prayer found today, return the first prayer of the day
    // (assuming it's for tomorrow)
    if (!nextPrayer && prayerTimes.length > 0) {
        nextPrayer = prayerTimes[0];
    }
    
    return { nextPrayer, activePrayer };
}

// Attempt to show a notification for an upcoming prayer
function attemptNotification(prayer, minutesRemaining) {
    // Don't send duplicate notifications - check if we've already notified for this prayer
    const prayerKey = `${prayer.name}-${new Date(prayer.dateTime).toDateString()}`;
    
    // For 5-minute warning
    if (minutesRemaining === 5 && !lastNotificationTime[`${prayerKey}-5min`]) {
        lastNotificationTime[`${prayerKey}-5min`] = Date.now();
        
        // Notify main thread to show notification
        self.postMessage({
            type: 'showNotification',
            title: `${prayer.name} Prayer in 5 minutes`,
            body: `Prepare for ${prayer.name} prayer`,
            prayer: prayer.name,
            timeRemaining: 5
        });
    }
    
    // For 1-minute warning
    if (minutesRemaining === 1 && !lastNotificationTime[`${prayerKey}-1min`]) {
        lastNotificationTime[`${prayerKey}-1min`] = Date.now();
        
        // Notify main thread to show notification
        self.postMessage({
            type: 'showNotification',
            title: `${prayer.name} Prayer in 1 minute`,
            body: `${prayer.name} prayer is starting soon`,
            prayer: prayer.name,
            timeRemaining: 1
        });
    }
}

// Check if we need to wake up the main thread for an upcoming prayer
function checkWakeupNeeded() {
    const { nextPrayer } = checkPrayerTimes();
    if (!nextPrayer) return;
    
    const now = new Date();
    const prayerTime = new Date(nextPrayer.dateTime);
    const minutesUntilPrayer = (prayerTime - now) / (1000 * 60);
    
    // If prayer is within 6 minutes, send a wakeup signal
    if (minutesUntilPrayer > 0 && minutesUntilPrayer <= 6) {
        self.postMessage({
            type: 'wakeup',
            prayer: nextPrayer.name,
            minutesRemaining: Math.ceil(minutesUntilPrayer),
            dateTime: nextPrayer.dateTime
        });
    }
}

// Cleanup old notification records (daily)
function cleanupNotificationRecords() {
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    Object.keys(lastNotificationTime).forEach(key => {
        if (now - lastNotificationTime[key] > oneDayMs) {
            delete lastNotificationTime[key];
        }
    });
}

// Run cleanup every hour
setInterval(cleanupNotificationRecords, 60 * 60 * 1000);

// Log when worker is initialized
console.log('[Prayer Worker] Prayer times worker initialized');