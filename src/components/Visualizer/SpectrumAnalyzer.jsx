// src/components/Visualizer/Spectrum.jsx
import React, { useRef, useEffect } from 'react';
import { useWebChuck } from '../../contexts/WebChuckContext';
import './Spectrum.css';

const Spectrum = () => {
  const canvasRef = useRef(null);
  const { isConnected, getSpectrumData } = useWebChuck();
  const animationRef = useRef(null);
  
  // Function to draw the spectrum analyzer
  const drawSpectrum = () => {
    if (!canvasRef.current || !isConnected) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Get current dimensions
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, width, height);
    
    // Get spectrum data
    const spectrumData = getSpectrumData();
    if (!spectrumData || !spectrumData.length) {
      // Request next animation frame even if no data
      animationRef.current = requestAnimationFrame(drawSpectrum);
      return;
    }
    
    // Calculate bar dimensions
    const barCount = Math.min(spectrumData.length, 128); // Limit to 128 bars
    const barWidth = width / barCount;
    const barPadding = Math.max(1, Math.floor(barWidth * 0.1));
    
    // Draw each frequency bar
    for (let i = 0; i < barCount; i++) {
      // Get normalized value (0.0 to 1.0)
      const value = spectrumData[i];
      
      // Calculate bar height (apply some exponential scaling for better visualization)
      const barHeight = Math.pow(value, 0.8) * height;
      
      // Determine color based on frequency (gradient from blue to red)
      const hue = 240 - (i / barCount) * 240;
      ctx.fillStyle = `hsl(${hue}, 80%, 50%)`;
      
      // Draw bar
      ctx.fillRect(
        i * barWidth + barPadding,
        height - barHeight,
        barWidth - (barPadding * 2),
        barHeight
      );
    }
    
    // Draw frequency guides
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    // Draw horizontal guide lines
    for (let i = 1; i <= 4; i++) {
      const y = height * (1 - (i / 5));
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    
    // Draw frequency markers at octaves
    const octaves = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
    const maxFreq = 22050; // Nyquist frequency (assuming 44.1kHz sample rate)
    
    for (let freq of octaves) {
      if (freq > maxFreq) continue;
      
      const x = (freq / maxFreq) * width;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      
      // Draw frequency label
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      
      let label = freq >= 1000 ? `${freq/1000}k` : `${freq}`;
      ctx.fillText(label, x, height - 5);
      ctx.restore();
    }
    
    ctx.stroke();
    
    // Request next animation frame
    animationRef.current = requestAnimationFrame(drawSpectrum);
  };
  
  // Set up canvas and animation
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Resize canvas to match container
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const { width, height } = canvas.getBoundingClientRect();
      
      // Set canvas size with device pixel ratio for sharper rendering
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      
      // Scale context according to dpr
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      
      // Reset canvas style dimensions
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    
    // Initial resize
    resizeCanvas();
    
    // Add resize event listener
    window.addEventListener('resize', resizeCanvas);
    
    // Start animation if connected
    if (isConnected) {
      animationRef.current = requestAnimationFrame(drawSpectrum);
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isConnected, getSpectrumData]);
  
  return (
    <div className="spectrum-container">
      <canvas 
        ref={canvasRef} 
        className="spectrum-canvas"
      />
    </div>
  );
};

export default Spectrum;