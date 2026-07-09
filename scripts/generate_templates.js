const fs = require('fs');
const path = require('path');

const tsContent = `import type { Layer } from './types';

// Helper: Ensure layer has all required rendering defaults
function fillDefaults(layer: any): Layer {
  return {
    rotation: 0,
    opacity: 1,
    locked: false, // Ensure backgrounds are editable
    visible: true,
    blendMode: 'normal',
    shadowBlur: 0,
    shadowColor: '#000000',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    stroke: false,
    strokeColor: '#000000',
    strokeWidth: 1,
    flipH: false,
    flipV: false,
    ...layer
  };
}

// Generate an SVG data URI to accurately represent the template's layers
function generateSvgThumbnail(width: number, height: number, bgColor: string, layers: Layer[]): string {
  const scale = 300 / Math.max(width, height);
  const w = width * scale;
  const h = height * scale;

  let svgElements = '';
  
  // Sort layers from bottom to top
  const sortedLayers = [...layers].reverse();

  for (const layer of sortedLayers) {
    if (!layer.visible) continue;

    const lx = (layer.x || 0) * scale;
    const ly = (layer.y || 0) * scale;
    const lw = (layer.width || 0) * scale;
    const lh = (layer.height || 0) * scale;

    let transform = '';
    if (layer.rotation) {
      const cx = lx + lw/2;
      const cy = ly + lh/2;
      transform = \`transform="rotate(\${layer.rotation} \${cx} \${cy})"\`;
    }

    if (layer.type === 'shape') {
      const fill = (layer as any).fill || '#cccccc';
      if ((layer as any).shapeType === 'circle') {
        const cx = lx + lw/2;
        const cy = ly + lh/2;
        const r = lw/2;
        svgElements += \`<circle cx="\${cx}" cy="\${cy}" r="\${r}" fill="\${fill}" \${transform} opacity="\${layer.opacity || 1}" />\`;
      } else {
        svgElements += \`<rect x="\${lx}" y="\${ly}" width="\${lw}" height="\${lh}" fill="\${fill}" \${transform} opacity="\${layer.opacity || 1}" />\`;
      }
    } else if (layer.type === 'text') {
      const textLayer = layer as any;
      const fill = textLayer.color || '#000000';
      const fontSize = (textLayer.fontSize || 16) * scale;
      const fontWeight = textLayer.fontWeight || 'normal';
      const text = (textLayer.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      let textAnchor = 'start';
      let tx = lx;
      if (textLayer.textAlign === 'center') {
        textAnchor = 'middle';
        tx = lx + lw/2;
      } else if (textLayer.textAlign === 'right') {
        textAnchor = 'end';
        tx = lx + lw;
      }
      
      const ty = ly + fontSize * 0.8; 
      
      svgElements += \`<text x="\${tx}" y="\${ty}" fill="\${fill}" font-size="\${fontSize}px" font-weight="\${fontWeight}" font-family="\${textLayer.fontFamily || 'sans-serif'}" text-anchor="\${textAnchor}" \${transform} opacity="\${layer.opacity || 1}">\${text}</text>\`;
    } else if (layer.type === 'image') {
      svgElements += \`<rect x="\${lx}" y="\${ly}" width="\${lw}" height="\${lh}" fill="#e2e8f0" \${transform} opacity="\${layer.opacity || 1}" />\`;
      const cx = lx + lw/2;
      const cy = ly + lh/2;
      svgElements += \`<circle cx="\${cx}" cy="\${cy}" r="\${Math.min(lw, lh)*0.2}" fill="#cbd5e1" \${transform} opacity="\${layer.opacity || 1}" />\`;
    }
  }

  const svg = \`<svg xmlns="http://www.w3.org/2000/svg" width="\${w}" height="\${h}" viewBox="0 0 \${w} \${h}">
    <rect width="\${w}" height="\${h}" fill="\${bgColor}" />
    \${svgElements}
  </svg>\`;

  return \`data:image/svg+xml;base64,\${btoa(unescape(encodeURIComponent(svg)))}\`;
}

let idCounter = 1;

// 15 Distinct Handcrafted Templates
export const TEMPLATES = [
  // ----------------------------------------------------
  // BUSINESS CARDS (3)
  // ----------------------------------------------------
  {
    id: \`tmpl-\${idCounter++}\`, name: 'Modern Corporate Business Card', category: 'Print', width: 1050, height: 600, backgroundColor: '#0f172a', isPremium: false,
    layers: [
      { id: crypto.randomUUID(), type: 'shape', name: 'Accent Ribbon', x: 0, y: 550, width: 1050, height: 50, shapeType: 'rectangle', fill: '#3b82f6' },
      { id: crypto.randomUUID(), type: 'shape', name: 'Logo Block', x: 100, y: 150, width: 120, height: 120, shapeType: 'rectangle', fill: '#ffffff' },
      { id: crypto.randomUUID(), type: 'text', name: 'Name', x: 300, y: 160, width: 600, height: 60, text: 'ALEXANDER WRIGHT', fontSize: 48, fontFamily: 'Inter', color: '#ffffff', fontWeight: 'bold' },
      { id: crypto.randomUUID(), type: 'text', name: 'Title', x: 300, y: 230, width: 600, height: 40, text: 'Chief Executive Officer', fontSize: 24, fontFamily: 'Inter', color: '#94a3b8', fontWeight: '500' },
      { id: crypto.randomUUID(), type: 'text', name: 'Contact Info', x: 300, y: 350, width: 600, height: 100, text: '+1 (555) 019-2837\\nalex@wrightcorp.com\\nwrightcorp.com', fontSize: 20, fontFamily: 'Inter', color: '#cbd5e1', fontWeight: '400' }
    ].map(fillDefaults)
  },
  {
    id: \`tmpl-\${idCounter++}\`, name: 'Minimalist Studio Card', category: 'Print', width: 1050, height: 600, backgroundColor: '#fafaf9', isPremium: false,
    layers: [
      { id: crypto.randomUUID(), type: 'text', name: 'Logo', x: 50, y: 50, width: 950, height: 60, text: 'S T U D I O   V', fontSize: 36, fontFamily: 'Playfair Display', color: '#1c1917', fontWeight: '700', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'text', name: 'Name', x: 50, y: 250, width: 950, height: 50, text: 'Elena Rostova', fontSize: 42, fontFamily: 'Inter', color: '#1c1917', fontWeight: '300', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'text', name: 'Title', x: 50, y: 310, width: 950, height: 40, text: 'Art Director', fontSize: 18, fontFamily: 'Inter', color: '#78716c', fontWeight: '400', textAlign: 'center', letterSpacing: 6 },
      { id: crypto.randomUUID(), type: 'shape', name: 'Divider', x: 425, y: 400, width: 200, height: 1, shapeType: 'rectangle', fill: '#d6d3d1' },
      { id: crypto.randomUUID(), type: 'text', name: 'Contact', x: 50, y: 450, width: 950, height: 40, text: 'elena@studiov.design   •   123 Arts District, NY', fontSize: 16, fontFamily: 'Inter', color: '#57534e', fontWeight: '400', textAlign: 'center' }
    ].map(fillDefaults)
  },
  {
    id: \`tmpl-\${idCounter++}\`, name: 'Creative Gradient Card', category: 'Print', width: 1050, height: 600, backgroundColor: '#ffffff', isPremium: true,
    layers: [
      { id: crypto.randomUUID(), type: 'image', name: 'Gradient Background', x: 0, y: 0, width: 1050, height: 600, url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=1050&q=80', locked: false },
      { id: crypto.randomUUID(), type: 'shape', name: 'White Overlay', x: 50, y: 50, width: 950, height: 500, shapeType: 'rectangle', fill: '#ffffff', opacity: 0.9 },
      { id: crypto.randomUUID(), type: 'text', name: 'Name', x: 150, y: 200, width: 750, height: 80, text: 'JAYDEN LEE', fontSize: 72, fontFamily: 'Inter', color: '#ec4899', fontWeight: '900' },
      { id: crypto.randomUUID(), type: 'text', name: 'Role', x: 150, y: 280, width: 750, height: 40, text: 'Creative Technologist', fontSize: 24, fontFamily: 'Inter', color: '#000000', fontWeight: 'bold' },
      { id: crypto.randomUUID(), type: 'text', name: 'Web', x: 150, y: 400, width: 750, height: 40, text: 'jaydenlee.dev', fontSize: 20, fontFamily: 'Inter', color: '#4f46e5', fontWeight: '600' }
    ].map(fillDefaults)
  },

  // ----------------------------------------------------
  // RESTAURANT MENUS (3)
  // ----------------------------------------------------
  {
    id: \`tmpl-\${idCounter++}\`, name: 'Fine Dining Menu', category: 'Print', width: 1200, height: 1600, backgroundColor: '#fdfbf7', isPremium: false,
    layers: [
      { id: crypto.randomUUID(), type: 'shape', name: 'Border', x: 50, y: 50, width: 1100, height: 1500, shapeType: 'rectangle', fill: 'transparent', stroke: true, strokeColor: '#d4af37', strokeWidth: 4 },
      { id: crypto.randomUUID(), type: 'text', name: 'Restaurant Name', x: 100, y: 150, width: 1000, height: 100, text: 'LUMIÈRE', fontSize: 80, fontFamily: 'Playfair Display', color: '#1e293b', fontWeight: 'bold', textAlign: 'center', letterSpacing: 12 },
      { id: crypto.randomUUID(), type: 'text', name: 'Subtitle', x: 100, y: 260, width: 1000, height: 40, text: 'A TASTING EXPERIENCE', fontSize: 24, fontFamily: 'Inter', color: '#64748b', fontWeight: '500', textAlign: 'center', letterSpacing: 8 },
      { id: crypto.randomUUID(), type: 'text', name: 'Course 1', x: 200, y: 450, width: 800, height: 60, text: 'I. Amuse-Bouche', fontSize: 32, fontFamily: 'Playfair Display', color: '#1e293b', fontWeight: '600', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'text', name: 'Desc 1', x: 200, y: 500, width: 800, height: 60, text: 'Caviar, blini, crème fraîche, chives', fontSize: 20, fontFamily: 'Inter', color: '#475569', fontWeight: '400', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'text', name: 'Course 2', x: 200, y: 650, width: 800, height: 60, text: 'II. Sea', fontSize: 32, fontFamily: 'Playfair Display', color: '#1e293b', fontWeight: '600', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'text', name: 'Desc 2', x: 200, y: 700, width: 800, height: 60, text: 'Seared scallops, cauliflower purée, pancetta', fontSize: 20, fontFamily: 'Inter', color: '#475569', fontWeight: '400', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'text', name: 'Course 3', x: 200, y: 850, width: 800, height: 60, text: 'III. Land', fontSize: 32, fontFamily: 'Playfair Display', color: '#1e293b', fontWeight: '600', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'text', name: 'Desc 3', x: 200, y: 900, width: 800, height: 60, text: 'Dry-aged Wagyu, truffle mash, asparagus', fontSize: 20, fontFamily: 'Inter', color: '#475569', fontWeight: '400', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'text', name: 'Footer', x: 100, y: 1450, width: 1000, height: 40, text: '120 per guest • Wine pairing 80', fontSize: 18, fontFamily: 'Inter', color: '#94a3b8', fontWeight: '400', textAlign: 'center' }
    ].map(fillDefaults)
  },
  {
    id: \`tmpl-\${idCounter++}\`, name: 'Casual Cafe Menu', category: 'Print', width: 1200, height: 1600, backgroundColor: '#fef3c7', isPremium: false,
    layers: [
      { id: crypto.randomUUID(), type: 'shape', name: 'Header bg', x: 0, y: 0, width: 1200, height: 300, shapeType: 'rectangle', fill: '#d97706' },
      { id: crypto.randomUUID(), type: 'text', name: 'Cafe Name', x: 100, y: 100, width: 1000, height: 100, text: 'THE DAILY ROAST', fontSize: 80, fontFamily: 'Inter', color: '#ffffff', fontWeight: '900', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'text', name: 'Coffee Header', x: 150, y: 400, width: 900, height: 60, text: 'COFFEE & ESPRESSO', fontSize: 40, fontFamily: 'Inter', color: '#92400e', fontWeight: 'bold' },
      { id: crypto.randomUUID(), type: 'text', name: 'Item 1', x: 150, y: 500, width: 700, height: 40, text: 'Latte', fontSize: 28, fontFamily: 'Inter', color: '#1f2937', fontWeight: '600' },
      { id: crypto.randomUUID(), type: 'text', name: 'Price 1', x: 850, y: 500, width: 200, height: 40, text: '$4.50', fontSize: 28, fontFamily: 'Inter', color: '#1f2937', fontWeight: 'bold', textAlign: 'right' },
      { id: crypto.randomUUID(), type: 'text', name: 'Item 2', x: 150, y: 580, width: 700, height: 40, text: 'Cappuccino', fontSize: 28, fontFamily: 'Inter', color: '#1f2937', fontWeight: '600' },
      { id: crypto.randomUUID(), type: 'text', name: 'Price 2', x: 850, y: 580, width: 200, height: 40, text: '$4.50', fontSize: 28, fontFamily: 'Inter', color: '#1f2937', fontWeight: 'bold', textAlign: 'right' },
      { id: crypto.randomUUID(), type: 'text', name: 'Item 3', x: 150, y: 660, width: 700, height: 40, text: 'Cold Brew', fontSize: 28, fontFamily: 'Inter', color: '#1f2937', fontWeight: '600' },
      { id: crypto.randomUUID(), type: 'text', name: 'Price 3', x: 850, y: 660, width: 200, height: 40, text: '$5.00', fontSize: 28, fontFamily: 'Inter', color: '#1f2937', fontWeight: 'bold', textAlign: 'right' },
      { id: crypto.randomUUID(), type: 'shape', name: 'Divider', x: 150, y: 780, width: 900, height: 4, shapeType: 'rectangle', fill: '#fcd34d' }
    ].map(fillDefaults)
  },
  {
    id: \`tmpl-\${idCounter++}\`, name: 'Cocktail Bar Menu', category: 'Print', width: 1200, height: 1600, backgroundColor: '#000000', isPremium: true,
    layers: [
      { id: crypto.randomUUID(), type: 'text', name: 'Title', x: 100, y: 150, width: 1000, height: 120, text: 'NIGHT OWL', fontSize: 100, fontFamily: 'Playfair Display', color: '#fbbf24', fontWeight: 'bold', textAlign: 'center', letterSpacing: 20 },
      { id: crypto.randomUUID(), type: 'text', name: 'Subtitle', x: 100, y: 280, width: 1000, height: 40, text: 'SIGNATURE COCKTAILS', fontSize: 24, fontFamily: 'Inter', color: '#ffffff', fontWeight: '500', textAlign: 'center', letterSpacing: 8 },
      { id: crypto.randomUUID(), type: 'text', name: 'Item 1', x: 200, y: 450, width: 800, height: 50, text: 'Midnight Smash ................ 16', fontSize: 32, fontFamily: 'Playfair Display', color: '#ffffff', fontWeight: '400', textAlign: 'left' },
      { id: crypto.randomUUID(), type: 'text', name: 'Desc 1', x: 200, y: 500, width: 800, height: 40, text: 'Bourbon, blackberry, mint, lemon, ginger beer.', fontSize: 20, fontFamily: 'Inter', color: '#9ca3af', fontWeight: '300', textAlign: 'left' },
      { id: crypto.randomUUID(), type: 'text', name: 'Item 2', x: 200, y: 600, width: 800, height: 50, text: 'Velvet Dream .................. 18', fontSize: 32, fontFamily: 'Playfair Display', color: '#ffffff', fontWeight: '400', textAlign: 'left' },
      { id: crypto.randomUUID(), type: 'text', name: 'Desc 2', x: 200, y: 650, width: 800, height: 40, text: 'Empress gin, lavender, egg white, lemon.', fontSize: 20, fontFamily: 'Inter', color: '#9ca3af', fontWeight: '300', textAlign: 'left' }
    ].map(fillDefaults)
  },

  // ----------------------------------------------------
  // EVENT BADGES (3)
  // ----------------------------------------------------
  {
    id: \`tmpl-\${idCounter++}\`, name: 'Tech Conference VIP', category: 'Print', width: 600, height: 900, backgroundColor: '#ffffff', isPremium: false,
    layers: [
      { id: crypto.randomUUID(), type: 'shape', name: 'Top Bar', x: 0, y: 0, width: 600, height: 150, shapeType: 'rectangle', fill: '#4f46e5' },
      { id: crypto.randomUUID(), type: 'text', name: 'Event Name', x: 0, y: 50, width: 600, height: 60, text: 'DEV SUMMIT', fontSize: 48, fontFamily: 'Inter', color: '#ffffff', fontWeight: '900', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'text', name: 'Name', x: 50, y: 250, width: 500, height: 80, text: 'MARK', fontSize: 72, fontFamily: 'Inter', color: '#0f172a', fontWeight: '800', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'text', name: 'Last Name', x: 50, y: 340, width: 500, height: 60, text: 'ZUCKERBERG', fontSize: 48, fontFamily: 'Inter', color: '#475569', fontWeight: '700', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'text', name: 'Company', x: 50, y: 480, width: 500, height: 40, text: 'Meta', fontSize: 32, fontFamily: 'Inter', color: '#3b82f6', fontWeight: 'bold', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'shape', name: 'Bottom Bar', x: 0, y: 750, width: 600, height: 150, shapeType: 'rectangle', fill: '#0f172a' },
      { id: crypto.randomUUID(), type: 'text', name: 'Role', x: 0, y: 800, width: 600, height: 60, text: 'VIP SPEAKER', fontSize: 42, fontFamily: 'Inter', color: '#ffffff', fontWeight: 'bold', textAlign: 'center', letterSpacing: 4 }
    ].map(fillDefaults)
  },
  {
    id: \`tmpl-\${idCounter++}\`, name: 'Minimalist Staff Badge', category: 'Print', width: 600, height: 900, backgroundColor: '#18181b', isPremium: false,
    layers: [
      { id: crypto.randomUUID(), type: 'shape', name: 'Outline', x: 20, y: 20, width: 560, height: 860, shapeType: 'rectangle', fill: 'transparent', stroke: true, strokeColor: '#52525b', strokeWidth: 4 },
      { id: crypto.randomUUID(), type: 'text', name: 'Role', x: 50, y: 100, width: 500, height: 60, text: 'STAFF', fontSize: 48, fontFamily: 'Inter', color: '#f43f5e', fontWeight: '900', textAlign: 'center', letterSpacing: 8 },
      { id: crypto.randomUUID(), type: 'shape', name: 'Photo Block', x: 150, y: 220, width: 300, height: 300, shapeType: 'circle', fill: '#27272a' },
      { id: crypto.randomUUID(), type: 'text', name: 'Name', x: 50, y: 580, width: 500, height: 80, text: 'DAVID', fontSize: 64, fontFamily: 'Inter', color: '#ffffff', fontWeight: 'bold', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'text', name: 'Last', x: 50, y: 660, width: 500, height: 60, text: 'CHEN', fontSize: 48, fontFamily: 'Inter', color: '#a1a1aa', fontWeight: '400', textAlign: 'center' }
    ].map(fillDefaults)
  },
  {
    id: \`tmpl-\${idCounter++}\`, name: 'Music Festival Pass', category: 'Print', width: 600, height: 900, backgroundColor: '#000000', isPremium: true,
    layers: [
      { id: crypto.randomUUID(), type: 'image', name: 'Vibrant BG', x: 0, y: 0, width: 600, height: 900, url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80', locked: false, opacity: 0.6 },
      { id: crypto.randomUUID(), type: 'text', name: 'Fest Name', x: 50, y: 100, width: 500, height: 100, text: 'NEON\\nNIGHTS', fontSize: 64, fontFamily: 'Playfair Display', color: '#0ea5e9', fontWeight: '900', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'shape', name: 'Glass Box', x: 50, y: 600, width: 500, height: 250, shapeType: 'rectangle', fill: '#000000', opacity: 0.8 },
      { id: crypto.randomUUID(), type: 'text', name: 'Type', x: 50, y: 650, width: 500, height: 80, text: 'ALL ACCESS', fontSize: 56, fontFamily: 'Inter', color: '#facc15', fontWeight: '900', textAlign: 'center' },
      { id: crypto.randomUUID(), type: 'text', name: 'Days', x: 50, y: 750, width: 500, height: 40, text: 'FRI - SUN', fontSize: 32, fontFamily: 'Inter', color: '#ffffff', fontWeight: 'bold', textAlign: 'center' }
    ].map(fillDefaults)
  },

  // ----------------------------------------------------
  // SOCIAL PROMOS (3)
  // ----------------------------------------------------
  {
    id: \`tmpl-\${idCounter++}\`, name: 'Instagram Flash Sale', category: 'Social', width: 1080, height: 1080, backgroundColor: '#dc2626', isPremium: false,
    layers: [
      { id: crypto.randomUUID(), type: 'shape', name: 'Center Square', x: 90, y: 90, width: 900, height: 900, shapeType: 'rectangle', fill: 'transparent', stroke: true, strokeColor: '#ffffff', strokeWidth: 8 },
      { id: crypto.randomUUID(), type: 'text', name: 'Eyebrow', x: 100, y: 250, width: 880, height: 60, text: 'LIMITED TIME ONLY', fontSize: 40, fontFamily: 'Inter', color: '#ffffff', fontWeight: 'bold', textAlign: 'center', letterSpacing: 8 },
      { id: crypto.randomUUID(), type: 'text', name: 'Main', x: 100, y: 400, width: 880, height: 200, text: 'FLASH\\nSALE', fontSize: 180, fontFamily: 'Inter', color: '#fef08a', fontWeight: '900', textAlign: 'center', letterSpacing: -4 },
      { id: crypto.randomUUID(), type: 'text', name: 'Discount', x: 100, y: 750, width: 880, height: 100, text: '50% OFF', fontSize: 90, fontFamily: 'Inter', color: '#ffffff', fontWeight: '900', textAlign: 'center' }
    ].map(fillDefaults)
  },
  {
    id: \`tmpl-\${idCounter++}\`, name: 'Real Estate Listing', category: 'Social', width: 1080, height: 1080, backgroundColor: '#f8fafc', isPremium: true,
    layers: [
      { id: crypto.randomUUID(), type: 'image', name: 'House Photo', x: 0, y: 0, width: 1080, height: 700, url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1080&q=80', locked: false },
      { id: crypto.randomUUID(), type: 'shape', name: 'Bottom bg', x: 0, y: 700, width: 1080, height: 380, shapeType: 'rectangle', fill: '#0f172a' },
      { id: crypto.randomUUID(), type: 'text', name: 'Status', x: 50, y: 750, width: 300, height: 50, text: 'JUST LISTED', fontSize: 32, fontFamily: 'Inter', color: '#38bdf8', fontWeight: 'bold', letterSpacing: 4 },
      { id: crypto.randomUUID(), type: 'text', name: 'Address', x: 50, y: 820, width: 980, height: 60, text: '1234 Luxury Lane, Beverly Hills', fontSize: 48, fontFamily: 'Inter', color: '#ffffff', fontWeight: '600' },
      { id: crypto.randomUUID(), type: 'text', name: 'Price', x: 50, y: 920, width: 500, height: 60, text: '$4,250,000', fontSize: 56, fontFamily: 'Inter', color: '#f8fafc', fontWeight: '800' },
      { id: crypto.randomUUID(), type: 'text', name: 'Details', x: 600, y: 940, width: 430, height: 40, text: '4 Bed • 5 Bath • 4,500 sqft', fontSize: 28, fontFamily: 'Inter', color: '#94a3b8', fontWeight: '400', textAlign: 'right' }
    ].map(fillDefaults)
  },
  {
    id: \`tmpl-\${idCounter++}\`, name: 'Podcast Episode Announce', category: 'Social', width: 1080, height: 1080, backgroundColor: '#020617', isPremium: false,
    layers: [
      { id: crypto.randomUUID(), type: 'shape', name: 'Circle Photo', x: 140, y: 100, width: 800, height: 800, shapeType: 'circle', fill: '#334155' },
      { id: crypto.randomUUID(), type: 'text', name: 'New Episode', x: 0, y: 850, width: 1080, height: 60, text: 'NEW EPISODE AVAILABLE', fontSize: 40, fontFamily: 'Inter', color: '#10b981', fontWeight: 'bold', textAlign: 'center', letterSpacing: 6 },
      { id: crypto.randomUUID(), type: 'text', name: 'Guest Name', x: 0, y: 930, width: 1080, height: 80, text: 'FEAT. DR. JANE DOE', fontSize: 64, fontFamily: 'Inter', color: '#ffffff', fontWeight: '900', textAlign: 'center' }
    ].map(fillDefaults)
  },

  // ----------------------------------------------------
  // BANNERS (3)
  // ----------------------------------------------------
  {
    id: \`tmpl-\${idCounter++}\`, name: 'LinkedIn Personal Banner', category: 'Banner', width: 1584, height: 396, backgroundColor: '#2563eb', isPremium: false,
    layers: [
      { id: crypto.randomUUID(), type: 'shape', name: 'Pattern Block', x: 1000, y: -100, width: 800, height: 800, shapeType: 'circle', fill: '#1d4ed8', opacity: 0.5 },
      { id: crypto.randomUUID(), type: 'text', name: 'Name', x: 100, y: 100, width: 800, height: 80, text: 'SOFTWARE ENGINEER', fontSize: 64, fontFamily: 'Inter', color: '#ffffff', fontWeight: '900' },
      { id: crypto.randomUUID(), type: 'text', name: 'Skills', x: 100, y: 200, width: 800, height: 40, text: 'React • Node.js • Cloud Architecture', fontSize: 32, fontFamily: 'Inter', color: '#bfdbfe', fontWeight: '500' },
      { id: crypto.randomUUID(), type: 'text', name: 'CTA', x: 100, y: 280, width: 800, height: 40, text: 'Open to new opportunities', fontSize: 24, fontFamily: 'Inter', color: '#f8fafc', fontWeight: '300' }
    ].map(fillDefaults)
  },
  {
    id: \`tmpl-\${idCounter++}\`, name: 'E-commerce Hero Banner', category: 'Banner', width: 1920, height: 600, backgroundColor: '#fdf4ff', isPremium: true,
    layers: [
      { id: crypto.randomUUID(), type: 'image', name: 'Product BG', x: 960, y: 0, width: 960, height: 600, url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=960&q=80', locked: false },
      { id: crypto.randomUUID(), type: 'text', name: 'Season', x: 150, y: 150, width: 700, height: 50, text: 'SUMMER COLLECTION', fontSize: 36, fontFamily: 'Inter', color: '#c026d3', fontWeight: 'bold', letterSpacing: 8 },
      { id: crypto.randomUUID(), type: 'text', name: 'Title', x: 150, y: 220, width: 800, height: 160, text: 'Step into\\nthe sun.', fontSize: 100, fontFamily: 'Playfair Display', color: '#4a044e', fontWeight: '900', letterSpacing: -2 },
      { id: crypto.randomUUID(), type: 'shape', name: 'Button', x: 150, y: 450, width: 250, height: 60, shapeType: 'rectangle', fill: '#4a044e' },
      { id: crypto.randomUUID(), type: 'text', name: 'Btn Text', x: 150, y: 465, width: 250, height: 30, text: 'SHOP NOW', fontSize: 20, fontFamily: 'Inter', color: '#ffffff', fontWeight: 'bold', textAlign: 'center', letterSpacing: 2 }
    ].map(fillDefaults)
  },
  {
    id: \`tmpl-\${idCounter++}\`, name: 'Web Agency Hero', category: 'Banner', width: 1920, height: 1080, backgroundColor: '#020617', isPremium: true,
    layers: [
      { id: crypto.randomUUID(), type: 'shape', name: 'Glow 1', x: -200, y: -200, width: 800, height: 800, shapeType: 'circle', fill: '#4338ca', opacity: 0.3, shadowBlur: 100, shadowColor: '#4338ca' },
      { id: crypto.randomUUID(), type: 'shape', name: 'Glow 2', x: 1300, y: 500, width: 800, height: 800, shapeType: 'circle', fill: '#0d9488', opacity: 0.3, shadowBlur: 100, shadowColor: '#0d9488' },
      { id: crypto.randomUUID(), type: 'text', name: 'Headline', x: 0, y: 350, width: 1920, height: 200, text: 'We build digital\\nexperiences that scale.', fontSize: 120, fontFamily: 'Inter', color: '#ffffff', fontWeight: '900', textAlign: 'center', letterSpacing: -4 },
      { id: crypto.randomUUID(), type: 'text', name: 'Subtext', x: 0, y: 650, width: 1920, height: 60, text: 'Award-winning design and engineering agency based in San Francisco.', fontSize: 36, fontFamily: 'Inter', color: '#94a3b8', fontWeight: '400', textAlign: 'center' }
    ].map(fillDefaults)
  }
];

// Re-generate thumbnails for each template after they are declared
TEMPLATES.forEach(tmpl => {
  tmpl.thumbnail = generateSvgThumbnail(tmpl.width, tmpl.height, tmpl.backgroundColor, tmpl.layers);
});
\`;

fs.writeFileSync('C:/Users/mrmoh/Desktop/graphic/src/templates.ts', tsContent);
console.log('Successfully wrote templates.ts');
