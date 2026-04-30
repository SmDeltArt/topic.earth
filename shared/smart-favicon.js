/**
 * SmΔrt Animated Favicon v1.1
 * Rotating delta triangle that cycles through cyan → green → yellow
 * Stops randomly at 4/3, 5/3, or 6/3 rotations (like Portal loading)
 * 
 * Usage: Just include this script in any HTML file
 * <script src="shared/smart-favicon.js"></script>
 * 
 * Or initialize manually:
 * SmartFavicon.start();
 * SmartFavicon.stop();
 */

(function() {
    'use strict';
    
    const CONFIG = {
        colors: ['%2300ffff', '%231dff00', '%23fcf20a'], // cyan, green, yellow (URL encoded)
        size: 32,
        strokeWidth: 2.5,
        cx: 16,
        cy: 17.78,
        interval: 80 // ms per frame (matches Portal)
    };
    
    let rotation = 0;
    let colorIndex = 0;
    let thirdCount = 0;
    let stopAt = null; // Will be set on start, shared globally
    let isPaused = false;
    let isStopped = false;
    let intervalId = null;
    let favicon = null;
    
    /**
     * Get or create shared stopAt value (so favicon and title stop together)
     */
    function getSharedStopAt() {
        if (!window._smartAnimationStopAt) {
            window._smartAnimationStopAt = 4 + Math.floor(Math.random() * 3);
            console.log(`🎲 SmΔrt animation stopAt set to ${window._smartAnimationStopAt}/3`);
        }
        return window._smartAnimationStopAt;
    }
    
    /**
     * Create SVG data URI for favicon
     */
    function createFaviconSVG(rot, colorUrlEncoded) {
        return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${CONFIG.size}' height='${CONFIG.size}' viewBox='0 0 ${CONFIG.size} ${CONFIG.size}'%3E%3Cpolygon points='16,5.33 26.67,24 5.33,24' fill='none' stroke='${colorUrlEncoded}' stroke-width='${CONFIG.strokeWidth}' transform='rotate(${rot} ${CONFIG.cx} ${CONFIG.cy})'/%3E%3C/svg%3E`;
    }
    
    /**
     * Update favicon
     */
    function updateFavicon() {
        if (!favicon) return;
        favicon.href = createFaviconSVG(rotation, CONFIG.colors[colorIndex]);
    }
    
    /**
     * Animation frame
     */
    function animate() {
        if (isStopped) return;
        
        updateFavicon();
        
        if (isPaused) return;
        
        // Rotate 10 degrees each frame
        rotation = (rotation + 10) % 360;
        
        // Change color at each 120° position
        if (rotation % 120 === 0) {
            thirdCount++;
            colorIndex = (colorIndex + 1) % 3;
            
            // Check if we should stop
            if (thirdCount >= stopAt) {
                isPaused = true;
                setTimeout(function() {
                    isStopped = true;
                    if (intervalId) {
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                    updateFavicon();
                    console.log(`✅ SmΔrt favicon stopped at ${thirdCount}/3 (color: ${['cyan', 'green', 'yellow'][colorIndex]})`);
                }, 400);
            } else {
                // Brief pause at each 120°
                isPaused = true;
                setTimeout(function() {
                    isPaused = false;
                }, 300);
            }
        }
    }
    
    /**
     * Initialize and start the animated favicon
     */
    function start() {
        if (intervalId) return; // Already running
        
        // Reset state
        rotation = 0;
        colorIndex = 0;
        thirdCount = 0;
        stopAt = getSharedStopAt(); // Use shared value
        isPaused = false;
        isStopped = false;
        
        // Find or create favicon element
        favicon = document.querySelector('link[rel="icon"]') || document.getElementById('favicon') || document.getElementById('dynamicFavicon');
        
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            favicon.type = 'image/svg+xml';
            favicon.id = 'dynamicFavicon';
            document.head.appendChild(favicon);
        }
        
        // Start animation loop
        intervalId = setInterval(animate, CONFIG.interval);
        console.log(`✅ SmΔrt animated favicon started (will stop at ${stopAt}/3)`);
    }
    
    /**
     * Stop the animation
     */
    function stop() {
        isStopped = true;
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    }
    
    /**
     * Check if animation is running
     */
    function isRunning() {
        return intervalId !== null && !isStopped;
    }
    
    // Export API
    window.SmartFavicon = {
        start,
        stop,
        isRunning,
        CONFIG,
        getSharedStopAt
    };
    
    // Auto-start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
