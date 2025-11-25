import React, { useEffect, useRef } from 'react';

interface SmileyFaceProps {
  health: number;
  wakefulness: number;
  happiness: number;
  className?: string;
  size?: number;
}

// Helper function to draw smiley face
function drawSmileyFaceOnCanvas(
  canvas: HTMLCanvasElement | null,
  health: number,
  wakefulness: number,
  happiness: number,
  size: number
) {
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.35;

  // Clear canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Calculate face color (yellow to green based on health)
  // Yellow: RGB(255, 255, 0), Green: RGB(0, 255, 0)
  const red = Math.round(255 * health);
  const green = 255;
  const blue = 0;
  const faceColor = `rgb(${red}, ${green}, ${blue})`;

  // Draw face circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.fillStyle = faceColor;
  ctx.fill();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw eyes based on wakefulness (0% = closed, 100% = open)
  const eyeWidth = radius * 0.2;
  const eyeHeight = Math.max(radius * 0.02, radius * 0.2 * wakefulness);
  const eyeYOffset = radius * 0.3;
  const eyeXOffset = radius * 0.3;

  // Left eye
  ctx.beginPath();
  ctx.ellipse(centerX - eyeXOffset, centerY - eyeYOffset, eyeWidth, eyeHeight, 0, 0, 2 * Math.PI);
  ctx.fillStyle = '#333';
  ctx.fill();

  // Right eye
  ctx.beginPath();
  ctx.ellipse(centerX + eyeXOffset, centerY - eyeYOffset, eyeWidth, eyeHeight, 0, 0, 2 * Math.PI);
  ctx.fillStyle = '#333';
  ctx.fill();

  // Draw mouth based on happiness
  const mouthWidth = radius * 0.6;
  const mouthY = centerY + radius * 0.25;
  const mouthCurveHeight = (happiness - 0.5) * 1.2 * radius;

  ctx.beginPath();
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 2;

  // Use quadratic curve for smooth mouth
  ctx.moveTo(centerX - mouthWidth, mouthY);
  ctx.quadraticCurveTo(centerX, mouthY + mouthCurveHeight, centerX + mouthWidth, mouthY);
  ctx.stroke();
}

export function SmileyFace({ health, wakefulness, happiness, className = "", size = 32 }: SmileyFaceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw smiley face based on current mood values
  const drawSmileyFace = () => {
    drawSmileyFaceOnCanvas(canvasRef.current, health, wakefulness, happiness, size);
  };

  // Update canvas when mood values change
  useEffect(() => {
    drawSmileyFace();
  }, [health, wakefulness, happiness, size]);

  // Initial draw when component mounts
  useEffect(() => {
    drawSmileyFace();
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
    />
  );
}