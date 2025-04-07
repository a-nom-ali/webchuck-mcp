// js/audioVisualizer.js
import * as UI from './ui.js';
import {getAudioContext} from "./webchuckService.js";
import * as WebChuckService from "./webchuckService.js";

// Audio visualizer module
const AudioVisualizer = (function() {
    // Private variables
    let audioContext = null;
    let audioSource = null;
    let analyser = null;
    let dataArray = null;
    let waveformCanvas = null;
    let waveformCtx = null;
    let spectrumCanvas = null;
    let spectrumCtx = null;
    let levelMeterCanvas = null;
    let levelMeterCtx = null;
    let animationFrame = null;
    let isActive = false;
    
    // Initialize visualizer components
    function initVisualizer() {
        // Get canvas elements
        waveformCanvas = document.getElementById('waveform-canvas');
        spectrumCanvas = document.getElementById('spectrum-canvas');
        levelMeterCanvas = document.getElementById('level-meter-canvas');
        
        if (!waveformCanvas || !spectrumCanvas || !levelMeterCanvas) {
            console.error('Visualizer canvases not found');
            return false;
        }
        
        // Get canvas contexts
        waveformCtx = waveformCanvas.getContext('2d');
        spectrumCtx = spectrumCanvas.getContext('2d');
        levelMeterCtx = levelMeterCanvas.getContext('2d');
        
        // Set initial canvas sizes (can be made responsive)
        resizeCanvases();
        
        // Create event listener for window resize
        window.addEventListener('resize', resizeCanvases);
        
        return true;
    }
    
    // Resize canvases based on container size
    function resizeCanvases() {
        if (!waveformCanvas || !spectrumCanvas || !levelMeterCanvas) return;
        
        // Get container dimensions
        const visualizerContainer = UI.DOMElements.visualizerContainer();
        if (!visualizerContainer) return;
        
        // Get container dimensions
        const spectrumGroup = UI.DOMElements.spectrumGroup();
        if (!spectrumGroup) return;

        // Get container dimensions
        const levelGroup = UI.DOMElements.levelGroup();
        if (!levelGroup) return;

        const containerWidth = visualizerContainer.clientWidth;
        const spectrumWidth = spectrumGroup.clientWidth;
        const levelWidth = levelGroup.clientWidth;

        // Set canvas dimensions
        waveformCanvas.width = containerWidth;
        waveformCanvas.height = 100;
        
        spectrumCanvas.width = spectrumWidth;
        spectrumCanvas.height = 100;
        
        levelMeterCanvas.width = lelvelWidth;
        levelMeterCanvas.height = 200;
        
        // Re-render visualizations if active
        if (isActive) {
            drawVisualizations();
        }
    }

    // Connect to WebChucK audio
    function connectToAudio() {
        try {
            // Get the WebChucK AudioContext
            audioContext = getAudioContext();
            const theChuck = WebChuckService.getChuckInstance();
            
            if (!audioContext || !theChuck) {
                console.error('Audio context not found in WebChucK instance');
                return false;
            }
            
            // Create analyzer node

            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            const bufferLength = analyser.frequencyBinCount;
            dataArray = new Uint8Array(bufferLength);
            
            // Connect the WebChucK output to our analyzer
            theChuck.connect(analyser);
            
            // And connect the analyzer to the destination
            analyser.connect(audioContext.destination);
            
            UI.updateConsole('Audio visualizer connected to WebChucK output');
            return true;
        } catch (error) {
            console.error('Error connecting to audio:', error);
            UI.updateConsole(`Error connecting audio visualizer: ${error.message}`);
            return false;
        }
    }
    
    // Start visualization loop
    function startVisualization() {
        if (!analyser || !dataArray) {
            console.error('Cannot start visualization: analyzer not initialized');
            return false;
        }
        
        isActive = true;
        animationLoop();
        return true;
    }
    
    // Stop visualization loop
    function stopVisualization() {
        isActive = false;
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
            animationFrame = null;
        }
        
        // Clear canvases
        if (waveformCtx) clearCanvas(waveformCtx, waveformCanvas.width, waveformCanvas.height);
        if (spectrumCtx) clearCanvas(spectrumCtx, spectrumCanvas.width, spectrumCanvas.height);
        if (levelMeterCtx) clearCanvas(levelMeterCtx, levelMeterCanvas.width, levelMeterCanvas.height);
    }
    
    // Animation loop for visualizers
    function animationLoop() {
        if (!isActive) return;
        
        drawVisualizations();
        animationFrame = requestAnimationFrame(animationLoop);
    }
    
    // Draw all visualizations
    function drawVisualizations() {
        if (!analyser || !dataArray) return;
        
        // Get current audio data
        analyser.getByteTimeDomainData(dataArray); // Waveform data
        const waveformData = [...dataArray];
        
        analyser.getByteFrequencyData(dataArray); // Frequency data
        const frequencyData = [...dataArray];

        // Calculate level meter level bands
        const levelBands = [0.2, 0.4, 0.6, 0.8];
        const levels = levelBands.map(band => {
            const threshold = band * 255;
            return frequencyData.filter(value => value > threshold).length / frequencyData.length;
        });

        // // Calculate average level
        // const average = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length;
        // const level = average / 255; // Normalized level (0-1)
        
        // Draw visualizations
        drawWaveform(waveformData);
        drawSpectrum(frequencyData);
        drawLevelMeter(levels);
    }
    
    // Draw waveform visualization
    function drawWaveform(data) {
        if (!waveformCtx || !waveformCanvas) return;
        
        const width = waveformCanvas.width;
        const height = waveformCanvas.height;
        
        // Clear canvas
        clearCanvas(waveformCtx, width, height);
        
        // Draw background
        waveformCtx.fillStyle = 'rgba(6, 5, 12, 0)';
        waveformCtx.fillRect(0, 0, width, height);
        
        // Draw waveform
        waveformCtx.lineWidth = 2;
        waveformCtx.strokeStyle = 'rgb(0, 255, 255)';
        waveformCtx.beginPath();
        
        const sliceWidth = width / data.length;
        let x = 0;
        
        for (let i = 0; i < data.length; i++) {
            const v = data[i] / 128.0;
            const y = v * height / 2;
            
            if (i === 0) {
                waveformCtx.moveTo(x, y);
            } else {
                waveformCtx.lineTo(x, y);
            }
            
            x += sliceWidth;
        }
        
        waveformCtx.lineTo(width, height / 2);
        waveformCtx.stroke();
    }
    
    // Draw frequency spectrum visualization
    function drawSpectrum(data) {
        if (!spectrumCtx || !spectrumCanvas) return;
        
        const width = spectrumCanvas.width;
        const height = spectrumCanvas.height;
        
        // Clear canvas
        clearCanvas(spectrumCtx, width, height);
        
        // Draw background
        spectrumCtx.fillStyle = 'rgba(6, 5, 12, 0)';
        spectrumCtx.fillRect(0, 0, width, height);
        
        // Number of bars to display (limit for performance)
        const barCount = Math.min(data.length, 256);
        const barWidth = width / barCount;
        
        // Draw spectrum bars
        for (let i = 0; i < barCount; i++) {
            const value = data[i];
            const percent = value / 255;
            const barHeight = height * percent;
            const hue = i / barCount * 360;
            
            spectrumCtx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            spectrumCtx.fillRect(i * barWidth, height - barHeight, barWidth, barHeight);
        }
    }

    function lerp(a, b, t) {
        return a + (b - a) * t;
    }

    function colorLerp(startColor, endColor, t) {
        const r = lerp(startColor[0], endColor[0], t);
        const g = lerp(startColor[1], endColor[1], t);
        const b = lerp(startColor[2], endColor[2], t);
        return `rgb(${r},${g},${b})`;
    }

    // Draw level meter visualization
    // Let's make this so that it can show different level bands
    function drawLevelMeter(levels) {
        if (!levelMeterCtx || !levelMeterCanvas) return;
        
        const width = levelMeterCanvas.width;
        const height = levelMeterCanvas.height;
        
        // Clear canvas
        clearCanvas(levelMeterCtx, width, height);
        
        // Draw background
        levelMeterCtx.fillStyle = 'rgba(6, 5, 12, 0)';
        levelMeterCtx.fillRect(0, 0, width, height);

        const meterWidth = width/levels.length;

        const colorRange = [
            { index: 0, start: 0, end: 0.35, color: [0, 255, 255] }, // Green for lower levels
            { index: 1, start: 0.35, end: 0.65, color: [255, 255, 0] }, // Yellow for medium levels
            { index: 2, start: 0.65, end: 0.9, color: [255, 0, 255] }, // Magenta> for high levels
            { index: 3, start: 0.9, end: 1, color: [255, 0, 0] }, // Red for high levels
        ]
        let gradientColorRange = [];
        for (let i = 0; i < 10; i++) {
            const percent = i/10;
            const range = colorRange.find(range => percent >= range.start && percent <= range.end);
            const relativePosition = (percent - range.start) / (range.end - range.start);
            const color =
                range.index === colorRange.length-1
                    ? range.color
                    : colorLerp(range.color, colorRange[range.index+1].color, relativePosition);

            gradientColorRange.push({
                start: i/10,
                end: (i+1)/10,
                color: color
            });
        }

        // loop through levels
        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];

            // Draw level indicator
            const meterHeight = height * level;
            const meterXOffset = i * meterWidth;

            // Color gradient based on level
            levelMeterCtx.fillStyle = gradientColorRange[parseInt(Math.floor(level * 9))].color;
            levelMeterCtx.fillRect(meterXOffset, height - meterHeight, meterWidth, meterHeight);

        }

        // Draw level markers
        levelMeterCtx.strokeStyle = 'rgb(41, 13, 76)';
        levelMeterCtx.lineWidth = 1;
        
        for (let i = 0; i <= 10; i++) {
            const y = height - (height * (i / 10));
            levelMeterCtx.beginPath();
            levelMeterCtx.moveTo(0, y);
            levelMeterCtx.lineTo(width, y);
            levelMeterCtx.stroke();
        }
    }
    
    // Helper to clear canvas
    function clearCanvas(ctx, width, height) {
        ctx.clearRect(0, 0, width, height);
    }
    
    // Public API
    return {
        // Initialize the visualizer
        initVisualizer: function() {
            return initVisualizer();
        },
        
        // Connect to WebChucK instance
        connectToAudio: function() {
            return connectToAudio();
        },
        
        // Start visualization
        startVisualization: function() {
            return startVisualization();
        },
        
        // Stop visualization
        stopVisualization: function() {
            stopVisualization();
        },
        
        // Check if visualizer is active
        isVisualizerActive: function() {
            return isActive;
        }
    };
})();

export default AudioVisualizer;
