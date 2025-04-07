// src/components/Visualizer/LevelMeter.jsx
import React, { useRef, useEffect, useState } from 'react';
import { useWebChuck } from '../../contexts/WebChuckContext';
import './LevelMeter.css';

const LevelMeter = () => {
  const canvasRef = useRef(null);
  const { isConnected } = useWebChuck();
  const [peakLevel, setPeakLevel] = useState(-60); // dB
  const [rmsLevel, setRmsLevel] = useState(-60); // dB
  
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
    
    // Draw empty meter initially
    drawLevelMeter(ctx, canvas, rmsLevel, peakLevel);
    
    // Set up event listener for incoming audio data
    const audioDataListener = (data) => {
      if (data.rms !== undefined) {
        // Convert linear amplitude to dB
        const rmsDb = 20 * Math.log10(Math.max(0.00001, data.rms));
        setRmsLevel(rmsDb);
      }
      
      if (data.peak !== undefined) {
        // Convert linear amplitude to dB
        const peakDb = 20 * Math.log10(Math.max(0.00001, data.peak));
        setPeakLevel(peakDb);
      }
    };
    
    // Register with WebChuck service
    let removeListener;
    if (isConnected) {
      removeListener = window.webchuckService?.addEventListener('audioData', audioDataListener);
    }
    
    // Animation frame ID for cleaning up
    let animationId;
    let lastUpdateTime = 0;
    
    // Demo animation if not connected
    if (!isConnected) {
      const animate = (timestamp) => {
        // Update at most 30 times per second
        if (timestamp - lastUpdateTime > 33) {
          lastUpdateTime = timestamp;
          
          // Generate demo levels
          const time = timestamp / 1000;
          const demoRmsDb = -30 + 15 * Math.sin(time * 0.5) - 5 * Math.sin(time * 1.3);
          const demoPeakDb = demoRmsDb + 5 + 5 * Math.sin(time * 3.7);
          
          setRmsLevel(demoRmsDb);
          setPeakLevel(demoPeakDb);
        }
        
        animationId = requestAnimationFrame(animate);
      };
      
      animationId = requestAnimationFrame(animate);
    }
    
    return () => {
      window.removeEventListener('resize', resize);
      if (removeListener) removeListener();
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isConnected]);
  
  // Draw the level meter every time levels change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    drawLevelMeter(ctx, canvas, rmsLevel, peakLevel);
  }, [rmsLevel, peakLevel]);
  
  // Function to draw level meter
  const drawLevelMeter = (ctx, canvas, rmsDb, peakDb) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Define dB range and positions
    const minDb = -60; // Lowest visible level
    const maxDb = 0;   // 0dB (maximum level)
    
    // Visible area dimensions
    const meterWidth = canvas.width * 0.8;
    const meterHeight = canvas.height * 0.7;
    const meterX = (canvas.width - meterWidth) / 2;
    const meterY = (canvas.height - meterHeight) / 2;
    
    // Draw background
    ctx.fillStyle = '#222';
    ctx.fillRect(meterX, meterY, meterWidth, meterHeight);
    
    // Draw level markings and labels
    const dbMarks = [-60, -50, -40, -30, -20, -10, -6, -3, 0];
    
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#999';
    
    dbMarks.forEach(db => {
      const normalizedPosition = (db - minDb) / (maxDb - minDb);
      const x = meterX + normalizedPosition * meterWidth;
      
      // Draw tick mark
      ctx.beginPath();
      ctx.strokeStyle = '#666';
      ctx.moveTo(x, meterY);
      ctx.lineTo(x, meterY + meterHeight);
      ctx.stroke();
      
      // Draw label
      ctx.fillText(`${db}`, x - 5, meterY + meterHeight + 15);
    });
    
    // Calculate normalized positions for levels
    const rmsNormalized = Math.max(0, Math.min(1, (rmsDb - minDb) / (maxDb - minDb)));
    const peakNormalized = Math.max(0, Math.min(1, (peakDb - minDb) / (maxDb - minDb)));
    
    // Draw RMS level bar
    const rmsWidth = rmsNormalized * meterWidth;
    
    // Create gradient for RMS bar
    const rmsGradient = ctx.createLinearGradient(meterX, 0, meterX + meterWidth, 0);
    rmsGradient.addColorStop(0, '#4CAF50'); // Green
    rmsGradient.addColorStop(0.7, '#FFC107'); // Yellow
    rmsGradient.addColorStop(0.9, '#FF5722'); // Orange
    rmsGradient.addColorStop(1, '#F44336'); // Red
    
    ctx.fillStyle = rmsGradient;
    ctx.fillRect(meterX, meterY, rmsWidth, meterHeight - 4);
    
    // Draw peak marker
    const peakX = meterX + peakNormalized * meterWidth;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(peakX - 1, meterY, 2, meterHeight);
    
    // Draw numeric readout
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#FFFFFF';
    
    // Display RMS and peak values
    const rmsText = `RMS: ${rmsDb.toFixed(1)} dB`;
    const peakText = `Peak: ${peakDb.toFixed(1)} dB`;
    
    ctx.fillText(rmsText, canvas.width / 2, meterY - 20);
    ctx.fillText(peakText, canvas.width / 2, meterY + meterHeight + 30);
    
    // Additional text for demo mode
    if (!isConnected) {
      ctx.font = '14px Arial';
      ctx.fillStyle = '#999';
      ctx.fillText('Demo Mode', canvas.width / 2, 30);
    }
  };
  
  return (
    <div className="level-meter-container">
      <canvas ref={canvasRef} className="level-meter-canvas" />
    </div>
  );
};

export default LevelMeter;