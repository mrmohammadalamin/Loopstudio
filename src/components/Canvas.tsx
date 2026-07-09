// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';
import type { GraphicDocument, Layer, ShapeLayer, TextLayer, ImageLayer, DrawingLayer, FillProperties, BaseLayer } from '../types';
import { Transformer } from './Transformer';

interface CanvasProps {
  document: GraphicDocument;
  selectedLayerIds: string[];
  setSelectedLayerIds: React.Dispatch<React.SetStateAction<string[]>>;
  onUpdateLayer: (id: string, updated: Partial<Layer>) => void;
  onUpdateLayers?: (updates: {id: string, fields: Partial<Layer>}[]) => void;
  onCommitLayer: (id: string, updated: Partial<Layer>) => void;
  onCommitLayers?: (updates: {id: string, fields: Partial<Layer>}[]) => void;
  zoom: number;
  setZoom: (z: number | ((prev: number) => number)) => void;
  pan: { x: number; y: number };
  setPan: (p: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  editingTextId: string | null;
  setEditingTextId: (id: string | null) => void;
  
  // Extended Advanced Studio Props
  activeTool: 'select' | 'draw' | 'crop' | 'slice' | 'magic-wand' | 'lasso';
  setActiveTool: (tool: 'select' | 'draw' | 'crop' | 'slice' | 'magic-wand' | 'lasso') => void;
  lassoMode?: 'select' | 'cut' | 'erase';
  lassoFeather?: number;
  brushColor: string;
  brushWidth: number;
  brushStyle: string;
  colorSeparation: 'none' | 'c' | 'm' | 'y' | 'k' | 'r' | 'g' | 'b';
  onAddLayer: (layer: Omit<Layer, 'id'>) => void;
  snapEnabled?: boolean;
  onAddSlice?: (slice: { x: number, y: number, width: number, height: number, name?: string }) => void;
  onDeleteSlice?: (id: string) => void;
}

// ----------------------------------------------------
// BITMAP RENDERER COMPONENT
// Handles cropping, background removal (Chroma), and filters
// ----------------------------------------------------
const BitmapRenderer: React.FC<{ layer: ImageLayer }> = ({ layer }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = layer.src;
    img.onload = () => {
      // Crop bounds in original image coordinates
      const scaleX = img.naturalWidth / layer.width;
      const scaleY = img.naturalHeight / layer.height;

      const cropX = layer.crop ? layer.crop.x * scaleX : 0;
      const cropY = layer.crop ? layer.crop.y * scaleY : 0;
      const cropW = layer.crop ? layer.crop.width * scaleX : img.naturalWidth;
      const cropH = layer.crop ? layer.crop.height * scaleY : img.naturalHeight;

      // Set canvas pixel sizes to crop width/height (high resolution)
      canvas.width = Math.max(1, cropW);
      canvas.height = Math.max(1, cropH);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Apply CSS-like adjustments before drawing image
      const filters = [
        `brightness(${layer.brightness ?? 100}%)`,
        `contrast(${layer.contrast ?? 100}%)`,
        `saturate(${layer.saturation ?? 100}%)`,
        `blur(${layer.blur ?? 0}px)`,
        `grayscale(${layer.grayscale ?? 0}%)`,
        `sepia(${layer.sepia ?? 0}%)`,
        `hue-rotate(${layer.hueRotate ?? 0}deg)`
      ];
      ctx.filter = filters.join(' ');

      // Draw the cropped portion onto the canvas
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
      ctx.restore();

      // Retrieve pixels for custom advanced bitmap processing
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let modified = false;

      // 1. Chroma Key Background Removal
      if (layer.bgRemoval?.enabled) {
        const hex = layer.bgRemoval.targetColor;
        const rT = parseInt(hex.slice(1, 3), 16) || 0;
        const gT = parseInt(hex.slice(3, 5), 16) || 0;
        const bT = parseInt(hex.slice(5, 7), 16) || 0;
        const tolerance = layer.bgRemoval.tolerance ?? 20;
        const threshold = (tolerance / 100) * 441.67; // max distance is sqrt(255^2 + 255^2 + 255^2)

        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue;
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const dist = Math.sqrt((r - rT) ** 2 + (g - gT) ** 2 + (b - bT) ** 2);
          if (dist < threshold) {
            data[i + 3] = 0; // Set Alpha to 0
          }
        }
        modified = true;
      }

      // 2. Photoshop Filters
      const filter = layer.bitmapFilter;
      if (filter && filter !== 'none') {
        modified = true;
        if (filter === 'invert') {
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
          }
        } else if (filter === 'pixelate') {
          const size = 12;
          const w = canvas.width;
          const h = canvas.height;
          for (let y = 0; y < h; y += size) {
            for (let x = 0; x < w; x += size) {
              let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
              for (let dy = 0; dy < size && y + dy < h; dy++) {
                for (let dx = 0; dx < size && x + dx < w; dx++) {
                  const idx = ((y + dy) * w + (x + dx)) * 4;
                  rSum += data[idx];
                  gSum += data[idx + 1];
                  bSum += data[idx + 2];
                  aSum += data[idx + 3];
                  count++;
                }
              }
              const avgR = rSum / count;
              const avgG = gSum / count;
              const avgB = bSum / count;
              const avgA = aSum / count;
              for (let dy = 0; dy < size && y + dy < h; dy++) {
                for (let dx = 0; dx < size && x + dx < w; dx++) {
                  const idx = ((y + dy) * w + (x + dx)) * 4;
                  data[idx] = avgR;
                  data[idx + 1] = avgG;
                  data[idx + 2] = avgB;
                  data[idx + 3] = avgA;
                }
              }
            }
          }
        } else if (filter === 'duotone') {
          const c1 = layer.duotoneColor1 || '#111827';
          const c2 = layer.duotoneColor2 || '#ec4899';
          const r1 = parseInt(c1.slice(1, 3), 16) || 0;
          const g1 = parseInt(c1.slice(3, 5), 16) || 0;
          const b1 = parseInt(c1.slice(5, 7), 16) || 0;
          const r2 = parseInt(c2.slice(1, 3), 16) || 0;
          const g2 = parseInt(c2.slice(3, 5), 16) || 0;
          const b2 = parseInt(c2.slice(5, 7), 16) || 0;

          for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] === 0) continue;
            const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
            data[i] = r1 + (r2 - r1) * lum;
            data[i + 1] = g1 + (g2 - g1) * lum;
            data[i + 2] = b1 + (b2 - b1) * lum;
          }
        } else if (filter === 'sketch') {
          const w = canvas.width;
          const h = canvas.height;
          const gray = new Uint8ClampedArray(w * h);
          for (let i = 0; i < data.length; i += 4) {
            gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          }
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = y * w + x;
              const val = gray[idx];
              const diffR = Math.abs(val - gray[idx + 1]);
              const diffD = Math.abs(val - gray[idx + w]);
              const edge = Math.min(255, (diffR + diffD) * 4);
              const colorVal = 255 - edge;
              const pxIdx = idx * 4;
              data[pxIdx] = colorVal;
              data[pxIdx + 1] = colorVal;
              data[pxIdx + 2] = colorVal;
            }
          }
        } else if (filter === 'halftone') {
          const size = 10;
          const w = canvas.width;
          const h = canvas.height;
          const cellsW = Math.ceil(w / size);
          const cellsH = Math.ceil(h / size);
          const origData = new Uint8ClampedArray(data);

          for (let i = 0; i < data.length; i += 4) {
            data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
          }
          ctx.putImageData(imgData, 0, 0);
          ctx.fillStyle = '#000000';

          for (let cy = 0; cy < cellsH; cy++) {
            for (let cx = 0; cx < cellsW; cx++) {
              let bright = 0, count = 0, cellAlpha = 0;
              const startX = cx * size;
              const startY = cy * size;
              for (let dy = 0; dy < size && startY + dy < h; dy++) {
                for (let dx = 0; dx < size && startX + dx < w; dx++) {
                  const idx = ((startY + dy) * w + (startX + dx)) * 4;
                  bright += (0.299 * origData[idx] + 0.587 * origData[idx + 1] + 0.114 * origData[idx + 2]);
                  cellAlpha += origData[idx + 3];
                  count++;
                }
              }
              if (count > 0 && cellAlpha / count > 10) {
                const avgBright = bright / count;
                const radius = ((255 - avgBright) / 255) * (size / 2) * 1.2;
                if (radius > 0.5) {
                  ctx.beginPath();
                  ctx.arc(startX + size / 2, startY + size / 2, radius, 0, Math.PI * 2);
                  ctx.fill();
                }
              }
            }
          }
          const newImgData = ctx.getImageData(0, 0, w, h);
          for (let i = 0; i < data.length; i++) {
            data[i] = newImgData.data[i];
          }
        } else if (filter === 'oil') {
          const radius = 2;
          const levels = 8;
          const w = canvas.width;
          const h = canvas.height;
          const origData = new Uint8ClampedArray(data);

          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const intensities = new Int32Array(levels);
              const rSum = new Int32Array(levels);
              const gSum = new Int32Array(levels);
              const bSum = new Int32Array(levels);
              const aSum = new Int32Array(levels);

              for (let dy = -radius; dy <= radius; dy++) {
                const ny = y + dy;
                if (ny < 0 || ny >= h) continue;
                for (let dx = -radius; dx <= radius; dx++) {
                  const nx = x + dx;
                  if (nx < 0 || nx >= w) continue;

                  const idx = (ny * w + nx) * 4;
                  const r = origData[idx];
                  const g = origData[idx + 1];
                  const b = origData[idx + 2];
                  const a = origData[idx + 3];

                  const lum = (0.299 * r + 0.587 * g + 0.114 * b);
                  const levelIdx = Math.min(levels - 1, Math.floor((lum * levels) / 256));

                  intensities[levelIdx]++;
                  rSum[levelIdx] += r;
                  gSum[levelIdx] += g;
                  bSum[levelIdx] += b;
                  aSum[levelIdx] += a;
                }
              }
              let maxIdx = 0;
              let maxVal = 0;
              for (let k = 0; k < levels; k++) {
                if (intensities[k] > maxVal) {
                  maxVal = intensities[k];
                  maxIdx = k;
                }
              }
              const idx = (y * w + x) * 4;
              data[idx] = rSum[maxIdx] / maxVal;
              data[idx + 1] = gSum[maxIdx] / maxVal;
              data[idx + 2] = bSum[maxIdx] / maxVal;
              data[idx + 3] = aSum[maxIdx] / maxVal;
            }
          }
        }
      }

      if (modified) {
        ctx.putImageData(imgData, 0, 0);
      }
    };
  }, [
    layer.src,
    layer.brightness,
    layer.contrast,
    layer.saturation,
    layer.blur,
    layer.grayscale,
    layer.sepia,
    layer.hueRotate,
    JSON.stringify(layer.crop),
    JSON.stringify(layer.bgRemoval),
    layer.bitmapFilter,
    layer.duotoneColor1,
    layer.duotoneColor2,
    layer.width,
    layer.height
  ]);

  const transformStr = `
    scaleX(${layer.flipH ? -1 : 1})
    scaleY(${layer.flipV ? -1 : 1})
  `;

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'fill',
        transform: transformStr,
        pointerEvents: 'none',
      }}
    />
  );
};

