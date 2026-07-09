export const renderBrushStroke = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  prevX: number,
  prevY: number,
  brushStyle: string,
  color: string,
  width: number,
  pressure: number
) => {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width * pressure;
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';

  if (brushStyle === 'solid') {
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();
    return;
  }

  // Common distance calculations
  const dx = x - prevX;
  const dy = y - prevY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  

  // Group 1: Pencils & Charcoals
  if (brushStyle.includes('pencil') || brushStyle.includes('charcoal') || brushStyle.includes('chalk')) {
    ctx.globalAlpha = brushStyle.includes('pencil') ? 0.6 : 0.8;
    for (let i = 0; i < distance; i += 2) {
      const cx = prevX + (dx * i) / distance;
      const cy = prevY + (dy * i) / distance;
      const spread = brushStyle.includes('charcoal') ? width : width * 0.5;
      for (let j = 0; j < (brushStyle.includes('chalk') ? 10 : 5); j++) {
        ctx.fillRect(
          cx + (Math.random() - 0.5) * spread,
          cy + (Math.random() - 0.5) * spread,
          Math.random() * 2,
          Math.random() * 2
        );
      }
    }
    ctx.globalAlpha = 1.0;
    return;
  }

  // Group 2: Pens & Inks
  if (brushStyle.includes('pen') || brushStyle.includes('ink') || brushStyle.includes('marker')) {
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    if (brushStyle === 'calligraphy-pen') {
       ctx.lineCap = 'butt';
       ctx.lineWidth = width * pressure * 1.5;
    } else if (brushStyle === 'fountain-pen') {
       ctx.lineWidth = width * pressure * (distance < 5 ? 1.5 : 0.5);
    } else if (brushStyle === 'copic-marker') {
       ctx.globalAlpha = 0.4;
       ctx.globalCompositeOperation = 'multiply';
       ctx.lineWidth = width * 1.5;
    }
    ctx.stroke();
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';
    return;
  }

  // Group 3: Paints (Oil, Acrylic, Watercolor)
  if (brushStyle.includes('oil') || brushStyle.includes('acrylic') || brushStyle.includes('watercolor') || brushStyle.includes('gouache')) {
    if (brushStyle.includes('watercolor')) {
       ctx.globalAlpha = 0.15;
       ctx.lineWidth = width * 2;
       ctx.filter = 'blur(2px)';
    } else if (brushStyle.includes('oil')) {
       ctx.globalAlpha = 0.9;
       ctx.lineCap = 'square';
    } else if (brushStyle.includes('acrylic')) {
       ctx.globalAlpha = 0.8;
    }
    
    for (let i = 0; i < distance; i += Math.max(1, width / 4)) {
      const cx = prevX + (dx * i) / distance;
      const cy = prevY + (dy * i) / distance;
      ctx.beginPath();
      ctx.arc(cx, cy, width / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
    ctx.filter = 'none';
    return;
  }

  // Group 4: Airbrushes & Sprays
  if (brushStyle.includes('airbrush') || brushStyle.includes('spray')) {
    ctx.globalAlpha = 0.1;
    for (let i = 0; i < distance; i += 2) {
      const cx = prevX + (dx * i) / distance;
      const cy = prevY + (dy * i) / distance;
      const radius = brushStyle === 'heavy-splatter' ? width * 3 : width;
      const dots = brushStyle === 'fine-spray' ? 30 : 10;
      for (let j = 0; j < dots; j++) {
        const r = Math.random() * radius;
        const a = Math.random() * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1.0;
    return;
  }

  // Group 5: Digital & FX
  if (brushStyle === 'neon-glow' || brushStyle.includes('glow')) {
    ctx.shadowBlur = width * 2;
    ctx.shadowColor = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = width * 0.5;
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.shadowBlur = 0;
    return;
  }

  if (brushStyle === 'pixel-art') {
    ctx.imageSmoothingEnabled = false;
    ctx.fillRect(Math.floor(x), Math.floor(y), Math.max(1, Math.floor(width)), Math.max(1, Math.floor(width)));
    return;
  }

  // Default fallback to solid line
  ctx.beginPath();
  ctx.moveTo(prevX, prevY);
  ctx.lineTo(x, y);
  ctx.stroke();
};
