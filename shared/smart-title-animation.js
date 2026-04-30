/**
 * SmΔrt Title Animation v1.0
 * Rotating delta in title that cycles through cyan → green → yellow
 * Stops randomly at 4/3, 5/3, or 6/3 rotations (like Portal loading)
 * Shares stopAt with smart-favicon.js so they stop together
 * 
 * Usage: Include this script and add class "delta-animation" to your delta element
 * <script src="shared/smart-title-animation.js"></script>
 * <span class="delta-animation">Δ</span>
 */

(function() {
    'use strict';
    
    const CONFIG = {
        colors: {
            hex: ['#00ffff', '#1dff00', '#fcf20a'], // cyan, green, yellow
            rgb: ['0, 255, 255', '29, 255, 0', '252, 242, 10']
        },
        interval: 80 // ms per frame (matches Portal)
    };
    
    let rotation = 0;
    let colorIndex = 0;
    let thirdCount = 0;
    let stopAt = null; // Will be set from shared value
    let isPaused = false;
    let isStopped = false;
    let intervalId = null;
    let deltaElements = [];
    
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
     * Update all delta elements with current color and rotation
     */
    function updateElements() {
        const color = CONFIG.colors.hex[colorIndex];
        const rgb = CONFIG.colors.rgb[colorIndex];
        
        deltaElements.forEach(el => {
            // Handle both SVG and text deltas
            if (el.tagName === 'svg' || el.tagName === 'SVG') {
                el.style.transform = `rotate(${rotation}deg)`;
                el.style.color = color;
                el.style.filter = `drop-shadow(0 0 10px rgba(${rgb}, 0.5))`;
                // Color the polygon/path inside - stroke only, no fill
                const shapes = el.querySelectorAll('polygon, path');
                shapes.forEach(shape => {
                    // Keep fill as none (outline only), just change stroke color
                    shape.setAttribute('stroke', color);
                });
            } else {
                el.style.transform = `rotate(${rotation}deg)`;
                el.style.color = color;
                el.style.textShadow = `0 0 10px rgba(${rgb}, 0.5)`;
            }
        });
    }
    
    /**
     * Animation frame
     */
    function animate() {
        if (isStopped) return;
        
        updateElements();
        
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
                    updateElements();
                    console.log(`✅ SmΔrt title animation stopped at ${thirdCount}/3 (color: ${['cyan', 'green', 'yellow'][colorIndex]})`);
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
     * Initialize and start the animation
     */
    function start() {
        if (intervalId) return; // Already running
        
        // Find all delta elements
        deltaElements = Array.from(document.querySelectorAll('.delta-animation'));
        
        if (deltaElements.length === 0) {
            console.log('⚠ No .delta-animation elements found');
            return;
        }
        
        // Disable CSS animations on these elements (JS takes control)
        deltaElements.forEach(el => {
            el.style.animation = 'none';
            el.style.transition = 'none';
            el.style.display = 'inline-block'; // Required for transform
        });
        
        // Reset state
        rotation = 0;
        colorIndex = 0;
        thirdCount = 0;
        stopAt = getSharedStopAt(); // Use shared value so favicon & title stop together
        isPaused = false;
        isStopped = false;
        
        // Start animation loop
        intervalId = setInterval(animate, CONFIG.interval);
        console.log(`✅ SmΔrt title animation started (using shared stopAt: ${stopAt}/3)`);
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
    window.SmartTitleAnimation = {
        start,
        stop,
        isRunning,
        CONFIG
    };
    
    // Auto-start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        // Small delay to ensure elements are rendered
        setTimeout(start, 100);
    }
})();
