/**
 * Web Worker for reliable timer execution
 * This worker provides high-precision timers that work even when browser tabs are inactive
 */

let timerId = null;

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
console.log('[Worker] Timer worker initialized');