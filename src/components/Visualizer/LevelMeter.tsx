// src/components/Visualizer/LevelMeter.jsx
import React, { useRef, useEffect } from 'react';
import { useWebChuck } from '../../contexts/WebChuckContextProvider.js';
import './LevelMeter.css';

const LevelMeter = () => {
  const canvasRef = useRef(null);
  const { isConnected, getAudioLevel } = useWebChuck();
  const animationRef = useRef(null);
  
  // Function to draw the level meter
  const drawLevelMeter = () => {
    if (!canvasRef.current || !isConnected) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Get current dimensions
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Get audio level (0.0 to 1.0)
    const level = getAudioLevel();
    
    // Draw background
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(0, 0, width, height);
    
    // Calculate meter dimensions
    const padding = Math.floor(height * 0.1);
    const meterWidth = width - (padding * 2);
    const meterHeight = height - (padding * 2);
    
    // Draw meter background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(padding, padding, meterWidth, meterHeight);
    
    // Determine color based on level
    let meterColor;
    if (level < 0.5) {
      meterColor = '#4caf50'; // Green for low levels
    } else if (level < 0.8) {
      meterColor = '#ffeb3b'; // Yellow for medium levels
    } else {
      meterColor = '#f44336'; // Red for high levels
    }
    
    // Draw level meter
    const levelHeight = Math.max(2, Math.floor(level * meterHeight));
    ctx.fillStyle = meterColor;
    ctx.fillRect(
      padding, 
      padding + meterHeight - levelHeight, 
      meterWidth, 
      levelHeight
    );
    
    // Draw level ticks
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    
    // Draw tick marks (at 25%, 50%, 75% levels)
    for (let i = 1; i <= 3; i++) {
      const y = padding + (meterHeight * (1 - (i * 0.25)));
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(padding + meterWidth, y);
      ctx.stroke();
    }
    
    // Request next animation frame
    animationRef.current = requestAnimationFrame(drawLevelMeter);
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
      animationRef.current = requestAnimationFrame(drawLevelMeter);
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isConnected, getAudioLevel]);
  
  return (
    <div className="level-meter-container">
      <canvas 
        ref={canvasRef} 
        className="level-meter-canvas"
      />
    </div>
  );
};

export default LevelMeter;