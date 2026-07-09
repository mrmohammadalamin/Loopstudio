import React, { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { renderBrushStroke } from '../utils/brushEngine';
import type { GraphicDocument, Layer, ShapeType } from '../types';
import { TEMPLATES } from '../templates';

interface SidebarProps {
  document: GraphicDocument;
  selectedLayerIds: string[];
  setSelectedLayerIds: React.Dispatch<React.SetStateAction<string[]>>;
  onAddLayer: (layer: any) => void;
  onUpdateLayer: (id: string, updated: Partial<Layer>) => void;
  onCommitLayer: (id: string, updated: Partial<Layer>) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onReorderLayers: (newLayers: Layer[]) => void;
  onLoadTemplate: (template: any) => void;
  onResizeDocument: (w: number, h: number) => void;
  
  // Advanced Tools
  activeTool: 'select' | 'draw' | 'crop' | 'slice' | 'magic-wand' | 'lasso';
  setActiveTool: (tool: 'select' | 'draw' | 'crop' | 'slice' | 'magic-wand' | 'lasso') => void;
  lassoMode?: 'select' | 'cut' | 'erase';
  setLassoMode?: (mode: 'select' | 'cut' | 'erase') => void;
  lassoFeather?: number;
  setLassoFeather?: (v: number) => void;
  brushColor: string;
  setBrushColor: (c: string) => void;
  brushWidth: number;
  setBrushWidth: (w: number) => void;
  brushStyle: string;
  setBrushStyle: (s: string) => void;
  colorSeparation: 'none' | 'c' | 'm' | 'y' | 'k' | 'r' | 'g' | 'b';
  setColorSeparation: (s: 'none' | 'c' | 'm' | 'y' | 'k' | 'r' | 'g' | 'b') => void;
  localProjects: any[];
  onSaveProject: (projectName?: string) => void;
  onLoadProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onAddSlice: (slice: any) => void;
  onDeleteSlice: (id: string) => void;
  onClearSlices: () => void;
  onExportSlices: () => void;
  exportScale: number;
  setExportScale: (s: number) => void;
  onBulkExport?: (file: File, layout: '1x1' | '2x1' | '2x2', margins?: any) => void;
  onBulkExportPreview?: (file: File, layout: '1x1' | '2x1' | '2x2', margins?: any) => void;
}

type TabType = 'templates' | 'media' | 'text' | 'elements' | 'layers' | 'draw' | 'projects' | 'separation' | 'datamerge';

const BRUSH_CATEGORIES = [
  {
    name: 'Core Tools',
    brushes: [
      { id: 'pencil', label: 'Pencil' },
      { id: 'hard-round', label: 'Hard Round' },
      { id: 'soft-round', label: 'Soft Round' },
      { id: 'eraser', label: 'Eraser' },
      { id: 'highlighter', label: 'Highlighter' },
      { id: 'fountain-pen', label: 'Fountain Pen' },
      { id: 'fine-pen', label: 'Fine Pen' },
      { id: 'thick-marker', label: 'Thick Marker' }
    ]
  },
  {
    name: 'Artistic Media',
    brushes: [
      { id: 'watercolor', label: 'Watercolor' },
      { id: 'oil', label: 'Oil Brush' },
      { id: 'acrylic', label: 'Acrylic' },
      { id: 'gouache', label: 'Gouache' },
      { id: 'dry-brush', label: 'Dry Brush' },
      { id: 'wet-brush', label: 'Wet Brush' },
      { id: 'pastel', label: 'Pastel' },
      { id: 'charcoal', label: 'Charcoal' },
      { id: 'chalk', label: 'Chalk' },
      { id: 'crayon', label: 'Crayon' },
      { id: 'ink', label: 'Ink Wash' },
      { id: 'marker', label: 'Copic Marker' },
      { id: 'sumi-e', label: 'Sumi-e' },
      { id: 'felt-tip', label: 'Felt Tip' },
      { id: 'calligraphy', label: 'Calligraphy' }
    ]
  },
  {
    name: 'Textures',
    brushes: [
      { id: 'sponge', label: 'Sponge' },
      { id: 'stipple', label: 'Stipple' },
      { id: 'splatter', label: 'Splatter' },
      { id: 'spray', label: 'Spray Paint' },
      { id: 'airbrush', label: 'Airbrush' },
      { id: 'noise', label: 'Noise' },
      { id: 'fur', label: 'Fur' },
      { id: 'grass', label: 'Grass' },
      { id: 'leaves', label: 'Leaves' },
      { id: 'sand', label: 'Sand' }
    ]
  },
  {
    name: 'Patterns',
    brushes: [
      { id: 'hatch', label: 'Hatch' },
      { id: 'crosshatch', label: 'Crosshatch' },
      { id: 'dots', label: 'Halftone Dots' },
      { id: 'pixels', label: 'Pixels' },
      { id: 'rake', label: 'Rake' },
      { id: 'stitch', label: 'Stitch' },
      { id: 'chain', label: 'Chain' },
      { id: 'geometric', label: 'Geometric' },
      { id: 'grid', label: 'Grid' }
    ]
  },
  {
    name: 'Special Effects',
    brushes: [
      { id: 'neon', label: 'Neon Glow' },
      { id: 'glitch', label: 'Glitch' },
      { id: 'smoke', label: 'Smoke' },
      { id: 'fire', label: 'Fire' },
      { id: 'sparks', label: 'Sparks' },
      { id: 'stars', label: 'Stars' },
      { id: 'clouds', label: 'Clouds' },
      { id: 'ribbon', label: '3D Ribbon' },
      { id: 'blur', label: 'Smudge' }
    ]
  }
];

const BrushPreview = ({ brushId, isActive }: { brushId: string, isActive: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const width = 60;
    const height = 24;
    
    const color = brushId === 'eraser' ? '#ffffff' : (isActive ? '#4f46e5' : '#9ca3af'); 
    
    // For eraser, draw a dark background to make the white stroke visible
    if (brushId === 'eraser') {
      ctx.fillStyle = isActive ? '#a5b4fc' : '#374151';
      ctx.fillRect(0, 0, width, height);
    }
    
    const pts = [];
    for (let x = 5; x < width - 5; x += 3) {
      const y = height/2 + Math.sin(x * 0.15) * 4;
      pts.push({x, y});
    }
    
    if (pts.length > 0) {
      let prev = pts[0];
      for (let i = 1; i < pts.length; i++) {
         renderBrushStroke(ctx, pts[i].x, pts[i].y, prev.x, prev.y, brushId, color, 4, 1);
         prev = pts[i];
      }
    }
  }, [brushId, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      width={60} 
      height={24} 
      style={{ 
        width: '60px', 
        height: '24px', 
        borderRadius: '4px',
        backgroundColor: brushId === 'eraser' ? (isActive ? '#a5b4fc' : '#374151') : 'transparent',
      }} 
    />
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  document: doc,
  selectedLayerIds,
  setSelectedLayerIds,
  onAddLayer,
  onCommitLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onReorderLayers,
  onLoadTemplate,
  activeTool,
  setActiveTool,
  lassoMode,
  setLassoMode,
  lassoFeather,
  setLassoFeather,
  brushColor,
  setBrushColor,
  brushWidth,
  setBrushWidth,
  brushStyle,
  setBrushStyle,
  localProjects,
  onSaveProject,
  onLoadProject,
  onDeleteProject,
  onBulkExport,
  onBulkExportPreview
}) => {
  const props = { onBulkExport, onBulkExportPreview };
  const [activeTab, setActiveTab] = useState<TabType>('templates');
  const [iconQuery, setIconQuery] = useState('');
  
  // Adobe Express Style Template Filtering
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [showFreeOnly, setShowFreeOnly] = useState(false);
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const categories = ['All', 'Social', 'Print', 'Banner'];

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === 'draw') setActiveTool('draw');
    else setActiveTool('select');
  };

  const POPULAR_ICONS = [
    'Heart', 'Star', 'Sparkles', 'Smile', 'Sun', 'Moon', 'Flame', 'Crown',
    'Globe', 'Compass', 'Gift', 'ShoppingBag', 'Tag', 'Music', 'Camera', 'Video',
    'BookOpen', 'Award', 'Briefcase', 'Coffee', 'Pizza', 'Anchor', 'Flag', 'Send',
    'Layers', 'Layout', 'PenTool', 'Palette', 'Zap', 'Cloud', 'HeartHandshake',
    'Tv', 'Laptop', 'Smartphone', 'MessageSquare', 'Share2', 'Fingerprint', 'ShieldAlert'
  ];

  const filteredIcons = POPULAR_ICONS.filter(name =>
    name.toLowerCase().includes(iconQuery.toLowerCase())
  );

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const maxW = Math.min(img.width, doc.width * 0.6);
        const ratio = img.width / img.height;
        const width = Math.round(maxW);
        const height = Math.round(maxW / ratio);
        
        onAddLayer({
          type: 'image',
          name: file.name.split('.')[0] || 'Image',
          x: Math.round((doc.width - width) / 2),
          y: Math.round((doc.height - height) / 2),
          width,
          height,
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          src: dataUrl,
          brightness: 100,
          contrast: 100,
          saturation: 100,
          blur: 0,
          grayscale: 0,
          sepia: 0,
          hueRotate: 0,
          flipH: false,
          flipV: false,
          bitmapFilter: 'none',
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const addTextLayer = (preset: string, textOverride?: string) => {
    let layerData: any = {
      type: 'text',
      x: 100,
      y: Math.round(doc.height / 2) - 40,
      width: doc.width - 200,
      height: 80,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      text: textOverride || 'Your Text Here',
      fontFamily: 'Inter',
      fontSize: 48,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textAlign: 'center',
      fillColor: '#000000',
      fillType: 'solid',
      strokeColor: 'transparent',
      strokeWidth: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    };

    switch (preset) {
      case 'title':
        layerData = { ...layerData, name: 'Title Text', text: textOverride || 'Heading Text', fontSize: 64, fontFamily: 'Inter', fontWeight: '800', color: '#1e293b' };
        break;
      case 'subtitle':
        layerData = { ...layerData, name: 'Subtitle Text', text: textOverride || 'Beautiful Subheading Details', fontSize: 32, fontFamily: 'Inter', fontWeight: '600', color: '#64748b', height: 50 };
        break;
      case 'body':
        layerData = { ...layerData, name: 'Body Text', text: textOverride || 'This is a description paragraph that you can customize freely.', fontSize: 18, fontFamily: 'Inter', fontWeight: 'normal', color: '#475569', height: 60 };
        break;
    }
    
    if (textOverride) {
      // Emojis are huge, scale them appropriately
      layerData.fontSize = 120;
      layerData.width = 150;
      layerData.height = 150;
      layerData.x = Math.round(doc.width / 2) - 75;
      layerData.y = Math.round(doc.height / 2) - 75;
      layerData.name = 'Sticker';
    }

    onAddLayer(layerData);
  };

  const addShapeLayer = (shapeType: ShapeType) => {
    const size = 160;
    onAddLayer({
      type: 'shape',
      name: shapeType.charAt(0).toUpperCase() + shapeType.slice(1),
      x: Math.round((doc.width - size) / 2),
      y: Math.round((doc.height - size) / 2),
      width: size,
      height: shapeType === 'line' || shapeType === 'arrow' ? 24 : size,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      shapeType,
      fill: shapeType === 'line' || shapeType === 'arrow' ? 'transparent' : '#8b5cf6',
      stroke: shapeType === 'line' || shapeType === 'arrow' ? '#8b5cf6' : 'transparent',
      strokeWidth: shapeType === 'line' || shapeType === 'arrow' ? 4 : 0,
      cornerRadius: shapeType === 'rectangle' ? 12 : undefined,
      fillType: 'color',
    });
  };

  const addIconLayer = (iconName: string) => {
    const size = 100;
    onAddLayer({
      type: 'icon',
      name: `${iconName} Icon`,
      x: Math.round((doc.width - size) / 2),
      y: Math.round((doc.height - size) / 2),
      width: size,
      height: size,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      iconName,
      color: '#ec4899',
      strokeWidth: 2,
    });
  };

  const moveLayer = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index + 1 : index - 1;
    if (targetIndex < 0 || targetIndex >= doc.layers.length) return;
    const reordered = [...doc.layers];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    onReorderLayers(reordered);
  };

  const renderIconPreview = (name: string, size = 20) => {
    const IconComponent = (Icons as any)[name];
    if (!IconComponent) return null;
    return <IconComponent size={size} />;
  };

  const filteredTemplates = TEMPLATES.filter((tmpl) => {
    if (activeCategory !== 'All' && tmpl.category !== activeCategory) return false;
    if (showFreeOnly && tmpl.isPremium) return false;
    if (showPremiumOnly && !tmpl.isPremium) return false;
    if (templateSearchQuery && !tmpl.name.toLowerCase().includes(templateSearchQuery.toLowerCase()) && !tmpl.category.toLowerCase().includes(templateSearchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* Leftmost slim menu strip */}
      <div className="left-menu-bar">
        {/* -- TOOLBOX ITEMS -- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px', alignItems: 'center' }}>
          <button className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`} onClick={() => setActiveTool('select')} title="Move Tool (V)"><Icons.MousePointer2 size={18} /></button>
          <button className={`tool-btn ${activeTool === 'lasso' ? 'active' : ''}`} onClick={() => setActiveTool('lasso')} title="Lasso Tool (L)"><Icons.Lasso size={18} /></button>
          <button className={`tool-btn ${activeTool === 'magic-wand' ? 'active' : ''}`} onClick={() => setActiveTool('magic-wand')} title="Magic Wand Tool (W)"><Icons.Wand2 size={18} /></button>
          <button className={`tool-btn ${activeTool === 'crop' ? 'active' : ''}`} onClick={() => setActiveTool('crop')} title="Crop Tool (C)"><Icons.Crop size={18} /></button>
          <button className={`tool-btn ${activeTool === 'slice' ? 'active' : ''}`} onClick={() => setActiveTool('slice')} title="Slice Tool (S)"><Icons.Scissors size={18} /></button>
          <button className={`tool-btn ${activeTool === 'draw' ? 'active' : ''}`} onClick={() => setActiveTool('draw')} title="Brush Tool (B)"><Icons.Brush size={18} /></button>
          
          <div className="color-picker-container" style={{ marginTop: '4px' }}>
            <input type="color" value={brushColor} onChange={(e) => setBrushColor(e.target.value)} className="toolbar-color-picker" title="Foreground Color" />
            <div className="toolbar-color-picker-bg" title="Background Color"></div>
          </div>
        </div>

        <div style={{ width: '40px', height: '1px', backgroundColor: 'var(--border-color)', margin: '0 0 10px 0' }} />

        {/* -- SIDEBAR PANELS -- */}
        <button className={`menu-tab-btn ${activeTab === 'templates' ? 'active' : ''}`} onClick={() => handleTabClick('templates')}><Icons.LayoutTemplate size={20} /><span>Templates</span></button>
        <button className={`menu-tab-btn ${activeTab === 'media' ? 'active' : ''}`} onClick={() => handleTabClick('media')}><Icons.Image size={20} /><span>Media</span></button>
        <button className={`menu-tab-btn ${activeTab === 'text' ? 'active' : ''}`} onClick={() => handleTabClick('text')}><Icons.Type size={20} /><span>Text</span></button>
        <button className={`menu-tab-btn ${activeTab === 'elements' ? 'active' : ''}`} onClick={() => handleTabClick('elements')}><Icons.Shapes size={20} /><span>Elements</span></button>
        <button className={`menu-tab-btn ${activeTab === 'draw' ? 'active' : ''}`} onClick={() => handleTabClick('draw')}><Icons.PenTool size={20} /><span>Draw</span></button>
        <button className={`menu-tab-btn ${activeTab === 'projects' ? 'active' : ''}`} onClick={() => handleTabClick('projects')}><Icons.FolderOpen size={20} /><span>Projects</span></button>
        <button className={`menu-tab-btn ${activeTab === 'layers' ? 'active' : ''}`} onClick={() => handleTabClick('layers')}><Icons.Layers size={20} /><span>Layers ({doc.layers.length})</span></button>
        <button className={`menu-tab-btn ${activeTab === 'datamerge' ? 'active' : ''}`} onClick={() => handleTabClick('datamerge')}><Icons.Database size={20} /><span>Data Merge</span></button>
      </div>

      {/* Main Collapsible Action Panel */}
      <div className="sidebar-panel">
        <div className="panel-header">
          <span>
            {activeTab === 'templates' && 'Explore Templates'}
            {activeTab === 'media' && 'Media & Uploads'}
            {activeTab === 'text' && 'Typography Presets'}
            {activeTab === 'elements' && 'Shapes & Icons'}
            {activeTab === 'draw' && 'Drawing Board'}
            {activeTab === 'separation' && 'Color Separations'}
            {activeTab === 'projects' && 'Saved Projects'}
            {activeTab === 'layers' && 'Layer Stack'}
            {activeTab === 'datamerge' && 'Bulk Export Badges'}
          </span>
        </div>

        <div className="panel-content">
          {/* DYNAMIC TOOL SETTINGS (ALWAYS ON TOP) */}
          {activeTool === 'lasso' && (
            <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '14px', marginBottom: '12px', fontWeight: 600 }}>Lasso Settings</h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button 
                  onClick={() => setLassoMode?.('select')} 
                  style={{ flex: 1, padding: '8px', background: lassoMode === 'select' ? 'var(--primary-color)' : 'var(--bg-color)', color: lassoMode === 'select' ? 'white' : 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                >Select</button>
                <button 
                  onClick={() => setLassoMode?.('cut')} 
                  style={{ flex: 1, padding: '8px', background: lassoMode === 'cut' ? 'var(--primary-color)' : 'var(--bg-color)', color: lassoMode === 'cut' ? 'white' : 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                >Cut Image</button>
                <button 
                  onClick={() => setLassoMode?.('erase')} 
                  style={{ flex: 1, padding: '8px', background: lassoMode === 'erase' ? 'var(--primary-color)' : 'var(--bg-color)', color: lassoMode === 'erase' ? 'white' : 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                >Magic Erase</button>
              </div>
              
              {(lassoMode === 'cut' || lassoMode === 'erase') && (
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    <span>{lassoMode === 'erase' ? 'Blend Strength' : 'Smooth Cut (Feather)'}</span>
                    <span>{lassoFeather}px</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" max="20" step="1" 
                    value={lassoFeather} 
                    onChange={(e) => setLassoFeather?.(parseInt(e.target.value))}
                    style={{ width: '100%', accentColor: 'var(--primary-color)' }}
                  />
                </div>
              )}
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {lassoMode === 'select' && 'Draw a freehand loop around layers to select them.'}
                {lassoMode === 'cut' && 'Draw a loop over an image to cleanly cut that piece out.'}
                {lassoMode === 'erase' && 'Draw a loop over an unwanted object to seamlessly erase it using surrounding pixels.'}
              </p>
            </div>
          )}

          {/* TAB: DATA MERGE */}
          {activeTab === 'datamerge' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="property-group" style={{ padding: '16px', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 600 }}>1. Upload Data</h3>
                <p style={{fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px'}}>Upload a CSV file. Use headers like <strong>name, role, company</strong> to match <strong>{'{'}{'{'}name{'}'}{'}'}</strong> templates on the canvas.</p>
                <input type="file" accept=".csv" id="csv-upload" style={{display: 'none'}} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    (window as any).__csvFile = file;
                    document.getElementById('csv-file-name')!.innerText = 'Loaded: ' + file.name;
                    document.getElementById('csv-file-name')!.style.color = '#10b981';
                  }
                }} />
                <button className="secondary-btn" onClick={() => document.getElementById('csv-upload')?.click()} style={{width: '100%', padding: '10px', display: 'flex', justifyContent: 'center', gap: '8px'}}>
                  <Icons.Upload size={16} /> Upload CSV File
                </button>
                <div id="csv-file-name" style={{fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center'}}>No file selected</div>
              </div>
              
              <div className="property-group" style={{ padding: '16px', background: 'var(--bg-color)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 600 }}>2. Layout Options</h3>
                <select id="csv-layout" className="studio-input" style={{width: '100%', padding: '10px', marginBottom: '16px'}}>
                  <option value="1x1">1 Badge per Page (Single)</option>
                  <option value="2x1">2 Badges per Page (Side-by-side)</option>
                  <option value="2x2">4 Badges per Page (Grid)</option>
                </select>

                <h3 style={{ fontSize: '14px', marginBottom: '8px', fontWeight: 600 }}>3. Page Margins (mm)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div><label style={{fontSize: '11px', color: 'var(--text-muted)'}}>Top</label><input type="number" id="csv-margin-top" defaultValue="10" className="studio-input" style={{width: '100%', padding: '6px'}}/></div>
                  <div><label style={{fontSize: '11px', color: 'var(--text-muted)'}}>Bottom</label><input type="number" id="csv-margin-bottom" defaultValue="10" className="studio-input" style={{width: '100%', padding: '6px'}}/></div>
                  <div><label style={{fontSize: '11px', color: 'var(--text-muted)'}}>Left</label><input type="number" id="csv-margin-left" defaultValue="10" className="studio-input" style={{width: '100%', padding: '6px'}}/></div>
                  <div><label style={{fontSize: '11px', color: 'var(--text-muted)'}}>Right</label><input type="number" id="csv-margin-right" defaultValue="10" className="studio-input" style={{width: '100%', padding: '6px'}}/></div>
                </div>
                <div style={{ marginTop: '8px' }}>
                  <label style={{fontSize: '11px', color: 'var(--text-muted)'}}>Gap Between Badges (mm)</label>
                  <input type="number" id="csv-margin-gap" defaultValue="5" className="studio-input" style={{width: '100%', padding: '6px'}}/>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                <button className="secondary-btn" onClick={() => {
                  const file = (window as any).__csvFile;
                  if (!file) {
                    alert('Please upload a CSV file first.');
                    return;
                  }
                  const layout = (document.getElementById('csv-layout') as HTMLSelectElement).value as any;
                  const margins = {
                    top: Number((document.getElementById('csv-margin-top') as HTMLInputElement).value),
                    bottom: Number((document.getElementById('csv-margin-bottom') as HTMLInputElement).value),
                    left: Number((document.getElementById('csv-margin-left') as HTMLInputElement).value),
                    right: Number((document.getElementById('csv-margin-right') as HTMLInputElement).value),
                    gap: Number((document.getElementById('csv-margin-gap') as HTMLInputElement).value)
                  };
                  if (props.onBulkExportPreview) props.onBulkExportPreview(file, layout, margins);
                }} style={{flex: 1, padding: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px'}}>
                  <Icons.Eye size={16} /> Preview Page
                </button>

                <button className="primary-action-btn" onClick={() => {
                  const file = (window as any).__csvFile;
                  if (!file) {
                    alert('Please upload a CSV file first.');
                    return;
                  }
                  const layout = (document.getElementById('csv-layout') as HTMLSelectElement).value as any;
                  const margins = {
                    top: Number((document.getElementById('csv-margin-top') as HTMLInputElement).value),
                    bottom: Number((document.getElementById('csv-margin-bottom') as HTMLInputElement).value),
                    left: Number((document.getElementById('csv-margin-left') as HTMLInputElement).value),
                    right: Number((document.getElementById('csv-margin-right') as HTMLInputElement).value),
                    gap: Number((document.getElementById('csv-margin-gap') as HTMLInputElement).value)
                  };
                  if (props.onBulkExport) props.onBulkExport(file, layout, margins);
                }} style={{flex: 1.5, padding: '10px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', cursor: 'pointer'}}>
                  <Icons.FileOutput size={16} /> Generate PDF
                </button>
              </div>
            </div>
          )}

          {/* TAB: TEMPLATES - ADOBE EXPRESS STYLE */}
          {activeTab === 'templates' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button className="primary-action-btn" style={{ background: '#4f46e5', color: 'white', padding: '12px', borderRadius: '24px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none', cursor: 'pointer' }}>
                <Icons.Sparkles size={18} />
                Generate template
              </button>

              <div style={{ position: 'relative' }}>
                <Icons.Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Search Templates"
                  value={templateSearchQuery}
                  onChange={(e) => setTemplateSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '24px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    style={{
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: '500',
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      backgroundColor: activeCategory === cat ? '#4f46e5' : '#e2e8f0',
                      color: activeCategory === cat ? '#ffffff' : '#334155',
                      transition: 'all 0.2s'
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '14px', color: '#334155' }}>
                <span style={{ fontWeight: '500' }}>Show only:</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showFreeOnly} onChange={(e) => { setShowFreeOnly(e.target.checked); setShowPremiumOnly(false); }} style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }} />
                  Free
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showPremiumOnly} onChange={(e) => { setShowPremiumOnly(e.target.checked); setShowFreeOnly(false); }} style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }} />
                  Premium <Icons.Crown size={14} color="#db2777" />
                </label>
              </div>

              <div className="template-masonry-grid" style={{ columnCount: 2, columnGap: '12px', paddingRight: '4px', overflowY: 'auto' }}>
                {filteredTemplates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="template-card-visual"
                    onClick={() => onLoadTemplate(tmpl)}
                    style={{
                      marginBottom: '12px',
                      breakInside: 'avoid',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                      border: '1px solid #e2e8f0',
                      background: '#f8fafc',
                    }}
                  >
                    <img 
                      src={tmpl.thumbnail} 
                      alt={tmpl.name} 
                      style={{ width: '100%', display: 'block', aspectRatio: tmpl.width / tmpl.height }} 
                      loading="lazy"
                    />
                    
                    <div className="template-card-overlay" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'flex-end', padding: '8px', color: 'white' }}>
                      <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{tmpl.name}</span>
                    </div>

                    {tmpl.isPremium && (
                      <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'white', borderRadius: '50%', padding: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                        <Icons.Crown size={12} color="#db2777" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: LAYERS STACK */}
          {activeTab === 'layers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span className="input-label">Layer Order (Top to Bottom):</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                {doc.layers.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '40px 0' }}>
                    No layers created. Add elements to get started!
                  </div>
                ) : (
                  [...doc.layers].reverse().map((layer, reverseIndex) => {
                    const originalIndex = doc.layers.length - 1 - reverseIndex;
                    const isSelected = selectedLayerIds.includes(layer.id);
                    return (
                      <div
                        key={layer.id}
                        className={`layer-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedLayerIds([layer.id])}
                      >
                        <div className="layer-item-main">
                          <div className="layer-icon">
                            {layer.type === 'image' && <Icons.Image size={14} />}
                            {layer.type === 'text' && <Icons.Type size={14} />}
                            {layer.type === 'shape' && <Icons.Square size={14} />}
                            {layer.type === 'icon' && <Icons.Star size={14} />}
                          </div>
                          <div className="layer-name">{layer.name}</div>
                        </div>
                        
                        <div className="layer-actions">
                          <button className="layer-action-btn" disabled={originalIndex === doc.layers.length - 1} onClick={(e) => { e.stopPropagation(); moveLayer(originalIndex, 'up'); }}><Icons.ChevronUp size={12} /></button>
                          <button className="layer-action-btn" disabled={originalIndex === 0} onClick={(e) => { e.stopPropagation(); moveLayer(originalIndex, 'down'); }}><Icons.ChevronDown size={12} /></button>
                          <button className={`layer-action-btn ${!layer.visible ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); onCommitLayer(layer.id, { visible: !layer.visible }); }}><Icons.Eye size={12} /></button>
                          <button className="layer-action-btn" onClick={(e) => { e.stopPropagation(); onDuplicateLayer(layer.id); }}><Icons.Copy size={12} /></button>
                          <button className="layer-action-btn" style={{ color: '#ef4444' }} onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}><Icons.Trash2 size={12} /></button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB: DRAWING BOARD */}
          {activeTab === 'draw' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="property-group-row">
                <span className="input-label">Brush Width: {brushWidth}px</span>
                <input type="range" min="1" max="100" value={brushWidth} onChange={(e) => setBrushWidth(Number(e.target.value))} />
              </div>
              <div style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto', paddingRight: '5px' }}>
                {BRUSH_CATEGORIES.map(category => (
                  <div key={category.name} style={{ marginBottom: '15px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {category.name}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                      {category.brushes.map(b => (
                        <button 
                          key={b.id}
                          title={b.label}
                          className={`studio-btn ${brushStyle === b.id ? 'active' : ''}`} 
                          onClick={() => setBrushStyle(b.id)}
                          style={{ 
                            padding: '8px 4px', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            gap: '4px',
                            height: '55px',
                            background: brushStyle === b.id ? 'rgba(79, 70, 229, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                            border: brushStyle === b.id ? '1px solid rgba(79, 70, 229, 0.5)' : '1px solid transparent',
                            borderRadius: '8px'
                          }}
                        >
                          <BrushPreview brushId={b.id} isActive={brushStyle === b.id} />
                          <span style={{ fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', textAlign: 'center', opacity: 0.8 }}>
                            {b.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: MEDIA */}
          {activeTab === 'media' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <label className="upload-btn">
                <Icons.Upload size={20} />
                <span>Upload Image</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>
            </div>
          )}

          {/* TAB: TEXT */}
          {activeTab === 'text' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button className="preset-card" onClick={() => addTextLayer('title')}><h3>Add a heading</h3></button>
              <button className="preset-card" onClick={() => addTextLayer('subtitle')}><h4>Add a subheading</h4></button>
              <button className="preset-card" onClick={() => addTextLayer('body')}><p>Add body text</p></button>
            </div>
          )}

          {/* TAB: ELEMENTS */}
          {activeTab === 'elements' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <span className="input-label">Basic Shapes</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <button className="shape-btn" onClick={() => addShapeLayer('rectangle')}><Icons.Square size={24} /></button>
                <button className="shape-btn" onClick={() => addShapeLayer('circle')}><Icons.Circle size={24} /></button>
                <button className="shape-btn" onClick={() => addShapeLayer('triangle')}><Icons.Triangle size={24} /></button>
              </div>
              
              <span className="input-label" style={{ marginTop: '10px' }}>Objects & Stickers</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {['🔥', '✨', '💖', '🎉', '🌟', '🚀', '🐶', '🍕'].map(emoji => (
                  <button key={emoji} className="icon-grid-btn" onClick={() => addTextLayer('title', emoji)} style={{ fontSize: '24px', border: 'none', background: 'transparent', cursor: 'pointer' }} title={emoji}>
                    {emoji}
                  </button>
                ))}
              </div>
              <label className="secondary-action-btn" style={{ textAlign: 'center', cursor: 'pointer', padding: '8px', borderRadius: '4px', border: '1px dashed var(--border-color)', fontSize: '12px' }}>
                <Icons.Upload size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} /> Upload Custom PNG
                <input type="file" accept="image/png" onChange={handleImageUpload} style={{ display: 'none' }} />
              </label>

              <span className="input-label" style={{ marginTop: '10px' }}>Popular Icons</span>
              <div style={{ position: 'relative' }}>
                <Icons.Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input type="text" placeholder="Search icons..." value={iconQuery} onChange={(e) => setIconQuery(e.target.value)} className="studio-input" style={{ paddingLeft: '30px' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                {filteredIcons.map(name => (
                  <button key={name} className="icon-grid-btn" onClick={() => addIconLayer(name)} title={name}>
                    {renderIconPreview(name)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB: PROJECTS */}
          {activeTab === 'projects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <button className="primary-action-btn" onClick={() => onSaveProject()} style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'center' }}>
                <Icons.Save size={16} /> Save Current Project
              </button>
              <span className="input-label">Saved Projects</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {localProjects.map(proj => (
                  <div key={proj.id} className="project-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px' }}>
                    <div onClick={() => onLoadProject(proj.id)} style={{ cursor: 'pointer', flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '13px' }}>{proj.name}</h4>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(proj.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <button className="icon-btn-danger" onClick={() => onDeleteProject(proj.id)}><Icons.Trash2 size={14} /></button>
                  </div>
                ))}
                {localProjects.length === 0 && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No saved projects yet.</p>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