// ----------------------------------------------------
// BRUSH LAYER RENDERER
// Replays points using canvas brush rendering (same as live drawing)
// ----------------------------------------------------
const BrushLayerRenderer: React.FC<{ layer: DrawingLayer; docW: number; docH: number }> = React.memo(({ layer, docW, docH }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !layer.points || layer.points.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, docW, docH);

    const drawSegment = (x: number, y: number, prevX: number, prevY: number) => {
        const color = layer.strokeColor;
        const w = layer.strokeWidth;
        const style = layer.brushStyle as string;
        renderBrushStroke(ctx, x, y, prevX, prevY, style, color, w, 1);
      };

    // Draw first point dot
    drawSegment(layer.points[0].x, layer.points[0].y, layer.points[0].x, layer.points[0].y);
    // Draw all segments
    for (let i = 1; i < layer.points.length; i++) {
      drawSegment(layer.points[i].x, layer.points[i].y, layer.points[i-1].x, layer.points[i-1].y);
    }
  }, [layer, docW, docH]);

  return (
    <canvas
      ref={canvasRef}
      width={docW}
      height={docH}
      style={{ width: '100%', height: '100%', pointerEvents: 'none', position: 'absolute', top: 0, left: 0 }}
    />
  );
});

// ----------------------------------------------------
// MAIN CANVAS COMPONENT
// ----------------------------------------------------
const renderBrushStroke = (
    ctx: CanvasRenderingContext2D,
    x: number, y: number,
    prevX: number, prevY: number,
    style: string,
    color: string,
    w: number,
    pressure: number = 1
  ) => {

    ctx.save();

    switch (style) {
      /* ── Hard Round (crisp circle stamp) ── */
      case 'hard-round': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = color;
        ctx.globalAlpha = Math.min(1, 0.9 * pressure + 0.1);
        const steps = Math.max(1, Math.round(Math.hypot(x-prevX, y-prevY) / (w * 0.25)));
        for (let i = 0; i <= steps; i++) {
          const ix = prevX + (x - prevX) * i / steps;
          const iy = prevY + (y - prevY) * i / steps;
          ctx.beginPath();
          ctx.arc(ix, iy, w * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      /* ── Soft Round (feathered edge) ── */
      case 'soft-round':
      case 'brush': {
        ctx.globalCompositeOperation = 'source-over';
        const steps = Math.max(1, Math.round(Math.hypot(x-prevX, y-prevY) / (w * 0.15)));
        for (let i = 0; i <= steps; i++) {
          const ix = prevX + (x - prevX) * i / steps;
          const iy = prevY + (y - prevY) * i / steps;
          const grad = ctx.createRadialGradient(ix, iy, 0, ix, iy, w * 0.65);
          grad.addColorStop(0, color + 'cc');
          grad.addColorStop(0.5, color + '66');
          grad.addColorStop(1, color + '00');
          ctx.fillStyle = grad;
          ctx.globalAlpha = Math.min(1, 0.6 * pressure + 0.1);
          ctx.beginPath();
          ctx.arc(ix, iy, w * 0.65, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      /* ── Pencil (textured, rough) ── */
      case 'pencil': {
        ctx.globalCompositeOperation = 'multiply';
        ctx.strokeStyle = color;
        ctx.lineWidth = w * 0.5;
        ctx.globalAlpha = 0.55;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // Main stroke
        ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke();
        // Texture: random fine lines
        const steps2 = Math.max(2, Math.round(Math.hypot(x-prevX, y-prevY) / 3));
        for (let i = 0; i < steps2; i++) {
          const t = i / steps2;
          const bx = prevX + (x - prevX) * t + (Math.random() - 0.5) * w * 0.8;
          const by = prevY + (y - prevY) * t + (Math.random() - 0.5) * w * 0.8;
          const ex = bx + (Math.random() - 0.5) * w * 1.2;
          const ey = by + (Math.random() - 0.5) * w * 1.2;
          ctx.globalAlpha = Math.random() * 0.15;
          ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke();
        }
        break;
      }
      /* ── Calligraphy (flat angled nib) ── */
      case 'calligraphy': {
        const dx = x - prevX;
        const dy = y - prevY;
        // Angled flat nib
        const nw = w * 1.8;
        const nh = w * 0.35;
        const angle = Math.atan2(dy, dx) + Math.PI / 4;
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = color;
        ctx.translate((prevX + x) / 2, (prevY + y) / 2);
        ctx.rotate(angle);
        ctx.fillRect(-nw / 2, -nh / 2, nw, nh);
        ctx.rotate(-angle);
        ctx.translate(-((prevX + x) / 2), -((prevY + y) / 2));
        // Also draw connecting path
        ctx.strokeStyle = color;
        ctx.lineWidth = nh;
        ctx.globalAlpha = 0.8;
        ctx.lineCap = 'butt';
        ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke();
        break;
      }
      /* ── Neon Glow ── */
      case 'neon': {
        ctx.globalCompositeOperation = 'screen';
        // Outer glow
        ctx.strokeStyle = color;
        ctx.lineWidth = w * 4;
        ctx.globalAlpha = 0.12;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke();
        // Mid glow
        ctx.lineWidth = w * 2;
        ctx.globalAlpha = 0.25;
        ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke();
        // Core white
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = w * 0.5;
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke();
        break;
      }
      /* ── Airbrush (spray cloud) ── */
      case 'airbrush':
      case 'spray': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = color;
        const radius = w * 2.5;
        const density = Math.round(radius * 1.5 * pressure);
        for (let i = 0; i < density; i++) {
          const ang = Math.random() * Math.PI * 2;
          const dist = Math.random() * radius;
          const px = x + Math.cos(ang) * dist;
          const py = y + Math.sin(ang) * dist;
          ctx.globalAlpha = Math.random() * 0.15 * pressure;
          ctx.beginPath();
          ctx.arc(px, py, 0.8, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      /* ── Watercolor (wet edge bleed) ── */
      case 'watercolor': {
        ctx.globalCompositeOperation = 'multiply';
        const steps = Math.max(2, Math.round(Math.hypot(x-prevX, y-prevY) / (w * 0.3)));
        for (let i = 0; i <= steps; i++) {
          const ix = prevX + (x - prevX) * i / steps;
          const iy = prevY + (y - prevY) * i / steps;
          // Wet-edge blob
          const r = w * (0.8 + Math.random() * 0.6);
          const grad = ctx.createRadialGradient(ix, iy, 0, ix, iy, r);
          grad.addColorStop(0,   color + '33');
          grad.addColorStop(0.7, color + '55');
          grad.addColorStop(0.9, color + '44');
          grad.addColorStop(1,   color + '00');
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.3 + Math.random() * 0.15;
          ctx.beginPath();
          // Irregular ellipse
          ctx.ellipse(
            ix + (Math.random()-0.5)*w*0.5,
            iy + (Math.random()-0.5)*w*0.5,
            r, r * (0.7 + Math.random() * 0.5),
            Math.random() * Math.PI, 0, Math.PI*2
          );
          ctx.fill();
        }
        break;
      }
      /* ── Crayon / Wax ── */
      case 'crayon': {
        ctx.globalCompositeOperation = 'multiply';
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        const fibers = 8;
        for (let f = 0; f < fibers; f++) {
          ctx.globalAlpha = 0.08 + Math.random() * 0.15;
          ctx.lineWidth = 0.5 + Math.random() * (w * 0.6);
          ctx.beginPath();
          ctx.moveTo(prevX + (Math.random()-0.5)*w, prevY + (Math.random()-0.5)*w);
          ctx.lineTo(x + (Math.random()-0.5)*w, y + (Math.random()-0.5)*w);
          ctx.stroke();
        }
        break;
      }
      /* ── Chalk ── */
      case 'chalk': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = color;
        const chalkLen = Math.max(1, Math.round(Math.hypot(x-prevX, y-prevY) / 2));
        for (let i = 0; i <= chalkLen; i++) {
          const t = i / chalkLen;
          const cx2 = prevX + (x - prevX) * t;
          const cy2 = prevY + (y - prevY) * t;
          for (let p = 0; p < 5; p++) {
            const ox = (Math.random() - 0.5) * w;
            const oy = (Math.random() - 0.5) * w;
            ctx.globalAlpha = Math.random() * 0.25;
            ctx.fillRect(cx2 + ox, cy2 + oy, 1.2, 1.2);
          }
        }
        break;
      }
      /* ── Charcoal ── */
      case 'charcoal': {
        ctx.globalCompositeOperation = 'multiply';
        ctx.strokeStyle = color;
        ctx.lineWidth = w * 1.2;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        // Main smudge
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke();
        // Side strokes for powdery texture
        for (let s = 0; s < 6; s++) {
          const off = (Math.random() - 0.5) * w * 1.5;
          ctx.globalAlpha = 0.05 + Math.random() * 0.1;
          ctx.lineWidth = 1 + Math.random() * (w * 0.5);
          ctx.beginPath();
          ctx.moveTo(prevX + off, prevY + off);
          ctx.lineTo(x + off * 0.8, y + off * 0.8);
          ctx.stroke();
        }
        break;
      }
      /* ── Marker (flat, semi-transparent) ── */
      case 'marker': {
        ctx.globalCompositeOperation = 'multiply';
        ctx.strokeStyle = color;
        ctx.lineWidth = w * 1.5;
        ctx.globalAlpha = 0.55;
        ctx.lineCap = 'square'; ctx.lineJoin = 'bevel';
        ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke();
        break;
      }
      /* ── Ink / Pen (pressure-sensitive width) ── */
      case 'ink': {
        const vel = Math.min(1, Math.hypot(x-prevX, y-prevY) / (w * 4));
        const lw = Math.max(1, w * (1 - vel * 0.7)); // thinner when moving fast
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.globalAlpha = 0.95;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke();
        break;
      }
      /* ── Splatter ── */
      case 'splatter': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = color;
        const numDrops = Math.round(w * 1.5 * (0.5 + pressure * 0.5));
        for (let d = 0; d < numDrops; d++) {
          const ang = Math.random() * Math.PI * 2;
          const dist = Math.random() * w * 3;
          const px = x + Math.cos(ang) * dist;
          const py = y + Math.sin(ang) * dist;
          const r = Math.random() * w * 0.4 + 0.5;
          ctx.globalAlpha = 0.5 + Math.random() * 0.5;
          ctx.beginPath();
          ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      /* ── Oil Paint (thick impasto strokes) ── */
      case 'oil': {
        ctx.globalCompositeOperation = 'source-over';
        const steps = Math.max(2, Math.round(Math.hypot(x-prevX, y-prevY) / (w * 0.2)));
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const ix = prevX + (x - prevX) * t;
          const iy = prevY + (y - prevY) * t;
          // Thick blob with slight color variation
          const vr = Math.round(parseInt(color.slice(1,3),16) + (Math.random()-0.5)*30).toString(16).padStart(2,'0');
          const vg = Math.round(parseInt(color.slice(3,5),16) + (Math.random()-0.5)*30).toString(16).padStart(2,'0');
          const vb = Math.round(parseInt(color.slice(5,7),16) + (Math.random()-0.5)*30).toString(16).padStart(2,'0');
          const varColor = `#${vr}${vg}${vb}`;
          const grad = ctx.createRadialGradient(ix, iy, 0, ix, iy, w * 0.7);
          grad.addColorStop(0, varColor + 'ff');
          grad.addColorStop(0.6, color + 'cc');
          grad.addColorStop(1, color + '00');
          ctx.fillStyle = grad;
          ctx.globalAlpha = 0.8;
          ctx.beginPath();
          ctx.ellipse(ix, iy, w * 0.7, w * 0.5, Math.atan2(y-prevY, x-prevX), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      /* ── Stipple / Dots ── */
      case 'stipple': {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = color;
        const numDots = Math.max(1, Math.round(Math.hypot(x-prevX, y-prevY) / (w * 0.5)));
        for (let i = 0; i <= numDots; i++) {
          const t = i / numDots;
          const ix = prevX + (x - prevX) * t + (Math.random()-0.5) * w * 0.8;
          const iy = prevY + (y - prevY) * t + (Math.random()-0.5) * w * 0.8;
          ctx.globalAlpha = 0.4 + Math.random() * 0.6;
          ctx.beginPath();
          ctx.arc(ix, iy, w * (0.1 + Math.random() * 0.25), 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      /* ── Eraser ── */
      case 'eraser': {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';
        ctx.globalAlpha = 1;
        const eSteps = Math.max(1, Math.round(Math.hypot(x-prevX, y-prevY) / (w * 0.2)));
        for (let i = 0; i <= eSteps; i++) {
          const ix = prevX + (x - prevX) * i / eSteps;
          const iy = prevY + (y - prevY) * i / eSteps;
          ctx.beginPath();
          ctx.arc(ix, iy, w, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      /* ── Default fallback ── */
      default: {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = w;
        ctx.globalAlpha = 0.85;
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke();
      }
    }

    ctx.restore();
  };

export const Canvas: React.FC<CanvasProps> = (props) => {
  const { 
    document: doc, 
    selectedLayerIds, 
    setSelectedLayerIds, 
    brushColor, 
    brushWidth, 
    brushStyle, 
    activeTool, 
    setActiveTool, 
    lassoFeather, 
    onAddLayer, 
    onUpdateLayer, 
    onCommitLayer,
    onUpdateLayers,
    onCommitLayers,
    zoom,
    setZoom,
    pan,
    setPan,
    editingTextId,
    setEditingTextId,
    lassoMode,
    colorSeparation,
    snapEnabled,
    onAddSlice: _onAddSlice,
    onDeleteSlice: _onDeleteSlice
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const documentRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const lastBrushPt = useRef<{x: number, y: number} | null>(null);
  const drawingPoints = useRef<{x: number, y: number}[]>([]);

  // Panning/Zoom state
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // Dragging state
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [initialLayerPositions, setInitialLayerPositions] = useState<Record<string, {x: number, y: number}>>({});
  const layerRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Crop / Gradient / Slice
  const isDraggingCrop = useRef(false);
  const cropDragStart = useRef<any>(null);
  const isDraggingGradient = useRef(false);
  const [sliceDragStartPt, setSliceDragStartPt] = useState<{x: number, y: number} | null>(null);
  const [sliceDragCurrentPt, setSliceDragCurrentPt] = useState<{x: number, y: number} | null>(null);

  // Marquee
  const [marqueeStart, setMarqueeStart] = useState<{x: number, y: number} | null>(null);
  const [marqueeCurrent, setMarqueeCurrent] = useState<{x: number, y: number} | null>(null);

  // Guidelines & Layout
  const [guideLines, setGuideLines] = useState<any[]>([]);
  const [canvasBounds, setCanvasBounds] = useState<DOMRect | {left: number, top: number, width: number, height: number, x: number, y: number, bottom: number, right: number, toJSON: any}>({left: 0, top: 0, width: 0, height: 0, x:0, y:0, bottom:0, right:0, toJSON:()=>{}});

  // Refs for callbacks
  const onUpdateLayerRef = useRef(onUpdateLayer);
  const onCommitLayerRef = useRef(onCommitLayer);
  useEffect(() => {
    onUpdateLayerRef.current = onUpdateLayer;
    onCommitLayerRef.current = onCommitLayer;
  }, [onUpdateLayer, onCommitLayer]);

  // Helpers
  const getPointerPos = (e: React.PointerEvent | React.MouseEvent | React.WheelEvent | MouseEvent) => {
    if (!documentRef.current) return { x: 0, y: 0 };
    const rect = documentRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom
    };
  };

  const handleTextDoubleClick = (id: string) => {
    setEditingTextId(id);
  };
  const handleTextBlur = (id: string, newText: string) => {
    onCommitLayerRef.current(id, { text: newText });
    setEditingTextId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const zoomChange = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom(z => Math.max(0.1, Math.min(5, z * zoomChange)));
    } else {
      setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
  };

  const handleLayerMouseDown = (e: any, id: string) => {
    if (activeTool !== 'select') return;
    e.stopPropagation();
    if (!selectedLayerIds.includes(id)) {
      setSelectedLayerIds([id]);
    }
    const pos = getPointerPos(e);
    setDragStart(pos);
    const initialPos: Record<string, {x: number, y: number}> = {};
    doc.layers.forEach(l => {
      if (selectedLayerIds.includes(l.id) || l.id === id) {
        initialPos[l.id] = { x: l.x, y: l.y };
      }
    });
    setInitialLayerPositions(initialPos);
  };

  useEffect(() => {
    if (!dragStart) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      // Use getPointerPos equivalent logic for mouse events without recreating it completely,
      // but we need current pan and zoom which we can get if we use a ref or depend on them.
      // Since zoom and pan can change, we might want to just calculate offset here:
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const docX = (e.clientX - rect.left - centerX - pan.x) / zoom + (doc.width / 2);
      const docY = (e.clientY - rect.top - centerY - pan.y) / zoom + (doc.height / 2);

      const dx = docX - dragStart.x;
      const dy = docY - dragStart.y;

      selectedLayerIds.forEach(id => {
        const initial = initialLayerPositions[id];
        if (initial) {
          onUpdateLayerRef.current(id, {
            x: initial.x + dx,
            y: initial.y + dy
          });
        }
      });
    };

    const handleGlobalMouseUp = () => {
      selectedLayerIds.forEach(id => {
        const initial = initialLayerPositions[id];
        if (initial) {
          const layer = doc.layers.find(l => l.id === id);
          if (layer) {
            onCommitLayerRef.current(id, { x: layer.x, y: layer.y });
          }
        }
      });
      setDragStart(null);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [dragStart, selectedLayerIds, initialLayerPositions, zoom, pan, doc.width, doc.height, doc.layers]);

  const handleCanvasMouseDown = (e: any) => {
    if (e.button === 1 || isSpacePressed) {
      setIsPanning(true);
      return;
    }
    const pos = getPointerPos(e);

    if (activeTool === 'select') {
      setSelectedLayerIds([]);
      setMarqueeStart(pos);
      setMarqueeCurrent(pos);
    } else if (activeTool === 'crop') {
      isDraggingCrop.current = true;
      cropDragStart.current = pos;
    } else if (activeTool === 'slice') {
      setSliceDragStartPt(pos);
      setSliceDragCurrentPt(pos);
    } else if (activeTool === 'magic-wand') {
      // Stub
    }
  };

  const handleDrawingMouseDown = (e: any) => {
    const pos = getPointerPos(e);
    setIsDrawing(true);
    drawingPoints.current = [pos];
    lastBrushPt.current = pos;
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, doc.width, doc.height);
        if (activeTool === 'draw') {
          renderBrushStroke(ctx, pos.x, pos.y, pos.x, pos.y, brushStyle, brushColor, brushWidth, e.pressure || 1);
        }
      }
    }
  };

  const handleDrawingMouseMove = (e: any) => {
    if (!isDrawing) return;
    const pos = getPointerPos(e);
    drawingPoints.current.push(pos);
    const prev = lastBrushPt.current || pos;
    lastBrushPt.current = pos;
    
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (activeTool === 'lasso') {
          ctx.strokeStyle = '#000';
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(pos.x, pos.y);
          ctx.stroke();
          ctx.setLineDash([]);
        } else if (activeTool === 'draw') {
          renderBrushStroke(ctx, pos.x, pos.y, prev.x, prev.y, brushStyle, brushColor, brushWidth, e.pressure || 1);
        }
      }
    }
  };

  const loadSafeImage = (src: string): Promise<string> => {
    return new Promise((resolve) => {
      resolve(src.startsWith('data:') ? src : `https://api.allorigins.win/raw?url=${encodeURIComponent(src)}`);
    });
  };

  const handleDrawingMouseUp = async (e: any) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const pts = drawingPoints.current;
    
    if (activeTool === 'draw') {
      if (pts.length > 0) {
        onAddLayer({
          type: 'drawing',
          name: 'Drawing',
          x: 0,
          y: 0,
          width: doc.width,
          height: doc.height,
          points: [...pts],
          strokeColor: brushColor,
          strokeWidth: brushWidth,
          brushStyle: brushStyle as any,
          opacity: 100,
          visible: true,
          locked: false
        } as DrawingLayer);
      }
      
      const canvas = drawingCanvasRef.current;
      if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) ctx.clearRect(0, 0, doc.width, doc.height);
      }
    } else if (activeTool === 'lasso') {

        if (lassoMode === 'cut') {
          let targetLayer = doc.layers.find(l => selectedLayerIds.includes(l.id) && l.type === 'image') as ImageLayer | undefined;
          const pts = [...drawingPoints.current];
          if (!targetLayer) {
            if (pts.length > 0) {
              const lassoBounds = {
                minX: Math.min(...pts.map(p => p.x)),
                maxX: Math.max(...pts.map(p => p.x)),
                minY: Math.min(...pts.map(p => p.y)),
                maxY: Math.max(...pts.map(p => p.y)),
              };
              targetLayer = [...doc.layers].reverse().find(l => {
                if (l.type !== 'image') return false;
                const intersect = !(lassoBounds.maxX < l.x || lassoBounds.minX > l.x + l.width ||
                                    lassoBounds.maxY < l.y || lassoBounds.minY > l.y + l.height);
                return intersect;
              }) as ImageLayer | undefined;
            }
          }
          if (targetLayer) {
             const img = new Image();
             img.onload = () => {
               try {
                 if (pts.length === 0) return;
                 const path = new Path2D();
                 path.moveTo(pts[0].x - targetLayer!.x, pts[0].y - targetLayer!.y);
                 for (let i = 1; i < pts.length; i++) {
                   path.lineTo(pts[i].x - targetLayer!.x, pts[i].y - targetLayer!.y);
                 }
                 path.closePath();
                 const extractCanvas = document.createElement('canvas');
                 extractCanvas.width = targetLayer!.width;
                 extractCanvas.height = targetLayer!.height;
                 const ctxExtract = extractCanvas.getContext('2d');
                 if (ctxExtract) {
                   if (targetLayer!.crop) {
                      const sx = img.naturalWidth / targetLayer!.width;
                      const sy = img.naturalHeight / targetLayer!.height;
                      ctxExtract.drawImage(img, targetLayer!.crop.x * sx, targetLayer!.crop.y * sy, targetLayer!.crop.width * sx, targetLayer!.crop.height * sy, 0, 0, extractCanvas.width, extractCanvas.height);
                   } else {
                      ctxExtract.drawImage(img, 0, 0, targetLayer!.width, targetLayer!.height);
                   }
                   ctxExtract.globalCompositeOperation = 'destination-out';
                   if (lassoFeather && lassoFeather > 0) {
                     ctxExtract.filter = `blur(${lassoFeather}px)`;
                   }
                   ctxExtract.fill(path);
                   const newSrc = extractCanvas.toDataURL("image/png");
                   onCommitLayer(targetLayer!.id, { src: newSrc, crop: undefined });
                 }
                 const extractImg = document.createElement('canvas');
                 extractImg.width = targetLayer!.width;
                 extractImg.height = targetLayer!.height;
                 const ctxDest = extractImg.getContext('2d');
                 if (ctxDest) {
                   if (targetLayer!.crop) {
                      const sx = img.naturalWidth / targetLayer!.width;
                      const sy = img.naturalHeight / targetLayer!.height;
                      ctxDest.drawImage(img, targetLayer!.crop.x * sx, targetLayer!.crop.y * sy, targetLayer!.crop.width * sx, targetLayer!.crop.height * sy, 0, 0, extractImg.width, extractImg.height);
                   } else {
                      ctxDest.drawImage(img, 0, 0, targetLayer!.width, targetLayer!.height);
                   }
                   ctxDest.globalCompositeOperation = 'destination-in';
                   if (lassoFeather && lassoFeather > 0) {
                     ctxDest.filter = `blur(${lassoFeather}px)`;
                   }
                   ctxDest.fill(path);
                   const newSrcExtracted = extractImg.toDataURL("image/png");
                   onAddLayer({
                     ...targetLayer!,
                     name: `${targetLayer!.name} (Cut)`,
                     src: newSrcExtracted,
                     x: targetLayer!.x + 20,
                     y: targetLayer!.y + 20,
                     crop: undefined
                   } as any);
                 }
               } catch (err: any) {
                 console.error("Lasso Error", err);
                 alert(`Failed to cut image: ${err.message || err}`);
               }
             };
               // CORS robust loader
               const safeSrc = await loadSafeImage(targetLayer.src);
               img.onerror = () => {
                 alert("Failed to load image for cutting. The image might be blocked by strict CORS.");
               };
               img.crossOrigin = "anonymous";
               img.src = safeSrc;
          } else {
            alert("Please select an image layer first to use the Lasso Cut tool!");
          }
        } else if (lassoMode === 'erase') {
          // --- MAGIC ERASER (INPAINTING) ---
          let targetLayer = doc.layers.find(l => selectedLayerIds.includes(l.id) && l.type === 'image') as ImageLayer | undefined;
          const pts = [...drawingPoints.current];
          if (!targetLayer) {
            if (pts.length > 0) {
              const lassoBounds = {
                minX: Math.min(...pts.map(p => p.x)),
                maxX: Math.max(...pts.map(p => p.x)),
                minY: Math.min(...pts.map(p => p.y)),
                maxY: Math.max(...pts.map(p => p.y)),
              };
              targetLayer = [...doc.layers].reverse().find(l => {
                if (l.type !== 'image') return false;
                return !(lassoBounds.maxX < l.x || lassoBounds.minX > l.x + l.width ||
                         lassoBounds.maxY < l.y || lassoBounds.minY > l.y + l.height);
              }) as ImageLayer | undefined;
            }
          }
          
          if (targetLayer) {
             const img = new Image();
             img.crossOrigin = "anonymous";
             img.onload = () => {
               try {
                 if (pts.length === 0) return;
                 const path = new Path2D();
                 path.moveTo(pts[0].x - targetLayer!.x, pts[0].y - targetLayer!.y);
                 for(let i=1; i<pts.length; i++){
                   path.lineTo(pts[i].x - targetLayer!.x, pts[i].y - targetLayer!.y);
                 }
                 path.closePath();
                 
                 // 1. Cut the hole in the original image (with feathering)
                 const cHole = document.createElement('canvas');
                 cHole.width = targetLayer!.width; cHole.height = targetLayer!.height;
                 const ctxHole = cHole.getContext('2d');
                 if (ctxHole) {
                   if (targetLayer!.crop) {
                     const scaleX = img.naturalWidth / targetLayer!.width;
                     const scaleY = img.naturalHeight / targetLayer!.height;
                     ctxHole.drawImage(img, targetLayer!.crop.x * scaleX, targetLayer!.crop.y * scaleY, targetLayer!.crop.width * scaleX, targetLayer!.crop.height * scaleY, 0, 0, cHole.width, cHole.height);
                   } else {
                     ctxHole.drawImage(img, 0, 0, targetLayer!.width, targetLayer!.height);
                   }
                   ctxHole.globalCompositeOperation = 'destination-out';
                   ctxHole.filter = `blur(${lassoFeather || 4}px)`;
                   ctxHole.fill(path);
                   ctxHole.filter = 'none';
                   
                   // 2. Generate the background fill by stacking shifted clones of the holed image
                   const cFill = document.createElement('canvas');
                   cFill.width = targetLayer!.width; cFill.height = targetLayer!.height;
                   const ctxFill = cFill.getContext('2d');
                   if (ctxFill) {
                     ctxFill.drawImage(cHole, 0, 0);
                     for (let i = 0; i < 30; i++) {
                       const dx = (Math.random() - 0.5) * 80;
                       const dy = (Math.random() - 0.5) * 80;
                       ctxFill.drawImage(cHole, dx, dy);
                     }
                   }
                   
                   // 3. Final composite
                   const cFinal = document.createElement('canvas');
                   cFinal.width = targetLayer!.width; cFinal.height = targetLayer!.height;
                   const ctxFinal = cFinal.getContext('2d');
                   if (ctxFinal) {
                     // Draw the fill
                     ctxFinal.drawImage(cFill, 0, 0);
                     // Add a slight blur to the fill to smooth cloning artifacts
                     ctxFinal.filter = 'blur(6px)';
                     ctxFinal.drawImage(cFinal, 0, 0);
                     ctxFinal.filter = 'none';
                     // Draw the crisp original hole OVER the fill
                     ctxFinal.drawImage(cHole, 0, 0);
                     
                     const newSrcErased = cFinal.toDataURL('image/png');
                     onCommitLayerRef.current(targetLayer!.id, { src: newSrcErased, crop: undefined });
                   }
                 }
               } catch (err: any) {
                 console.error("Magic Eraser Error", err);
                 alert(`Failed to erase image: ${err.message || err}`);
               }
             };
             
             // CORS robust loader
             const safeSrc = await loadSafeImage(targetLayer.src);
             img.onerror = () => {
               alert("Failed to load image for erasing. The image might be blocked by strict CORS.");
             };
             img.crossOrigin = "anonymous";
             img.src = safeSrc;
          } else {
            alert("Please lasso over an image layer to use the Magic Eraser!");
          }
        }
      }
    drawingPoints.current = [];
  };

  // ----------------------------------------------------
  // ON-CANVAS GRADIENT DRAGGING HANDLERS
  // ----------------------------------------------------
  const startGradientDrag = (e: React.MouseEvent, layer: ShapeLayer) => {
    e.stopPropagation();
    e.preventDefault();

    isDraggingGradient.current = true;
    let finalAngle = layer.gradientAngle ?? 90;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingGradient.current) return;
      const el = layerRefs.current[layer.id];
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let angle = Math.atan2(moveEvent.clientY - centerY, moveEvent.clientX - centerX) * (180 / Math.PI);
      
      // Subtract layer rotation because the mouse is in screen space 
      // but the gradient angle is applied inside the rotated shape container
      angle -= layer.rotation;
      
      // Normalize to 0-360
      angle = (angle % 360 + 360) % 360;
      finalAngle = Math.round(angle);

      onUpdateLayer(layer.id, { gradientAngle: finalAngle });
    };

    const handleMouseUp = () => {
      isDraggingGradient.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onCommitLayer(layer.id, { gradientAngle: finalAngle });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const startRadialCenterDrag = (e: React.MouseEvent, layer: FillProperties & BaseLayer) => {
    e.stopPropagation();
    e.preventDefault();

    let finalCenter = layer.radialGradientCenter || { x: 50, y: 50, r: 50 };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const cx = layer.x + layer.width / 2;
      const cy = layer.y + layer.height / 2;
      const docX = moveEvent.clientX / zoom;
      const docY = moveEvent.clientY / zoom;

      const dx = docX - cx;
      const dy = docY - cy;
      const rad = -layer.rotation * (Math.PI / 180);
      
      const localX = cx + (dx * Math.cos(rad) - dy * Math.sin(rad));
      const localY = cy + (dx * Math.sin(rad) + dy * Math.cos(rad));

      const pctX = ((localX - layer.x) / layer.width) * 100;
      const pctY = ((localY - layer.y) / layer.height) * 100;

      finalCenter = {
        ...finalCenter,
        x: Math.max(0, Math.min(100, Math.round(pctX))),
        y: Math.max(0, Math.min(100, Math.round(pctY)))
      };

      onUpdateLayer(layer.id, { radialGradientCenter: finalCenter });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onCommitLayer(layer.id, { radialGradientCenter: finalCenter });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const startMeshNodeDrag = (e: React.MouseEvent, layer: FillProperties & BaseLayer, index: number) => {
    e.stopPropagation();
    e.preventDefault();

    if (!layer.meshPoints) return;
    let finalPoints = [...layer.meshPoints];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const cx = layer.x + layer.width / 2;
      const cy = layer.y + layer.height / 2;
      const docX = moveEvent.clientX / zoom;
      const docY = moveEvent.clientY / zoom;

      const dx = docX - cx;
      const dy = docY - cy;
      const rad = -layer.rotation * (Math.PI / 180);
      
      const localX = cx + (dx * Math.cos(rad) - dy * Math.sin(rad));
      const localY = cy + (dx * Math.sin(rad) + dy * Math.cos(rad));

      const pctX = ((localX - layer.x) / layer.width) * 100;
      const pctY = ((localY - layer.y) / layer.height) * 100;

      finalPoints[index] = {
        ...finalPoints[index],
        x: Math.max(0, Math.min(100, Math.round(pctX))),
        y: Math.max(0, Math.min(100, Math.round(pctY)))
      };

      onUpdateLayer(layer.id, { meshPoints: finalPoints });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onCommitLayer(layer.id, { meshPoints: finalPoints });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // ----------------------------------------------------
  // ON-CANVAS CROP DRAGGING HANDLERS
  // ----------------------------------------------------
  const startCropDrag = (e: React.MouseEvent, handle: string, imgLayer: ImageLayer) => {
    e.stopPropagation();
    e.preventDefault();

    isDraggingCrop.current = handle;
    const crop = imgLayer.crop || { x: 0, y: 0, width: imgLayer.width, height: imgLayer.height };
    const startClientX = e.clientX;
    const startClientY = e.clientY;
    cropDragStart.current = {
      x: startClientX,
      y: startClientY,
      cropX: crop.x,
      cropY: crop.y,
      cropW: crop.width,
      cropH: crop.height,
    };

    // Track last crop for commit — avoids stale doc read in mouseUp
    let finalCrop = { ...crop };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingCrop.current) return;
      const dx = (moveEvent.clientX - cropDragStart.current.x) / zoom;
      const dy = (moveEvent.clientY - cropDragStart.current.y) / zoom;

      let nextCrop = { ...crop };

      if (isDraggingCrop.current === 'tl') {
        nextCrop.x = Math.max(0, Math.min(cropDragStart.current.cropX + dx, cropDragStart.current.cropX + cropDragStart.current.cropW - 10));
        nextCrop.width = cropDragStart.current.cropW - (nextCrop.x - cropDragStart.current.cropX);
        nextCrop.y = Math.max(0, Math.min(cropDragStart.current.cropY + dy, cropDragStart.current.cropY + cropDragStart.current.cropH - 10));
        nextCrop.height = cropDragStart.current.cropH - (nextCrop.y - cropDragStart.current.cropY);
      } else if (isDraggingCrop.current === 'tr') {
        nextCrop.width = Math.max(10, Math.min(cropDragStart.current.cropW + dx, imgLayer.width - cropDragStart.current.cropX));
        nextCrop.y = Math.max(0, Math.min(cropDragStart.current.cropY + dy, cropDragStart.current.cropY + cropDragStart.current.cropH - 10));
        nextCrop.height = cropDragStart.current.cropH - (nextCrop.y - cropDragStart.current.cropY);
      } else if (isDraggingCrop.current === 'br') {
        nextCrop.width = Math.max(10, Math.min(cropDragStart.current.cropW + dx, imgLayer.width - cropDragStart.current.cropX));
        nextCrop.height = Math.max(10, Math.min(cropDragStart.current.cropH + dy, imgLayer.height - cropDragStart.current.cropY));
      } else if (isDraggingCrop.current === 'bl') {
        nextCrop.x = Math.max(0, Math.min(cropDragStart.current.cropX + dx, cropDragStart.current.cropX + cropDragStart.current.cropW - 10));
        nextCrop.width = cropDragStart.current.cropW - (nextCrop.x - cropDragStart.current.cropX);
        nextCrop.height = Math.max(10, Math.min(cropDragStart.current.cropH + dy, imgLayer.height - cropDragStart.current.cropY));
      }

      finalCrop = nextCrop;
      onUpdateLayerRef.current(imgLayer.id, { crop: nextCrop });
    };

    const handleMouseUp = () => {
      isDraggingCrop.current = false as any;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      
      // Destructive crop: Convert the cropped region to a new data URL
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const scaleX = img.naturalWidth / imgLayer.width;
        const scaleY = img.naturalHeight / imgLayer.height;
        const cX = finalCrop.x * scaleX;
        const cY = finalCrop.y * scaleY;
        const cW = finalCrop.width * scaleX;
        const cH = finalCrop.height * scaleY;
        
        const c = document.createElement('canvas');
        c.width = Math.max(1, cW);
        c.height = Math.max(1, cH);
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, cX, cY, cW, cH, 0, 0, c.width, c.height);
          const newSrc = c.toDataURL('image/png');
          onCommitLayerRef.current(imgLayer.id, {
            src: newSrc,
            x: imgLayer.x + finalCrop.x,
            y: imgLayer.y + finalCrop.y,
            width: finalCrop.width,
            height: finalCrop.height,
            crop: undefined // Destroy the crop boundary, making it permanent
          });
        }
      };
      img.src = imgLayer.src;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // ----------------------------------------------------
  // HELPER: CSS Gradients for Text
  // ----------------------------------------------------
  const getCssBackgroundForFill = (layer: FillProperties): string | undefined => {
    if (!layer.fillType || layer.fillType === 'color') return undefined;
    
    const stops = layer.gradientStops || (layer.gradientColors ? [
      { offset: 0, color: layer.gradientColors[0] },
      { offset: 100, color: layer.gradientColors[1] }
    ] : null);

    if (layer.fillType === 'linear-gradient' && stops) {
      const angle = layer.gradientAngle ?? 90;
      // Convert SVG/Canvas angle (0 = right, clockwise) to CSS linear-gradient angle (0 = top, clockwise)
      const cssAngle = angle + 90;
      const stopsStr = stops.sort((a,b)=>a.offset-b.offset).map(s => `${s.color} ${s.offset}%`).join(', ');
      return `linear-gradient(${cssAngle}deg, ${stopsStr})`;
    } else if (layer.fillType === 'radial-gradient' && stops) {
      const stopsStr = stops.sort((a,b)=>a.offset-b.offset).map(s => `${s.color} ${s.offset}%`).join(', ');
      const cx = layer.radialGradientCenter?.x ?? 50;
      const cy = layer.radialGradientCenter?.y ?? 50;
      return `radial-gradient(circle at ${cx}% ${cy}%, ${stopsStr})`;
    } else if (layer.fillType === 'pattern' && layer.patternUrl) {
      return `url("${layer.patternUrl}")`;
    } else if (layer.fillType === 'mesh-gradient' && layer.meshPoints) {
      const meshes = layer.meshPoints.map(p => `radial-gradient(circle at ${p.x}% ${p.y}%, ${p.color} 0%, transparent ${p.radius}%)`);
      return meshes.join(', ');
    }
    return undefined;
  };

  // ----------------------------------------------------
  // RENDER LAYERS
  // ----------------------------------------------------
  const renderLayerContent = (layer: Layer) => { console.log('Rendering layer:', layer.type, layer.name, layer.x, layer.y);
    switch (layer.type) {
      case 'text': {
        const textLayer = layer as TextLayer;
        const isGradient = textLayer.fillType && textLayer.fillType !== 'color';
        const bgImage = isGradient ? getCssBackgroundForFill(textLayer) : 'none';
        const bgColor = isGradient && (textLayer.fillType === 'mesh-gradient' || textLayer.fillType === 'pattern') ? (textLayer.fill || '#1e293b') : 'transparent';
        const bgSize = textLayer.fillType === 'pattern' && textLayer.patternScale ? `${textLayer.patternScale}px ${textLayer.patternScale}px` : '100% 100%';

        const textShadow = layer.shadowBlur > 0
          ? `${layer.shadowOffsetX}px ${layer.shadowOffsetY}px ${layer.shadowBlur}px ${layer.shadowColor}`
          : 'none';
        const textStroke = layer.strokeWidth > 0
          ? `${layer.strokeWidth}px ${layer.strokeColor}`
          : 'none';

        if (editingTextId === layer.id) {
          return (
            <textarea
              autoFocus
              className="text-editor-overlay"
              style={{
                width: '100%',
                height: '100%',
                fontSize: `${layer.fontSize}px`,
                fontFamily: layer.fontFamily,
                fontWeight: layer.fontWeight,
                fontStyle: layer.fontStyle,
                color: isGradient ? 'transparent' : ((layer as TextLayer).fill || layer.color),
                backgroundImage: bgImage,
                backgroundColor: bgColor,
                backgroundSize: bgSize,
                WebkitBackgroundClip: isGradient ? 'text' : 'border-box',
                backgroundClip: isGradient ? 'text' : 'border-box',
                textAlign: layer.textAlign,
                lineHeight: layer.lineHeight,
                letterSpacing: `${layer.letterSpacing}px`,
                WebkitTextStroke: textStroke,
                textShadow: textShadow,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
              defaultValue={layer.text}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleTextBlur(layer.id, e.currentTarget.value);
                }
              }}
              onBlur={(e) => handleTextBlur(layer.id, e.currentTarget.value)}
              onChange={(e) => onUpdateLayer(layer.id, { text: e.currentTarget.value })}
            />
          );
        }

        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              fontSize: `${layer.fontSize}px`,
              fontFamily: layer.fontFamily,
              fontWeight: layer.fontWeight,
              fontStyle: layer.fontStyle,
              textDecoration: layer.textDecoration,
              color: isGradient ? 'transparent' : ((layer as TextLayer).fill || layer.color),
              backgroundImage: bgImage,
              backgroundColor: bgColor,
              backgroundSize: bgSize,
              WebkitBackgroundClip: isGradient ? 'text' : 'border-box',
              backgroundClip: isGradient ? 'text' : 'border-box',
              textAlign: layer.textAlign,
              lineHeight: layer.lineHeight,
              letterSpacing: `${layer.letterSpacing}px`,
              WebkitTextStroke: textStroke,
              textShadow: textShadow,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              display: 'flex',
              alignItems: 'center',
              justifyContent: layer.textAlign === 'center' ? 'center' : layer.textAlign === 'right' ? 'flex-end' : 'flex-start',
            }}
            onDoubleClick={() => handleTextDoubleClick(layer.id)}
          >
            {layer.text}
          </div>
        );
      }

      case 'shape': {
        const s = layer as ShapeLayer;
        const stroke = s.stroke;
        const strokeW = s.strokeWidth;
        const rad = s.cornerRadius ?? 0;

        let gradientDef: React.ReactNode = null;
        let fillAttr = s.fill;

        // Support both new gradientStops and legacy gradientColors
        const stops = s.gradientStops || (s.gradientColors ? [
          { offset: 0, color: s.gradientColors[0] },
          { offset: 100, color: s.gradientColors[1] }
        ] : null);

        if (s.fillType === 'linear-gradient' && stops) {
          const angle = s.gradientAngle ?? 0;
          const angleRad = (angle * Math.PI) / 180;
          const x1 = Math.round(50 - Math.cos(angleRad) * 50);
          const y1 = Math.round(50 - Math.sin(angleRad) * 50);
          const x2 = Math.round(50 + Math.cos(angleRad) * 50);
          const y2 = Math.round(50 + Math.sin(angleRad) * 50);

          fillAttr = `url(#grad-${s.id})`;
          gradientDef = (
            <linearGradient id={`grad-${s.id}`} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}>
              {stops.map((stop, i) => <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} />)}
            </linearGradient>
          );
        } else if (s.fillType === 'radial-gradient' && stops) {
          fillAttr = `url(#grad-${s.id})`;
          gradientDef = (
            <radialGradient id={`grad-${s.id}`} cx="50%" cy="50%" r="50%">
              {stops.map((stop, i) => <stop key={i} offset={`${stop.offset}%`} stopColor={stop.color} />)}
            </radialGradient>
          );
        } else if (s.fillType === 'mesh-gradient' && s.meshPoints) {
          fillAttr = `url(#mesh-${s.id})`;
          gradientDef = (
            <React.Fragment key={`mesh-def-${s.id}`}>
              <filter id={`mesh-blur-${s.id}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="20" />
              </filter>
              <pattern id={`mesh-${s.id}`} viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="none">
                <rect width="100" height="100" fill={s.fill || '#1e293b'} />
                <g filter={`url(#mesh-blur-${s.id})`}>
                  {s.meshPoints.map((pt, i) => (
                    <circle key={i} cx={pt.x} cy={pt.y} r={pt.radius} fill={pt.color} />
                  ))}
                </g>
              </pattern>
            </React.Fragment>
          );
        } else if (s.fillType === 'pattern' && s.patternUrl) {
          fillAttr = `url(#pattern-${s.id})`;
          const scale = s.patternScale || 50;
          gradientDef = (
            <pattern id={`pattern-${s.id}`} x="0" y="0" width={scale} height={scale} patternUnits="userSpaceOnUse">
              <rect width="100%" height="100%" fill={s.fill || '#1e293b'} />
              <image href={s.patternUrl} x="0" y="0" width={scale} height={scale} preserveAspectRatio="none" />
            </pattern>
          );
        }

        let shapeSvg: React.ReactNode;
        switch (s.shapeType) {
          case 'rectangle':
            shapeSvg = <rect width="100" height="100" rx={rad} fill={fillAttr} stroke={stroke} strokeWidth={strokeW} vectorEffect="non-scaling-stroke" />;
            break;
          case 'circle':
            shapeSvg = <circle cx="50" cy="50" r="48" fill={fillAttr} stroke={stroke} strokeWidth={strokeW} vectorEffect="non-scaling-stroke" />;
            break;
          case 'triangle':
            shapeSvg = <polygon points="50,2 98,98 2,98" fill={fillAttr} stroke={stroke} strokeWidth={strokeW} vectorEffect="non-scaling-stroke" />;
            break;
          case 'line':
            shapeSvg = <line x1="2" y1="50" x2="98" y2="50" stroke={stroke} strokeWidth={strokeW} vectorEffect="non-scaling-stroke" />;
            break;
          case 'arrow':
            shapeSvg = (
              <g>
                <line x1="2" y1="50" x2="88" y2="50" stroke={stroke} strokeWidth={strokeW} vectorEffect="non-scaling-stroke" />
                <polygon points="86,40 98,50 86,60" fill={stroke} />
              </g>
            );
            break;
          case 'star':
            shapeSvg = (
              <polygon
                points="50,2 63,33 97,38 72,62 78,96 50,80 22,96 28,62 3,38 37,33"
                fill={fillAttr}
                stroke={stroke}
                strokeWidth={strokeW}
                vectorEffect="non-scaling-stroke"
              />
            );
            break;
          case 'polygon':
            shapeSvg = (
              <polygon
                points="50,2 95,25 95,75 50,98 5,75 5,25"
                fill={fillAttr}
                stroke={stroke}
                strokeWidth={strokeW}
                vectorEffect="non-scaling-stroke"
              />
            );
            break;
        }

        return (
          <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
            <defs>{gradientDef}</defs>
            {shapeSvg}
          </svg>
        );
      }

      case 'image': {
        return <BitmapRenderer layer={layer as ImageLayer} />;
      }

      case 'drawing': {
        const d = layer as DrawingLayer;
        if (!d.points || d.points.length === 0) return null;
        return <BrushLayerRenderer layer={d} docW={doc.width} docH={doc.height} />;
      }

      case 'icon': {
        const IconComponent = (Icons as any)[layer.iconName];
        if (!IconComponent) return null;

        return (
          <IconComponent
            color={layer.color}
            strokeWidth={layer.strokeWidth}
            style={{
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
            }}
          />
        );
      }

      default:
        return null;
    }
  };

  const selectedLayer = doc.layers.find((l) => selectedLayerIds.includes(l.id));

  // Apply separations to entire workspace view if toggled
  const separationFilter = colorSeparation !== 'none' ? `url(#${colorSeparation}-sep)` : 'none';

  return (
    <div
      ref={containerRef}
      className="canvas-container"
      onMouseDown={handleCanvasMouseDown}
      onWheel={handleWheel}
      style={{
        cursor: isSpacePressed ? 'grab' : activeTool === 'draw' ? 'crosshair' : 'default',
      }}
    >
      {/* Dynamic Brush SVG filter maps */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="c-sep">
            <feColorMatrix type="matrix" values="-1 0 0 0 1  -1 0 0 0 1  -1 0 0 0 1  0 0 0 1 0" />
          </filter>
          <filter id="m-sep">
            <feColorMatrix type="matrix" values="0 -1 0 0 1  0 -1 0 0 1  0 -1 0 0 1  0 0 0 1 0" />
          </filter>
          <filter id="y-sep">
            <feColorMatrix type="matrix" values="0 0 -1 0 1  0 0 -1 0 1  0 0 -1 0 1  0 0 0 1 0" />
          </filter>
          <filter id="k-sep">
            <feColorMatrix type="matrix" values="-0.299 -0.587 -0.114 0 1  -0.299 -0.587 -0.114 0 1  -0.299 -0.587 -0.114 0 1  0 0 0 1 0" />
          </filter>
          <filter id="r-sep">
            <feColorMatrix type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 1 0" />
          </filter>
          <filter id="g-sep">
            <feColorMatrix type="matrix" values="0 1 0 0 0  0 1 0 0 0  0 1 0 0 0  0 0 0 1 0" />
          </filter>
          <filter id="b-sep">
            <feColorMatrix type="matrix" values="0 0 1 0 0  0 0 1 0 0  0 0 1 0 0  0 0 0 1 0" />
          </filter>

          <filter id="brush-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="crayon-texture">
            <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      {/* Grid Pattern Background */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
        }}
      />

      {/* Snap Guidelines */}
      {guideLines.x !== undefined && (
        <div
          className="guide-line vertical"
          style={{
            left: `${guideLines.x * zoom + pan.x + (containerRef.current?.offsetWidth ?? 0) / 2 - (doc.width / 2) * zoom}px`,
          }}
        />
      )}
      {guideLines.y !== undefined && (
        <div
          className="guide-line horizontal"
          style={{
            top: `${guideLines.y * zoom + pan.y + (containerRef.current?.offsetHeight ?? 0) / 2 - (doc.height / 2) * zoom}px`,
          }}
        />
      )}

      {/* Slices Overlay outside document to allow drawing over the edge slightly */}
      {doc.slices && doc.slices.map(slice => {
        const left = slice.x * zoom + pan.x + (containerRef.current?.offsetWidth ?? 0) / 2 - (doc.width / 2) * zoom;
        const top = slice.y * zoom + pan.y + (containerRef.current?.offsetHeight ?? 0) / 2 - (doc.height / 2) * zoom;
        return (
          <div
            key={slice.id}
            style={{
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              width: `${slice.width * zoom}px`,
              height: `${slice.height * zoom}px`,
              border: '2px solid #00ff00',
              backgroundColor: 'rgba(0, 255, 0, 0.1)',
              pointerEvents: 'none',
              zIndex: 900
            }}
          >
            <div style={{ background: '#00ff00', color: '#000', fontSize: '10px', padding: '2px 4px', display: 'inline-block' }}>
              {slice.name || 'Slice'}
            </div>
            {activeTool === 'slice' && _onDeleteSlice && (
              <button
                style={{ position: 'absolute', top: 0, right: 0, pointerEvents: 'auto', background: 'red', color: 'white', border: 'none', width: '20px', height: '20px', cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); _onDeleteSlice(slice.id); }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}

      {/* Active Slice Drag Bounding Box */}
      {sliceDragStartPt && sliceDragCurrentPt && activeTool === 'slice' && (
        <div
          style={{
            position: 'absolute',
            left: `${Math.min(sliceDragStartPt.x, sliceDragCurrentPt.x) * zoom + pan.x + (containerRef.current?.offsetWidth ?? 0) / 2 - (doc.width / 2) * zoom}px`,
            top: `${Math.min(sliceDragStartPt.y, sliceDragCurrentPt.y) * zoom + pan.y + (containerRef.current?.offsetHeight ?? 0) / 2 - (doc.height / 2) * zoom}px`,
            width: `${Math.abs(sliceDragCurrentPt.x - sliceDragStartPt.x) * zoom}px`,
            height: `${Math.abs(sliceDragCurrentPt.y - sliceDragStartPt.y) * zoom}px`,
            border: '2px dashed #00ff00',
            backgroundColor: 'rgba(0, 255, 0, 0.2)',
            pointerEvents: 'none',
            zIndex: 950
          }}
        />
      )}

      {/* Document Canvas Workspace */}
      <div
        ref={documentRef}
        className="canvas-document"
        style={{
          width: `${doc.width}px`,
          height: `${doc.height}px`,
          backgroundColor: doc.backgroundColor,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          filter: separationFilter,
        }}
        onMouseDown={(e) => {
          if (activeTool === 'select' && e.target === e.currentTarget) {
            setSelectedLayerIds([]);
          }
        }}
      >
        {/* Render Layers in Order (back to front) */}
        {doc.layers
          .filter((layer) => layer.visible)
          .map((layer) => {
            const isSelected = selectedLayerIds.includes(layer.id);
            return (
              <div
                key={layer.id}
                ref={(el) => { layerRefs.current[layer.id] = el; }}
                className={`layer-wrapper ${isSelected ? 'selected' : ''}`}
                onMouseDown={(e) => handleLayerMouseDown(e, layer.id)}
                style={{
                  position: 'absolute',
                  left: `${layer.x}px`,
                  top: `${layer.y}px`,
                  width: `${layer.width}px`,
                  height: `${layer.height}px`,
                  transform: `rotate(${layer.rotation}deg)`,
                  opacity: layer.opacity,
                  zIndex: doc.layers.indexOf(layer),
                  outline: isSelected && !layer.locked && activeTool === 'select' ? '1px dashed var(--accent-purple)' : 'none',
                  cursor: layer.locked ? 'not-allowed' : activeTool === 'select' ? 'move' : 'default',
                }}
              >
                {renderLayerContent(layer)}

                  {/* ON-CANVAS GRADIENT OVERLAY */}
                  {isSelected && activeTool === 'select' && (layer.type === 'shape' || layer.type === 'text') && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 10,
                      }}
                    >
                      {/* Linear Gradient Handle */}
                      {(layer as FillProperties).fillType === 'linear-gradient' && (() => {
                        const sl = layer as FillProperties;
                        const angle = sl.gradientAngle ?? 90;
                        const angleRad = (angle * Math.PI) / 180;
                        const radius = Math.min(layer.width, layer.height) / 2 - 10;
                        const cx = layer.width / 2;
                        const cy = layer.height / 2;
                        const endX = cx + Math.cos(angleRad) * radius;
                        const endY = cy + Math.sin(angleRad) * radius;

                        return (
                          <>
                            <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                              <line x1={cx} y1={cy} x2={endX} y2={endY} stroke="white" strokeWidth="2" strokeDasharray="4 4" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }} />
                              <circle cx={cx} cy={cy} r="4" fill="white" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }} />
                            </svg>
                            <div
                              onMouseDown={(e) => startGradientDrag(e, layer as ShapeLayer)}
                              style={{
                                position: 'absolute',
                                left: endX - 8,
                                top: endY - 8,
                                width: 16,
                                height: 16,
                                background: '#3b82f6',
                                border: '2px solid white',
                                borderRadius: '50%',
                                cursor: 'crosshair',
                                pointerEvents: 'auto',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                              }}
                            />
                          </>
                        );
                      })()}

                      {/* Radial Gradient Handle */}
                      {(layer as FillProperties).fillType === 'radial-gradient' && (() => {
                        const sl = layer as FillProperties;
                        const center = sl.radialGradientCenter || { x: 50, y: 50, r: 50 };
                        const px = (center.x / 100) * layer.width;
                        const py = (center.y / 100) * layer.height;

                        return (
                          <>
                            <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                              <circle cx={px} cy={py} r="10" stroke="white" strokeWidth="2" strokeDasharray="2 2" fill="none" style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))' }} />
                            </svg>
                            <div
                              onMouseDown={(e) => startRadialCenterDrag(e, layer as any)}
                              style={{
                                position: 'absolute',
                                left: px - 8,
                                top: py - 8,
                                width: 16,
                                height: 16,
                                background: '#ec4899',
                                border: '2px solid white',
                                borderRadius: '50%',
                                cursor: 'move',
                                pointerEvents: 'auto',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                              }}
                            />
                          </>
                        );
                      })()}

                      {/* Mesh Gradient Handles */}
                      {(layer as FillProperties).fillType === 'mesh-gradient' && (() => {
                        const sl = layer as FillProperties;
                        return sl.meshPoints?.map((pt, i) => {
                          const px = (pt.x / 100) * layer.width;
                          const py = (pt.y / 100) * layer.height;
                          return (
                            <div
                              key={i}
                              onMouseDown={(e) => startMeshNodeDrag(e, layer as FillProperties & BaseLayer, i)}
                              style={{
                                position: 'absolute',
                                left: px - 8,
                                top: py - 8,
                                width: 16,
                                height: 16,
                                background: pt.color,
                                border: '2px solid white',
                                borderRadius: '50%',
                                cursor: 'move',
                                pointerEvents: 'auto',
                                boxShadow: '0 2px 5px rgba(0,0,0,0.5)',
                              }}
                            />
                          );
                        });
                      })()}
                    </div>
                  )}

                {/* ON-CANVAS CROP VIEWPORT OVERLAY */}
                {activeTool === 'crop' && isSelected && layer.type === 'image' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      outline: '2px solid #3b82f6',
                      pointerEvents: 'auto',
                    }}
                  >
                    {/* Handles */}
                    <div
                      onMouseDown={(e) => startCropDrag(e, 'tl', layer as ImageLayer)}
                      style={{ position: 'absolute', top: -6, left: -6, width: 12, height: 12, background: '#3b82f6', cursor: 'nwse-resize', borderRadius: '50%' }}
                    />
                    <div
                      onMouseDown={(e) => startCropDrag(e, 'tr', layer as ImageLayer)}
                      style={{ position: 'absolute', top: -6, right: -6, width: 12, height: 12, background: '#3b82f6', cursor: 'nesw-resize', borderRadius: '50%' }}
                    />
                    <div
                      onMouseDown={(e) => startCropDrag(e, 'bl', layer as ImageLayer)}
                      style={{ position: 'absolute', bottom: -6, left: -6, width: 12, height: 12, background: '#3b82f6', cursor: 'nesw-resize', borderRadius: '50%' }}
                    />
                    <div
                      onMouseDown={(e) => startCropDrag(e, 'br', layer as ImageLayer)}
                      style={{ position: 'absolute', bottom: -6, right: -6, width: 12, height: 12, background: '#3b82f6', cursor: 'nwse-resize', borderRadius: '50%' }}
                    />
                  </div>
                )}
              </div>
            );
          })}

        {/* Temporary Drawing Canvas Overlay */}
        {(activeTool === 'draw' || activeTool === 'lasso') && (
          <canvas
            ref={drawingCanvasRef}
            width={doc.width}
            height={doc.height}
            onMouseDown={handleDrawingMouseDown}
            onMouseMove={handleDrawingMouseMove}
            onMouseUp={handleDrawingMouseUp}
            onMouseLeave={handleDrawingMouseUp}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 9999,
              cursor: 'crosshair',
              pointerEvents: 'auto',
            }}
          />
        )}

        {/* Transformer Box overlay for selected active layer */}
        {selectedLayer && !selectedLayer.locked && activeTool === 'select' && (
          <Transformer
            layer={selectedLayer}
            zoom={zoom}
            canvasBounds={canvasBounds}
            onTransform={(updatedFields) => onUpdateLayerRef.current(selectedLayer.id, updatedFields)}
            onTransformEnd={(finalTransform) => {
              // finalTransform is computed entirely inside Transformer — no stale doc needed here
              onCommitLayerRef.current(selectedLayer.id, finalTransform);
            }}
          />
        )}
      </div>

      {marqueeStart && marqueeCurrent && activeTool === 'select' && (
        <div
          style={{
            position: 'absolute',
            pointerEvents: 'none',
            zIndex: 9999,
            left: `${Math.min(marqueeStart.x, marqueeCurrent.x) * zoom + pan.x + (containerRef.current?.offsetWidth ?? 0) / 2 - (doc.width / 2) * zoom}px`,
            top: `${Math.min(marqueeStart.y, marqueeCurrent.y) * zoom + pan.y + (containerRef.current?.offsetHeight ?? 0) / 2 - (doc.height / 2) * zoom}px`,
            width: `${Math.abs(marqueeCurrent.x - marqueeStart.x) * zoom}px`,
            height: `${Math.abs(marqueeCurrent.y - marqueeStart.y) * zoom}px`,
            border: '1px solid #8b5cf6',
            backgroundColor: 'rgba(139, 92, 246, 0.2)',
          }}
        />
      )}

      {/* Zoom / Viewport Status Indicators */}
      <div className="zoom-controls glass">
        <button className="zoom-btn" onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}>
          <Icons.Minus size={14} />
        </button>
        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
        <button className="zoom-btn" onClick={() => setZoom((z) => Math.min(4.0, z + 0.1))}>
          <Icons.Plus size={14} />
        </button>
        <button
          className="zoom-btn"
          title="Zoom to Fit"
          onClick={() => {
            if (!containerRef.current) return;
            const containerW = containerRef.current.offsetWidth - 80;
            const containerH = containerRef.current.offsetHeight - 80;
            const scaleW = containerW / doc.width;
            const scaleH = containerH / doc.height;
            const fitZoom = Math.min(scaleW, scaleH, 1.0);
            setZoom(fitZoom);
            setPan({ x: 0, y: 0 }); // Center in container
          }}
        >
          <Icons.Maximize size={14} />
        </button>
      </div>
    </div>
  );
};
