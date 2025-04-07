// src/components/Visualizer/Spectrum.jsx
import React, { useRef, useEffect } from 'react';
import { useWebChuck } from '../../contexts/WebChuckContextProvider.js';
import './Spectrum.css';

const Spectrum = () => {
  const canvasRef = useRef(null);
  const { isConnected } = useWebChuck();
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Size canvas correctly
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    
    // Initial resize
    resize();
    window.addEventListener('resize', resize);
    
    // Draw empty spectrum initially
    drawEmptySpectrum(ctx, canvas);
    
    // Set up event listener for incoming audio data
    const audioDataListener = (data) => {
      if (data.spectrum) {
        drawSpectrum(ctx, canvas, data.spectrum);
      }
    };
    
    // Register with WebChuck service
    let removeListener;
    if (isConnected) {
      removeListener = window.webchuckService?.addEventListener('audioData', audioDataListener);
    }
    
    // Animation frame ID for cleaning up
    let animationId;
    
    // Demo animation if not connected
    if (!isConnected) {
      const drawDemoSpectrum = () => {
        const demoData = generateDemoSpectrum();
        drawSpectrum(ctx, canvas, demoData);
        animationId = requestAnimationFrame(drawDemoSpectrum);
      };
      
      animationId = requestAnimationFrame(drawDemoSpectrum);
    }
    
    return () => {
      window.removeEventListener('resize', resize);
      if (removeListener) removeListener();
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isConnected]);
  
  // Function to draw empty spectrum
  const drawEmptySpectrum = (ctx, canvas) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw frequency guidelines
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    
    // Draw horizontal lines (amplitude)
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Draw text if not connected
    if (!isConnected) {
      ctx.font = '14px Arial';
      ctx.fillStyle = '#999';
      ctx.textAlign = 'center';
      ctx.fillText('Connect to see frequency spectrum', canvas.width / 2, 30);
    }
  };
  
  // Function to draw spectrum data
  const drawSpectrum = (ctx, canvas, data) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw frequency guidelines
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    
    // Draw horizontal lines (amplitude)
    for (let i = 0; i <= 4; i++) {
      const y = (i / 4) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    
    // Calculate bar width based on data length
    const barWidth = canvas.width / data.length;
    const barMargin = Math.max(1, barWidth * 0.1);
    const adjustedBarWidth = barWidth - barMargin;

    // src/components/Visualizer/Spectrum.jsx (continued)

    // Draw spectrum bars
    for (let i = 0; i < data.length; i++) {
      // Normalize value (assuming data range is 0-1)
      const value = data[i];

      // Transform to log scale for better visualization
      const logValue = Math.log10(1 + value * 9) / Math.log10(10);

      // Calculate bar height (inverted, since canvas y=0 is at top)
      const barHeight = logValue * canvas.height;

      // Calculate position
      const x = i * barWidth;
      const y = canvas.height - barHeight;

      // Create gradient for bars
      const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
      gradient.addColorStop(0, '#4a90e2');
      gradient.addColorStop(1, '#185091');

      // Draw bar
      ctx.fillStyle = gradient;
      ctx.fillRect(x + barMargin/2, y, adjustedBarWidth, barHeight);
    }

    // Draw frequency labels
    ctx.font = '10px Arial';
    ctx.fillStyle = '#999';
    ctx.textAlign = 'center';

    const frequencies = [20, 100, 500, 1000, 5000, 10000, 20000];
    frequencies.forEach(freq => {
      // Convert frequency to position (assuming data spans 0-22050 Hz)
      const normalizedPos = Math.log10(freq / 20) / Math.log10(1000);
      const x = normalizedPos * canvas.width;

      if (x >= 0 && x <= canvas.width) {
        ctx.fillText(freq >= 1000 ? `${freq/1000}k` : freq, x, canvas.height - 5);
      }
    });
  };

  // Generate demo spectrum data when not connected
  const generateDemoSpectrum = () => {
    const data = [];
    const bins = 64;
    const time = Date.now() / 1000;

    for (let i = 0; i < bins; i++) {
      // Create interesting evolving pattern
      const normalizedBin = i / bins;

      // Base shape (rolloff at higher frequencies)
      let value = 0.7 * Math.pow(1 - normalizedBin, 1.2);

      // Add some peaks at certain frequency bands
      value += 0.3 * Math.exp(-Math.pow((normalizedBin - 0.1), 2) / 0.01);
      value += 0.5 * Math.exp(-Math.pow((normalizedBin - 0.3), 2) / 0.02);

      // Add time-based movement
      value += 0.2 * Math.sin(time * 2 + normalizedBin * 10) * Math.exp(-Math.pow((normalizedBin - 0.6), 2) / 0.05);

      // Ensure values are positive and in range
      data.push(Math.max(0, Math.min(1, value)));
    }

    return data;
  };

  return (
      <div className="spectrum-container">
        <canvas ref={canvasRef} className="spectrum-canvas" />
      </div>
  );
};

export default Spectrum;