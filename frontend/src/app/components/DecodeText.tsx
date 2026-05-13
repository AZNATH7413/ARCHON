'use client';

import React, { useState, useEffect } from 'react';

interface DecodeTextProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  speed?: number;
}

export default function DecodeText({ text, className = '', style, speed = 30 }: DecodeTextProps) {
  const [displayText, setDisplayText] = useState('');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+=-{}[]|\\:";\'<>?,./';

  useEffect(() => {
    let iteration = 0;
    let interval: NodeJS.Timeout;

    // Reset when text changes
    setDisplayText('');

    const startDecoding = () => {
      interval = setInterval(() => {
        setDisplayText(prev => {
          return text.split('').map((char, index) => {
            if (index < iteration) {
              return text[index];
            }
            // Preserve spaces
            if (char === ' ') return ' ';
            return chars[Math.floor(Math.random() * chars.length)];
          }).join('');
        });

        if (iteration >= text.length) {
          clearInterval(interval);
        }

        iteration += 1 / 3; // Slow down the reveal
      }, speed);
    };

    // Small delay before starting for dramatic effect
    const timeout = setTimeout(startDecoding, 200);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, speed]);

  return (
    <span className={className} style={style}>
      {displayText}
    </span>
  );
}
