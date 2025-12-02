/**
 * SmileyFace.tsx - Mood Visualization Component
 *
 * This component displays a smiley face that changes based on mood values:
 * - Health: Changes face color from yellow (poor) to green (excellent)
 * - Wakefulness: Changes eye height from closed (0%) to open (100%)
 * - Happiness: Changes mouth curve from sad (down) to happy (up)
 *
 * The smiley face is drawn on an HTML5 Canvas element for smooth
 * graphics and precise control over the visual elements.
 */

// React hooks for component lifecycle and state management
import React, { useEffect, useRef } from 'react';

/**
 * SmileyFace Component Props Interface
 *
 * Defines the props this component accepts:
 *
 * health: 0-1 value representing physical health (affects face color)
 * wakefulness: 0-1 value representing mental alertness (affects eye openness)
 * happiness: 0-1 value representing emotional state (affects mouth curve)
 * className: Optional CSS classes for styling
 * size: Size of the canvas in pixels (default 32x32)
 */
interface SmileyFaceProps {
  /** Health value (0-1) - affects face color from yellow to green */
  health: number;
  /** Wakefulness value (0-1) - affects eye openness */
  wakefulness: number;
  /** Happiness value (0-1) - affects mouth curve direction */
  happiness: number;
  /** Optional CSS class names for additional styling */
  className?: string;
  /** Size of the smiley face in pixels (default: 32) */
  size?: number;
}

/**
 * Canvas Drawing Function
 *
 * This function draws the smiley face on an HTML5 Canvas element.
 * It uses the Canvas 2D API to draw shapes and curves.
 *
 * @param canvas - The HTML canvas element to draw on
 * @param health - 0-1 value for face color
 * @param wakefulness - 0-1 value for eye openness
 * @param happiness - 0-1 value for mouth curve
 * @param size - Size of the canvas
 */
function drawSmileyFaceOnCanvas(
  canvas: HTMLCanvasElement | null,
  health: number,
  wakefulness: number,
  happiness: number,
) {
  // Exit if canvas doesn't exist
  if (!canvas) return;

  // Get 2D drawing context
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Calculate center point and radius for the face
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) * 0.35; // 35% of canvas size

  // Clear any previous drawings
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /**
   * Face Color Calculation
   *
   * Health affects face color:
   * - Health 0.0 = Yellow (RGB: 255, 255, 0)
   * - Health 1.0 = Green (RGB: 0, 255, 0)
   *
   * We interpolate between yellow and green based on health value
   */
  const red = Math.round(255 * health);        // Red decreases as health improves
  const green = 255;                            // Green always maximum
  const blue = 0;                              // No blue component
  const faceColor = `rgb(${red}, ${green}, ${blue})`;

  // Draw main face circle (head)
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI); // Full circle
  ctx.fillStyle = faceColor;
  ctx.fill();
  ctx.strokeStyle = '#333'; // Dark gray outline
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

/**
 * Main SmileyFace Component
 *
 * This is the React component that renders the mood visualization.
 * It manages the canvas element and updates the drawing when mood values change.
 */
export function SmileyFace({ health, wakefulness, happiness, className = "", size = 32 }: SmileyFaceProps) {
  /**
   * Canvas Ref
   *
   * useRef gives us direct access to the DOM canvas element
   * without triggering re-renders when it changes.
   * This is more efficient than using state for DOM references.
   */
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Draw Function Wrapper
   *
   * This function calls our drawing helper with the current canvas ref.
   * It's wrapped in a function so we can call it from multiple places.
   */
  const drawSmileyFace = () => {
    drawSmileyFaceOnCanvas(canvasRef.current, health, wakefulness, happiness);
  };

  /**
   * Mood Values Effect
   *
   * This useEffect runs whenever any mood value changes.
   * It redraws the smiley face to reflect the new mood values.
   *
   * Dependencies array [health, wakefulness, happiness, size] tells React
   * to re-run this effect only when these specific values change.
   */
  useEffect(() => {
    drawSmileyFace();
  });

  /**
   * Mount Effect
   *
   * This useEffect runs once when component mounts (empty dependency array).
   * It ensures the smiley face is drawn immediately when component appears.
   */
  useEffect(() => {
    drawSmileyFace();
  });

  /**
   * Render Canvas Element
   *
   * We render an HTML5 canvas element with:
   * - ref: Connects to our canvasRef for drawing access
   * - width/height: Sets the canvas dimensions
   * - className: Passes through any CSS classes
   *
   * The canvas itself doesn't show anything until we draw on it
   * using our drawing function above.
   */
  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
    />
  );
}
