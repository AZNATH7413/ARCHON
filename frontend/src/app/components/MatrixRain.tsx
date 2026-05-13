'use client';

import React, { useEffect, useRef } from 'react';

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Characters: Mix of Kanji, Katakana, and Hex
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%""\'#&_(),.;:?!\\|{}<>[]^~アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレゲゼデベペオォコソトノホモヨョロゴゾドボポヴッン'.split('');

    const fontSize = 14;
    const columns = Math.ceil(canvas.width / fontSize);
    const drops: number[] = [];
    for (let x = 0; x < columns; x++) {
      drops[x] = Math.random() * -100; // Start drops at different negative Y positions to randomize entry
    }

    let frameCount = 0;
    
    const draw = () => {
      // Create trailing effect with a semi-transparent black overlay
      // Using an extremely dark red/black for the background wipe
      ctx.fillStyle = 'rgba(10, 2, 2, 0.15)'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px "JetBrains Mono", monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Randomly skip drawing sometimes to create "gaps" in the rain
        if (Math.random() > 0.95) continue;

        const text = chars[Math.floor(Math.random() * chars.length)];
        
        // Lead character is white, trailing characters are shades of red
        if (Math.random() > 0.8) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#ff0033';
        } else {
          ctx.fillStyle = '#cc0029';
          ctx.shadowBlur = 0;
        }

        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset drop to top randomly after it crosses the screen
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        drops[i]++;
      }
    };

    // Use requestAnimationFrame for smooth drawing but throttle it slightly for that "retro" feel
    let animationId: number;
    let lastDrawTime = 0;
    const fps = 30;
    const interval = 1000 / fps;

    const renderLoop = (timestamp: number) => {
      animationId = requestAnimationFrame(renderLoop);
      if (timestamp - lastDrawTime > interval) {
        draw();
        lastDrawTime = timestamp;
      }
    };
    
    animationId = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -2,
        opacity: 0.6,
        pointerEvents: 'none',
      }}
    />
  );
}
