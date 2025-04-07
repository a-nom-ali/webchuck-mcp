// src/components/Visualizer/Waveform.jsx
import React, { useRef, useEffect } from 'react';
import { useWebChuck } from '../../contexts/WebChuckContextProvider.js';
import './Waveform.css';

const Waveform = () => {
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
    
    // Draw empty waveform initially
    drawEmptyWaveform(ctx, canvas);
    
    // Set up event listener for incoming audio data
    const audioDataListener = (data) => {
      if (data.waveform) {
        drawWaveform(ctx, canvas, data.waveform);
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
      const drawDemoWaveform = () => {
        const demoData = generateDemoWaveform();
        drawWaveform(ctx, canvas, demoData);
        animationId = requestAnimationFrame(drawDemoWaveform);
      };
      
      animationId = requestAnimationFrame(drawDemoWaveform);
    }
    
    return () => {
      window.removeEventListener('resize', resize);
      if (removeListener) removeListener();
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [isConnected]);
  
  // Function to draw empty waveform
  const drawEmptyWaveform = (ctx, canvas) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw center line
    ctx.beginPath();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    // Draw text if not connected
    if (!isConnected) {
      ctx.font = '14px Arial';
      ctx.fillStyle = '#999';
      ctx.textAlign = 'center';
      ctx.fillText('Connect to see audio waveform', canvas.width / 2, 30);
    }
  };
  
  // Function to draw waveform data
  const drawWaveform = (ctx, canvas, data) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerY = canvas.height / 2;
    const amplitude = canvas.height / 3;
    
    // Draw center line
    ctx.beginPath();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1;
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.stroke();
    
    // Draw waveform
    ctx.beginPath();
    ctx.strokeStyle = '#4a90e2';
    ctx.lineWidth = 2;
    
    const sliceWidth = canvas.width / data.length;
    let x = 0;
    
    for (let i = 0; i < data.length; i++) {
      const y = centerY + data[i] * amplitude;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      
      x += sliceWidth;
    }
    
    ctx.stroke();
  };
  
  // Generate demo waveform data when not connected
  const generateDemoWaveform = () => {
    const data = [];
    const count = 100;
    const time = Date.now() / 1000;
    
    for (let i = 0; i < count; i++) {
      const t = i / count;
      // Combine multiple sine waves for a more interesting demo
      const value = 
        0.3 * Math.sin(2 * Math.PI * t * 1 + time * 2) +
        0.2 * Math.sin(2 * Math.PI * t * 2 + time * 3) +
        0.1 * Math.sin(2 * Math.PI * t * 3 + time * 1);
      data.push(value);
    }
    
    return data;
  };
  
  return (
    <div className="waveform-container">
      <canvas ref={canvasRef} className="waveform-canvas" />
    </div>
  );
};

export default Waveform;