/**
 * Web Worker for reliable timer execution
 * This worker provides high-precision timers that work even when browser tabs are inactive
 */

/*let timerId = null;

// This is the entry point for messages from the main thread
self.onmessage = function (e) {
    if (e.data.command === 'start') {
        // Clear any existing timer
        if (timerId) {
            clearInterval(timerId);
        }

        const { duration, interval } = e.data;
        const endTime = Date.now() + duration * 1000;

        // Log start in worker
        console.log(`[Worker] Starting timer for ${duration} seconds`);

        // Start the timer
        timerId = setInterval(() => {
            const remaining = Math.round((endTime - Date.now()) / 1000);

            // Send updates to the main thread
            self.postMessage({ type: 'tick', remaining });

            // Check if we're done
            if (remaining <= 0) {
                clearInterval(timerId);
                timerId = null;
                console.log('[Worker] Timer complete, sending completion message');
                self.postMessage({ type: 'complete' });
            }
        }, interval || 250);
    }
    else if (e.data.command === 'stop') {
        if (timerId) {
            clearInterval(timerId);
            timerId = null;
            console.log('[Worker] Timer stopped by request');
            self.postMessage({ type: 'stopped' });
        }
    }
    else if (e.data.command === 'ping') {
        // Respond to ping for testing worker communication
        console.log('[Worker] Received ping, sending pong');
        self.postMessage({ type: 'pong' });
    }
    else {
        // Handle unknown commands
        console.warn('[Worker] Unknown command:', e.data.command);
    }
};

// Log when worker is initialized
console.log('[Worker] Timer worker initialized');*/
/* eslint-disable no-restricted-globals */
/**
 * Prayer Times Web Worker 
 * Provides background processing for prayer time tracking even when browser tabs are inactive
 */

let timerId = null;
let prayerTimes = [];
let lastPrayerCheck = Date.now();

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

        console.log(`[Prayer Worker] Starting prayer time tracking`);

        // Start the timer
        timerId = setInterval(() => {
            const now = Date.now();
            
            // Check prayer times
            const nextPrayer = checkNextPrayer();
            
            // Every 10 seconds, send an update to the main thread
            if (now - lastPrayerCheck >= 10000) {
                lastPrayerCheck = now;
                
                if (nextPrayer) {
                    const minutesRemaining = Math.ceil((new Date(nextPrayer.dateTime) - new Date()) / (1000 * 60));
                    
                    self.postMessage({ 
                        type: 'prayerUpdate',
                        nextPrayer: nextPrayer.name,
                        minutesRemaining,
                        time: new Date().toISOString()
                    });
                    
                    // If prayer is imminent (within 5 minutes), send a more frequent update
                    if (minutesRemaining <= 5) {
                        self.postMessage({ 
                            type: 'prayerImminent',
                            prayer: nextPrayer.name,
                            minutesRemaining
                        });
                    }
                }
            }
            
            // Send heartbeat to keep the worker alive
            self.postMessage({ 
                type: 'heartbeat',
                timestamp: new Date().toISOString()
            });
            
        }, interval || 1000);
    }
    else if (command === 'updatePrayerTimes') {
        // Update prayer times data
        if (e.data.prayerTimes) {
            console.log('[Prayer Worker] Updating prayer times data');
            prayerTimes = e.data.prayerTimes;
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
        self.postMessage({ type: 'pong' });
    }
    else {
        // Handle unknown commands
        console.warn('[Prayer Worker] Unknown command:', command);
    }
};

// Find the next prayer time
function checkNextPrayer() {
    if (!prayerTimes || prayerTimes.length === 0) {
        return null;
    }
    
    const now = new Date();
    
    // Find the next prayer time
    for (const prayer of prayerTimes) {
        const prayerTime = new Date(prayer.dateTime);
        if (prayerTime > now) {
            return prayer;
        }
    }
    
    // If no next prayer found today, return the first prayer of the day
    // (assuming it's for tomorrow)
    return prayerTimes[0];
}

// Calculate time remaining until a prayer time
function getTimeRemaining(prayerTime) {
    const now = new Date();
    const prayerDate = new Date(prayerTime);
    return Math.max(0, prayerDate - now);
}

// Log when worker is initialized
console.log('[Prayer Worker] Prayer times worker initialized');