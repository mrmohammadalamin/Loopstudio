import React from 'react';
import * as Icons from 'lucide-react';
import type { GraphicDocument, Layer, ShapeLayer, TextLayer, ImageLayer, IconLayer, DrawingLayer } from '../types';
import { CANVAS_PRESETS } from '../data/templates';
import { AdvancedColorPicker } from './AdvancedColorPicker';

interface PropertyPanelProps {
  document: GraphicDocument;
  selectedLayerIds: string[];
  onUpdateLayer: (id: string, updated: Partial<Layer>) => void;
  onCommitLayer: (id: string, updated: Partial<Layer>) => void;
  onUpdateDocument: (updated: Partial<GraphicDocument>) => void;
  onCommitDocument: (updated: Partial<GraphicDocument>) => void;
  
  // Advanced tool handles
  activeTool: 'select' | 'draw' | 'crop' | 'slice' | 'magic-wand' | 'lasso';
  setActiveTool: (tool: 'select' | 'draw' | 'crop' | 'slice' | 'magic-wand' | 'lasso') => void;

  // Layer ordering
  onBringToFront?: (id: string) => void;
  onSendToBack?: (id: string) => void;
  onBringForward?: (id: string) => void;
  onSendBackward?: (id: string) => void;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  document: doc,
  selectedLayerIds,
  onUpdateLayer,
  onCommitLayer,
  onUpdateDocument,
  onCommitDocument,
  activeTool,
  setActiveTool,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
}) => {
  const selectedLayer = doc.layers.find((l) => l.id === selectedLayerIds[0]);

  const currentUnit = doc.unit || 'px';
  const currentDpi = doc.dpi || 72;

  // Convert pixels to current unit
  const pxToUnit = (pixels: number): number => {
    if (currentUnit === 'in') return parseFloat((pixels / currentDpi).toFixed(3));
    if (currentUnit === 'mm') return parseFloat(((pixels / currentDpi) * 25.4).toFixed(1));
    if (currentUnit === 'cm') return parseFloat(((pixels / currentDpi) * 2.54).toFixed(2));
    return pixels;
  };

  // Convert current unit value back to pixels
  const unitToPx = (val: number): number => {
    if (currentUnit === 'in') return Math.round(val * currentDpi);
    if (currentUnit === 'mm') return Math.round((val / 25.4) * currentDpi);
    if (currentUnit === 'cm') return Math.round((val / 2.54) * currentDpi);
    return Math.round(val);
  };

  // Quick alignment relative to canvas boundaries
  const alignLayer = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (!selectedLayer) return;

    let updatedFields: Partial<Layer> = {};
    switch (alignment) {
      case 'left':
        updatedFields = { x: 0 };
        break;
      case 'center':
        updatedFields = { x: Math.round((doc.width - selectedLayer.width) / 2) };
        break;
      case 'right':
        updatedFields = { x: doc.width - selectedLayer.width };
        break;
      case 'top':
        updatedFields = { y: 0 };
        break;
      case 'middle':
        updatedFields = { y: Math.round((doc.height - selectedLayer.height) / 2) };
        break;
      case 'bottom':
        updatedFields = { y: doc.height - selectedLayer.height };
        break;
    }

    onCommitLayer(selectedLayer.id, updatedFields);
  };

  const handleLayerChange = (fields: Partial<Layer>) => {
    if (!selectedLayer) return;
    onUpdateLayer(selectedLayer.id, fields);
  };

  const handleLayerCommit = (fields: Partial<Layer>) => {
    if (!selectedLayer) return;
    onCommitLayer(selectedLayer.id, fields);
  };

  // 1. RENDER: DOCUMENT PROPS (No layer selected)
  if (!selectedLayer) {
    return (
      <div className="property-panel">
        <div className="property-group">
          <div className="property-group-title">Document Setup</div>
          
          <div className="input-row" style={{ marginBottom: '12px' }}>
            <div>
              <span className="input-label">Unit</span>
              <select
                className="studio-input"
                value={currentUnit}
                onChange={(e) => {
                  const newUnit = e.target.value as 'px' | 'in' | 'mm' | 'cm';
                  onCommitDocument({ unit: newUnit });
                }}
              >
                <option value="px">Pixels (px)</option>
                <option value="in">Inches (in)</option>
                <option value="mm">Millimeters (mm)</option>
                <option value="cm">Centimeters (cm)</option>
              </select>
            </div>
            <div>
              <span className="input-label">Resolution (DPI)</span>
              <select
                className="studio-input"
                value={currentDpi}
                onChange={(e) => {
                  const newDpi = parseInt(e.target.value) || 72;
                  onCommitDocument({ dpi: newDpi });
                }}
              >
                <option value="72">72 DPI (Web)</option>
                <option value="150">150 DPI (Poster)</option>
                <option value="300">300 DPI (High-Res Print)</option>
              </select>
            </div>
          </div>

          <div className="input-row" style={{ marginBottom: '15px' }}>
            <div>
              <span className="input-label">Width ({currentUnit})</span>
              <input
                type="number"
                step={currentUnit === 'px' ? '1' : '0.01'}
                className="studio-input"
                value={pxToUnit(doc.width)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  onUpdateDocument({ width: Math.max(unitToPx(val), 10) });
                }}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  onCommitDocument({ width: Math.max(unitToPx(val), 10) });
                }}
              />
            </div>
            <div>
              <span className="input-label">Height ({currentUnit})</span>
              <input
                type="number"
                step={currentUnit === 'px' ? '1' : '0.01'}
                className="studio-input"
                value={pxToUnit(doc.height)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  onUpdateDocument({ height: Math.max(unitToPx(val), 10) });
                }}
                onBlur={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  onCommitDocument({ height: Math.max(unitToPx(val), 10) });
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <span className="input-label">Canvas Color</span>
            <div className="color-picker-row">
              <button
                className="color-swatch-btn"
                style={{ backgroundColor: doc.backgroundColor }}
              >
                <input
                  type="color"
                  className="color-swatch-input"
                  value={doc.backgroundColor.startsWith('#') && doc.backgroundColor.length === 7 ? doc.backgroundColor : '#ffffff'}
                  onChange={(e) => onUpdateDocument({ backgroundColor: e.target.value })}
                  onBlur={(e) => onCommitDocument({ backgroundColor: e.target.value })}
                />
              </button>
              <input
                type="text"
                className="studio-input"
                value={doc.backgroundColor}
                onChange={(e) => onUpdateDocument({ backgroundColor: e.target.value })}
                onBlur={(e) => onCommitDocument({ backgroundColor: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Quick Sizes */}
        <div className="property-group">
          <div className="property-group-title">Resize Canvas Presets</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
            {CANVAS_PRESETS.map((preset) => (
              <div
                key={preset.name}
                className="layer-item"
                style={{ cursor: 'pointer', padding: '8px 12px' }}
                onClick={() => {
                  onCommitDocument({
                    width: preset.width,
                    height: preset.height,
                  });
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 600 }}>{preset.name}</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                    {preset.category || 'Preset'} • {preset.description}
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {preset.width} × {preset.height} px
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2. RENDER: SELECTED LAYER DETAILS
  return (
    <div className="property-panel">
      {/* Layer Meta: Title, Position, Lock */}
      <div className="property-group">
        <div className="property-group-title">Element Settings</div>
        
        <div style={{ marginBottom: '12px' }}>
          <span className="input-label">Element Name</span>
          <input
            type="text"
            className="studio-input"
            value={selectedLayer.name}
            onChange={(e) => handleLayerChange({ name: e.target.value })}
            onBlur={(e) => handleLayerCommit({ name: e.target.value })}
          />
        </div>

        <div className="input-row" style={{ marginBottom: '12px' }}>
          <div>
            <span className="input-label">X Position</span>
            <input
              type="number"
              className="studio-input"
              value={selectedLayer.x}
              onChange={(e) => handleLayerChange({ x: parseInt(e.target.value) || 0 })}
              onBlur={(e) => handleLayerCommit({ x: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <span className="input-label">Y Position</span>
            <input
              type="number"
              className="studio-input"
              value={selectedLayer.y}
              onChange={(e) => handleLayerChange({ y: parseInt(e.target.value) || 0 })}
              onBlur={(e) => handleLayerCommit({ y: parseInt(e.target.value) || 0 })}
            />
          </div>
        </div>

        <div className="input-row" style={{ marginBottom: '12px' }}>
          <div>
            <span className="input-label">Width</span>
            <input
              type="number"
              className="studio-input"
              value={selectedLayer.width}
              onChange={(e) => handleLayerChange({ width: Math.max(10, parseInt(e.target.value) || 10) })}
              onBlur={(e) => handleLayerCommit({ width: Math.max(10, parseInt(e.target.value) || 10) })}
            />
          </div>
          <div>
            <span className="input-label">Height</span>
            <input
              type="number"
              className="studio-input"
              value={selectedLayer.height}
              onChange={(e) => handleLayerChange({ height: Math.max(10, parseInt(e.target.value) || 10) })}
              onBlur={(e) => handleLayerCommit({ height: Math.max(10, parseInt(e.target.value) || 10) })}
            />
          </div>
        </div>

        <div className="input-row" style={{ marginBottom: '15px' }}>
          <div>
            <span className="input-label">Rotation (°)</span>
            <input
              type="number"
              className="studio-input"
              value={selectedLayer.rotation}
              onChange={(e) => handleLayerChange({ rotation: parseInt(e.target.value) || 0 })}
              onBlur={(e) => handleLayerCommit({ rotation: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div>
            <span className="input-label">Opacity (%)</span>
            <input
              type="number"
              className="studio-input"
              value={Math.round(selectedLayer.opacity * 100)}
              onChange={(e) => handleLayerChange({ opacity: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100 })}
              onBlur={(e) => handleLayerCommit({ opacity: Math.max(0, Math.min(100, parseInt(e.target.value) || 0)) / 100 })}
            />
          </div>
        </div>

        {/* Lock and Visibility */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <button
            className={`btn-secondary ${selectedLayer.locked ? 'active' : ''}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => handleLayerCommit({ locked: !selectedLayer.locked })}
          >
            {selectedLayer.locked ? <Icons.Lock size={14} /> : <Icons.Unlock size={14} />}
            <span>{selectedLayer.locked ? 'Unlock' : 'Lock'}</span>
          </button>
          <button
            className={`btn-secondary ${!selectedLayer.visible ? 'active' : ''}`}
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => handleLayerCommit({ visible: !selectedLayer.visible })}
          >
            {selectedLayer.visible ? <Icons.Eye size={14} /> : <Icons.EyeOff size={14} />}
            <span>{selectedLayer.visible ? 'Hide' : 'Show'}</span>
          </button>
        </div>

        {/* Layer Z-Order / Arrange */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span className="input-label">Arrange Layer Order</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              className="btn-secondary"
              style={{ justifyContent: 'center', fontSize: '11px', padding: '7px' }}
              title="Bring to Front"
              onClick={() => onBringToFront?.(selectedLayer.id)}
            >
              <Icons.ChevronsUp size={13} />
              <span>Bring to Front</span>
            </button>
            <button
              className="btn-secondary"
              style={{ justifyContent: 'center', fontSize: '11px', padding: '7px' }}
              title="Send to Back"
              onClick={() => onSendToBack?.(selectedLayer.id)}
            >
              <Icons.ChevronsDown size={13} />
              <span>Send to Back</span>
            </button>
            <button
              className="btn-secondary"
              style={{ justifyContent: 'center', fontSize: '11px', padding: '7px' }}
              title="Bring Forward"
              onClick={() => onBringForward?.(selectedLayer.id)}
            >
              <Icons.ChevronUp size={13} />
              <span>Bring Forward</span>
            </button>
            <button
              className="btn-secondary"
              style={{ justifyContent: 'center', fontSize: '11px', padding: '7px' }}
              title="Send Backward"
              onClick={() => onSendBackward?.(selectedLayer.id)}
            >
              <Icons.ChevronDown size={13} />
              <span>Send Backward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Layer Alignment Toolbar */}
      <div className="property-group">
        <div className="property-group-title">Alignment Controls</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
          <button className="btn-secondary" style={{ padding: '8px', justifyContent: 'center' }} title="Align Left" onClick={() => alignLayer('left')}>
            <Icons.AlignLeft size={16} />
          </button>
          <button className="btn-secondary" style={{ padding: '8px', justifyContent: 'center' }} title="Align Horiz. Center" onClick={() => alignLayer('center')}>
            <Icons.AlignCenter size={16} />
          </button>
          <button className="btn-secondary" style={{ padding: '8px', justifyContent: 'center' }} title="Align Right" onClick={() => alignLayer('right')}>
            <Icons.AlignRight size={16} />
          </button>
          <button className="btn-secondary" style={{ padding: '8px', justifyContent: 'center' }} title="Align Top" onClick={() => alignLayer('top')}>
            <Icons.AlignStartVertical size={16} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <button className="btn-secondary" style={{ padding: '8px', justifyContent: 'center' }} title="Align Vert. Middle" onClick={() => alignLayer('middle')}>
            <Icons.AlignCenterVertical size={16} style={{ transform: 'rotate(90deg)' }} />
          </button>
          <button className="btn-secondary" style={{ padding: '8px', justifyContent: 'center' }} title="Align Bottom" onClick={() => alignLayer('bottom')}>
            <Icons.AlignEndVertical size={16} style={{ transform: 'rotate(90deg)' }} />
          </button>
        </div>
      </div>

      {/* 3. TYPE-SPECIFIC PROPERTIES */}
      
      {/* TYPE: TEXT PROPERTIES */}
      {selectedLayer.type === 'text' && (
        <div className="property-group">
          <div className="property-group-title">Text Styling</div>
          {(() => {
            const tl = selectedLayer as TextLayer;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Font Family */}
                <div>
                  <span className="input-label">Font Family</span>
                  <select
                    className="studio-input"
                    value={tl.fontFamily}
                    onChange={(e) => handleLayerCommit({ fontFamily: e.target.value })}
                  >
                    <option value="Inter">Inter (Clean Sans)</option>
                    <option value="Outfit">Outfit (Geometric)</option>
                    <option value="Montserrat">Montserrat (Heading)</option>
                    <option value="Playfair Display">Playfair Display (Elegant Serif)</option>
                    <option value="Orbitron">Orbitron (Sci-Fi Tech)</option>
                    <option value="Pacifico">Pacifico (Script)</option>
                    <option value="Caveat">Caveat (Handwritten)</option>
                  </select>
                </div>

                {/* Font Size */}
                <div className="slider-container">
                  <div className="slider-header">
                    <span>Font Size</span>
                    <span>{tl.fontSize} px</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="160"
                    className="studio-slider"
                    value={tl.fontSize}
                    onChange={(e) => handleLayerChange({ fontSize: parseInt(e.target.value) })}
                    onMouseUp={() => handleLayerCommit({ fontSize: tl.fontSize })}
                  />
                </div>

                {/* Formatting Row */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    className={`btn-secondary ${tl.fontWeight === 'bold' ? 'active' : ''}`}
                    style={{ flex: 1, padding: '8px', justifyContent: 'center' }}
                    onClick={() => handleLayerCommit({ fontWeight: tl.fontWeight === 'bold' ? 'normal' : 'bold' })}
                  >
                    <Icons.Bold size={15} />
                  </button>
                  <button
                    className={`btn-secondary ${tl.fontStyle === 'italic' ? 'active' : ''}`}
                    style={{ flex: 1, padding: '8px', justifyContent: 'center' }}
                    onClick={() => handleLayerCommit({ fontStyle: tl.fontStyle === 'italic' ? 'normal' : 'italic' })}
                  >
                    <Icons.Italic size={15} />
                  </button>
                  <button
                    className={`btn-secondary ${tl.textDecoration === 'underline' ? 'active' : ''}`}
                    style={{ flex: 1, padding: '8px', justifyContent: 'center' }}
                    onClick={() => handleLayerCommit({ textDecoration: tl.textDecoration === 'underline' ? 'none' : 'underline' })}
                  >
                    <Icons.Underline size={15} />
                  </button>
                </div>

                {/* Alignment */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  {(['left', 'center', 'right', 'justify'] as const).map((align) => (
                    <button
                      key={align}
                      className={`btn-secondary ${tl.textAlign === align ? 'active' : ''}`}
                      style={{ flex: 1, padding: '8px', justifyContent: 'center' }}
                      onClick={() => handleLayerCommit({ textAlign: align })}
                    >
                      {align === 'left' && <Icons.AlignLeft size={14} />}
                      {align === 'center' && <Icons.AlignCenter size={14} />}
                      {align === 'right' && <Icons.AlignRight size={14} />}
                      {align === 'justify' && <Icons.AlignJustify size={14} />}
                    </button>
                  ))}
                </div>

                {/* Text Fill (AdvancedColorPicker) */}
                <div>
                  <span className="input-label" style={{ marginBottom: '8px', display: 'block' }}>Fill Properties</span>
                  <AdvancedColorPicker
                    fillType={tl.fillType || 'color'}
                    solidColor={tl.fill || tl.color || '#ffffff'}
                    gradientStops={tl.gradientStops || [
                      { offset: 0, color: tl.gradientColors?.[0] || '#3b82f6' },
                      { offset: 100, color: tl.gradientColors?.[1] || '#ec4899' }
                    ]}
                    meshPoints={tl.meshPoints || []}
                    gradientAngle={tl.gradientAngle || 90}
                    patternUrl={tl.patternUrl}
                    patternScale={tl.patternScale}
                    onChange={(data) => {
                      const payload: Partial<TextLayer> = { fillType: data.fillType };
                      if (data.solidColor !== undefined) {
                        payload.fill = data.solidColor;
                        payload.color = data.solidColor; // Legacy compat
                      }
                      if (data.gradientStops !== undefined) payload.gradientStops = data.gradientStops;
                      if (data.meshPoints !== undefined) payload.meshPoints = data.meshPoints;
                      if (data.gradientAngle !== undefined) payload.gradientAngle = data.gradientAngle;
                      if (data.patternUrl !== undefined) payload.patternUrl = data.patternUrl;
                      if (data.patternScale !== undefined) payload.patternScale = data.patternScale;
                      handleLayerCommit(payload);
                    }}
                  />
                </div>

                {/* Line Height & Letter Spacing */}
                <div className="slider-container">
                  <div className="slider-header">
                    <span>Line Height</span>
                    <span>{tl.lineHeight}</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="2.5"
                    step="0.1"
                    className="studio-slider"
                    value={tl.lineHeight}
                    onChange={(e) => handleLayerChange({ lineHeight: parseFloat(e.target.value) })}
                    onMouseUp={() => handleLayerCommit({ lineHeight: tl.lineHeight })}
                  />
                </div>

                <div className="slider-container">
                  <div className="slider-header">
                    <span>Letter Spacing</span>
                    <span>{tl.letterSpacing} px</span>
                  </div>
                  <input
                    type="range"
                    min="-4"
                    max="20"
                    step="1"
                    className="studio-slider"
                    value={tl.letterSpacing}
                    onChange={(e) => handleLayerChange({ letterSpacing: parseInt(e.target.value) })}
                    onMouseUp={() => handleLayerCommit({ letterSpacing: tl.letterSpacing })}
                  />
                </div>

                {/* Stroke */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                  <span className="input-label">Text Stroke (Border)</span>
                  <div className="color-picker-row" style={{ marginBottom: '10px' }}>
                    <button className="color-swatch-btn" style={{ backgroundColor: tl.strokeColor === 'transparent' ? '#ffffff' : tl.strokeColor }}>
                      <input
                        type="color"
                        className="color-swatch-input"
                        value={tl.strokeColor.startsWith('#') && tl.strokeColor.length === 7 ? tl.strokeColor : '#000000'}
                        onChange={(e) => handleLayerChange({ strokeColor: e.target.value })}
                        onBlur={(e) => handleLayerCommit({ strokeColor: e.target.value })}
                      />
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '11px' }}
                      onClick={() => handleLayerCommit({ strokeColor: tl.strokeColor === 'transparent' ? '#000000' : 'transparent', strokeWidth: tl.strokeColor === 'transparent' ? 1.5 : 0 })}
                    >
                      {tl.strokeColor === 'transparent' ? 'Enable' : 'Disable'}
                    </button>
                  </div>
                  {tl.strokeColor !== 'transparent' && (
                    <div className="slider-container">
                      <div className="slider-header">
                        <span>Stroke Width</span>
                        <span>{tl.strokeWidth} px</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="8"
                        step="0.5"
                        className="studio-slider"
                        value={tl.strokeWidth}
                        onChange={(e) => handleLayerChange({ strokeWidth: parseFloat(e.target.value) })}
                        onMouseUp={() => handleLayerCommit({ strokeWidth: tl.strokeWidth })}
                      />
                    </div>
                  )}
                </div>

                {/* Shadow */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                  <div className="toggle-row">
                    <span className="input-label" style={{ margin: 0 }}>Glow & Shadow</span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={tl.shadowBlur > 0}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          handleLayerCommit({
                            shadowBlur: enabled ? 12 : 0,
                            shadowColor: enabled ? '#8b5cf6' : 'transparent',
                            shadowOffsetX: enabled ? 2 : 0,
                            shadowOffsetY: enabled ? 2 : 0,
                          });
                        }}
                      />
                      <span className="switch-slider"></span>
                    </label>
                  </div>
                  {tl.shadowBlur > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                      <div className="color-picker-row">
                        <button className="color-swatch-btn" style={{ backgroundColor: tl.shadowColor }}>
                          <input
                            type="color"
                            className="color-swatch-input"
                            value={tl.shadowColor.startsWith('#') && tl.shadowColor.length === 7 ? tl.shadowColor : '#8b5cf6'}
                            onChange={(e) => handleLayerChange({ shadowColor: e.target.value })}
                            onBlur={(e) => handleLayerCommit({ shadowColor: e.target.value })}
                          />
                        </button>
                        <input
                          type="text"
                          className="studio-input"
                          value={tl.shadowColor}
                          onChange={(e) => handleLayerChange({ shadowColor: e.target.value })}
                          onBlur={(e) => handleLayerCommit({ shadowColor: e.target.value })}
                        />
                      </div>
                      <div className="slider-container">
                        <div className="slider-header">
                          <span>Blur Size</span>
                          <span>{tl.shadowBlur} px</span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="40"
                          className="studio-slider"
                          value={tl.shadowBlur}
                          onChange={(e) => handleLayerChange({ shadowBlur: parseInt(e.target.value) })}
                          onMouseUp={() => handleLayerCommit({ shadowBlur: tl.shadowBlur })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TYPE: SHAPE PROPERTIES */}
      {selectedLayer.type === 'shape' && (
        <div className="property-group">
          <div className="property-group-title">Shape Fill & Outline</div>
          {(() => {
            const sl = selectedLayer as ShapeLayer;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Advanced Color Picker */}
                {sl.shapeType !== 'line' && sl.shapeType !== 'arrow' && (
                  <div>
                    <span className="input-label" style={{ marginBottom: '8px', display: 'block' }}>Fill Properties</span>
                    <AdvancedColorPicker
                      fillType={sl.fillType || 'color'}
                      solidColor={sl.fill || '#3b82f6'}
                      gradientStops={sl.gradientStops || [
                        { offset: 0, color: sl.gradientColors?.[0] || '#3b82f6' },
                        { offset: 100, color: sl.gradientColors?.[1] || '#ec4899' }
                      ]}
                      meshPoints={sl.meshPoints || []}
                      gradientAngle={sl.gradientAngle || 90}
                      patternUrl={sl.patternUrl}
                      patternScale={sl.patternScale}
                      onChange={(data) => {
                        const payload: Partial<ShapeLayer> = { fillType: data.fillType };
                        if (data.solidColor !== undefined) payload.fill = data.solidColor;
                        if (data.gradientStops !== undefined) payload.gradientStops = data.gradientStops;
                        if (data.meshPoints !== undefined) payload.meshPoints = data.meshPoints;
                        if (data.gradientAngle !== undefined) payload.gradientAngle = data.gradientAngle;
                        if (data.patternUrl !== undefined) payload.patternUrl = data.patternUrl;
                        if (data.patternScale !== undefined) payload.patternScale = data.patternScale;
                        handleLayerCommit(payload);
                      }}
                    />
                  </div>
                )}

                {/* Stroke Color */}
                <div>
                  <span className="input-label">Border / Stroke Color</span>
                  <div className="color-picker-row">
                    <button className="color-swatch-btn" style={{ backgroundColor: sl.stroke === 'transparent' ? '#ffffff' : sl.stroke }}>
                      <input
                        type="color"
                        className="color-swatch-input"
                        value={sl.stroke.startsWith('#') && sl.stroke.length === 7 ? sl.stroke : '#ffffff'}
                        disabled={sl.stroke === 'transparent'}
                        onChange={(e) => handleLayerChange({ stroke: e.target.value })}
                        onBlur={(e) => handleLayerCommit({ stroke: e.target.value })}
                      />
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '11px' }}
                      onClick={() => handleLayerCommit({ stroke: sl.stroke === 'transparent' ? '#ffffff' : 'transparent', strokeWidth: sl.stroke === 'transparent' ? 2 : 0 })}
                    >
                      {sl.stroke === 'transparent' ? 'Color' : 'Transparent'}
                    </button>
                  </div>
                </div>

                {/* Stroke Width */}
                {sl.stroke !== 'transparent' && (
                  <div className="slider-container">
                    <div className="slider-header">
                      <span>Stroke Width</span>
                      <span>{sl.strokeWidth} px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="20"
                      className="studio-slider"
                      value={sl.strokeWidth}
                      onChange={(e) => handleLayerChange({ strokeWidth: parseInt(e.target.value) })}
                      onMouseUp={() => handleLayerCommit({ strokeWidth: sl.strokeWidth })}
                    />
                  </div>
                )}

                {/* Corner Radius (Only Rectangles) */}
                {sl.shapeType === 'rectangle' && (
                  <div className="slider-container">
                    <div className="slider-header">
                      <span>Corner Radius</span>
                      <span>{sl.cornerRadius ?? 0} px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      className="studio-slider"
                      value={sl.cornerRadius ?? 0}
                      onChange={(e) => handleLayerChange({ cornerRadius: parseInt(e.target.value) })}
                      onMouseUp={() => handleLayerCommit({ cornerRadius: sl.cornerRadius })}
                    />
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* TYPE: IMAGE PROPERTIES */}
      {selectedLayer.type === 'image' && (
        <div className="property-group">
          <div className="property-group-title">Bitmap Photo Processing</div>
          {(() => {
            const im = selectedLayer as ImageLayer;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Advanced Crop Controls */}
                <div>
                  <span className="input-label">Image Cropping & Cutting</span>
                  <button
                    className={`btn-secondary ${activeTool === 'crop' ? 'active' : ''}`}
                    style={{ width: '100%', justifyContent: 'center', gap: '8px' }}
                    onClick={() => setActiveTool(activeTool === 'crop' ? 'select' : 'crop')}
                  >
                    <Icons.Crop size={15} />
                    <span>{activeTool === 'crop' ? 'Cancel Crop Mode' : 'Enter Interactive Crop'}</span>
                  </button>
                  {activeTool === 'crop' && (
                    <p style={{ fontSize: '10px', color: 'var(--accent-purple)', marginTop: '6px', lineHeight: '1.3' }}>
                      Drag the crop bounding box corners on the canvas to crop your photo. Click Crop button again when done.
                    </p>
                  )}
                  {im.crop && (
                    <button
                      className="btn-secondary"
                      style={{ width: '100%', justifyContent: 'center', marginTop: '6px', color: '#ef4444' }}
                      onClick={() => handleLayerCommit({ crop: undefined })}
                    >
                      <Icons.RefreshCw size={12} /> Reset Crop
                    </button>
                  )}
                </div>

                <div style={{ height: '1px', background: 'var(--border-color)' }} />

                {/* Chromakey / Background Removal */}
                <div>
                  <div className="toggle-row">
                    <span className="input-label" style={{ margin: 0 }}>Chroma Key Background Remover</span>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={im.bgRemoval?.enabled || false}
                        onChange={(e) => {
                          const enabled = e.target.checked;
                          handleLayerCommit({
                            bgRemoval: {
                              enabled,
                              targetColor: im.bgRemoval?.targetColor || '#ffffff',
                              tolerance: im.bgRemoval?.tolerance ?? 30,
                            }
                          });
                        }}
                      />
                      <span className="switch-slider"></span>
                    </label>
                  </div>
                  {(im.bgRemoval?.enabled) && (
                    <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
                      <div>
                        <span className="input-label">Key Color to Remove</span>
                        <div className="color-picker-row">
                          <button className="color-swatch-btn" style={{ backgroundColor: im.bgRemoval.targetColor }}>
                            <input
                              type="color"
                              className="color-swatch-input"
                              value={im.bgRemoval.targetColor}
                              onChange={(e) => {
                                handleLayerChange({
                                  bgRemoval: { ...im.bgRemoval!, targetColor: e.target.value }
                                });
                              }}
                              onBlur={(e) => {
                                handleLayerCommit({
                                  bgRemoval: { ...im.bgRemoval!, targetColor: e.target.value }
                                });
                              }}
                            />
                          </button>
                          <input
                            type="text"
                            className="studio-input"
                            value={im.bgRemoval.targetColor}
                            onChange={(e) => {
                              handleLayerChange({
                                bgRemoval: { ...im.bgRemoval!, targetColor: e.target.value }
                              });
                            }}
                            onBlur={(e) => {
                              handleLayerCommit({
                                bgRemoval: { ...im.bgRemoval!, targetColor: e.target.value }
                              });
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="slider-container">
                        <div className="slider-header">
                          <span>Chroma Tolerance</span>
                          <span>{im.bgRemoval.tolerance}</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="120"
                          className="studio-slider"
                          value={im.bgRemoval.tolerance}
                          onChange={(e) => {
                            handleLayerChange({
                              bgRemoval: { ...im.bgRemoval!, tolerance: parseInt(e.target.value) }
                            });
                          }}
                          onMouseUp={() => {
                            handleLayerCommit({
                              bgRemoval: { ...im.bgRemoval!, tolerance: im.bgRemoval!.tolerance }
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ height: '1px', background: 'var(--border-color)' }} />

                {/* Photoshop Artistic Filters */}
                <div>
                  <span className="input-label">Artistic & Stylize Filters</span>
                  <select
                    className="studio-input"
                    value={im.bitmapFilter || 'none'}
                    onChange={(e) => {
                      const filter = e.target.value as any;
                      handleLayerCommit({
                        bitmapFilter: filter,
                        duotoneColor1: filter === 'duotone' ? (im.duotoneColor1 || '#000000') : undefined,
                        duotoneColor2: filter === 'duotone' ? (im.duotoneColor2 || '#10b981') : undefined,
                      });
                    }}
                  >
                    <option value="none">Normal (No Filter)</option>
                    <option value="oil">Oil Painting Stylize</option>
                    <option value="sketch">Pencil Sketch / Edge Outline</option>
                    <option value="halftone">Newsprint Halftone Dots</option>
                    <option value="pixelate">Retro 8-Bit Pixelate</option>
                    <option value="invert">Invert Colors (Negative)</option>
                    <option value="duotone">Custom Duotone Overlay</option>
                  </select>

                  {im.bitmapFilter === 'duotone' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px' }}>
                      <div style={{ flex: 1 }}>
                        <span className="input-label" style={{ fontSize: '10px' }}>Dark Tone</span>
                        <input
                          type="color"
                          value={im.duotoneColor1 || '#000000'}
                          className="studio-color-picker"
                          style={{ width: '100%', height: '28px' }}
                          onChange={(e) => {
                            handleLayerChange({ duotoneColor1: e.target.value });
                          }}
                          onBlur={(e) => {
                            handleLayerCommit({ duotoneColor1: e.target.value });
                          }}
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <span className="input-label" style={{ fontSize: '10px' }}>Light Tone</span>
                        <input
                          type="color"
                          value={im.duotoneColor2 || '#10b981'}
                          className="studio-color-picker"
                          style={{ width: '100%', height: '28px' }}
                          onChange={(e) => {
                            handleLayerChange({ duotoneColor2: e.target.value });
                          }}
                          onBlur={(e) => {
                            handleLayerCommit({ duotoneColor2: e.target.value });
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ height: '1px', background: 'var(--border-color)' }} />

                {/* Flip Row */}
                <div>
                  <span className="input-label">Rotate & Flip</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      className={`btn-secondary ${im.flipH ? 'active' : ''}`}
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => handleLayerCommit({ flipH: !im.flipH })}
                    >
                      <Icons.FlipHorizontal size={14} />
                      <span>Flip Horiz.</span>
                    </button>
                    <button
                      className={`btn-secondary ${im.flipV ? 'active' : ''}`}
                      style={{ flex: 1, justifyContent: 'center' }}
                      onClick={() => handleLayerCommit({ flipV: !im.flipV })}
                    >
                      <Icons.FlipVertical size={14} />
                      <span>Flip Vert.</span>
                    </button>
                  </div>
                </div>

                {/* Filter sliders */}
                <div className="slider-container">
                  <div className="slider-header">
                    <span>Brightness</span>
                    <span>{im.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    className="studio-slider"
                    value={im.brightness}
                    onChange={(e) => handleLayerChange({ brightness: parseInt(e.target.value) })}
                    onMouseUp={() => handleLayerCommit({ brightness: im.brightness })}
                  />
                </div>

                <div className="slider-container">
                  <div className="slider-header">
                    <span>Contrast</span>
                    <span>{im.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    className="studio-slider"
                    value={im.contrast}
                    onChange={(e) => handleLayerChange({ contrast: parseInt(e.target.value) })}
                    onMouseUp={() => handleLayerCommit({ contrast: im.contrast })}
                  />
                </div>

                <div className="slider-container">
                  <div className="slider-header">
                    <span>Saturation</span>
                    <span>{im.saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    className="studio-slider"
                    value={im.saturation}
                    onChange={(e) => handleLayerChange({ saturation: parseInt(e.target.value) })}
                    onMouseUp={() => handleLayerCommit({ saturation: im.saturation })}
                  />
                </div>

                <div className="slider-container">
                  <div className="slider-header">
                    <span>Blur</span>
                    <span>{im.blur} px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    className="studio-slider"
                    value={im.blur}
                    onChange={(e) => handleLayerChange({ blur: parseInt(e.target.value) })}
                    onMouseUp={() => handleLayerCommit({ blur: im.blur })}
                  />
                </div>

                <div className="slider-container">
                  <div className="slider-header">
                    <span>Grayscale</span>
                    <span>{im.grayscale}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="studio-slider"
                    value={im.grayscale}
                    onChange={(e) => handleLayerChange({ grayscale: parseInt(e.target.value) })}
                    onMouseUp={() => handleLayerCommit({ grayscale: im.grayscale })}
                  />
                </div>

                <div className="slider-container">
                  <div className="slider-header">
                    <span>Sepia</span>
                    <span>{im.sepia}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    className="studio-slider"
                    value={im.sepia}
                    onChange={(e) => handleLayerChange({ sepia: parseInt(e.target.value) })}
                    onMouseUp={() => handleLayerCommit({ sepia: im.sepia })}
                  />
                </div>

                <div className="slider-container">
                  <div className="slider-header">
                    <span>Hue Rotate</span>
                    <span>{im.hueRotate}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    className="studio-slider"
                    value={im.hueRotate}
                    onChange={(e) => handleLayerChange({ hueRotate: parseInt(e.target.value) })}
                    onMouseUp={() => handleLayerCommit({ hueRotate: im.hueRotate })}
                  />
                </div>

                <button
                  className="btn-secondary"
                  style={{ justifyContent: 'center', marginTop: '5px' }}
                  onClick={() => {
                    handleLayerCommit({
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
                  }}
                >
                  Reset Photo Adjustments
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* TYPE: DRAWING PROPERTIES */}
      {selectedLayer.type === 'drawing' && (
        <div className="property-group">
          <div className="property-group-title">Drawing Path Properties</div>
          {(() => {
            const dl = selectedLayer as DrawingLayer;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <span className="input-label">Brush Path Style</span>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                    Style: {dl.brushStyle || 'brush'}
                  </div>
                </div>

                <div>
                  <span className="input-label">Path Color</span>
                  <div className="color-picker-row">
                    <button className="color-swatch-btn" style={{ backgroundColor: dl.strokeColor }}>
                      <input
                        type="color"
                        className="color-swatch-input"
                        value={dl.strokeColor}
                        onChange={(e) => handleLayerChange({ strokeColor: e.target.value })}
                        onBlur={(e) => handleLayerCommit({ strokeColor: e.target.value })}
                      />
                    </button>
                    <input
                      type="text"
                      className="studio-input"
                      value={dl.strokeColor}
                      onChange={(e) => handleLayerChange({ strokeColor: e.target.value })}
                      onBlur={(e) => handleLayerCommit({ strokeColor: e.target.value })}
                    />
                  </div>
                </div>

                <div className="slider-container">
                  <div className="slider-header">
                    <span>Path Thickness</span>
                    <span>{dl.strokeWidth} px</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    className="studio-slider"
                    value={dl.strokeWidth}
                    onChange={(e) => handleLayerChange({ strokeWidth: parseInt(e.target.value) })}
                    onMouseUp={() => handleLayerCommit({ strokeWidth: dl.strokeWidth })}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* TYPE: ICON PROPERTIES */}
      {selectedLayer.type === 'icon' && (
        <div className="property-group">
          <div className="property-group-title">Vector Icon Style</div>
          {(() => {
            const ic = selectedLayer as IconLayer;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {/* Icon Color */}
                <div>
                  <span className="input-label">Icon Color</span>
                  <div className="color-picker-row">
                    <button className="color-swatch-btn" style={{ backgroundColor: ic.color }}>
                      <input
                        type="color"
                        className="color-swatch-input"
                        value={ic.color.startsWith('#') && ic.color.length === 7 ? ic.color : '#ec4899'}
                        onChange={(e) => handleLayerChange({ color: e.target.value })}
                        onBlur={(e) => handleLayerCommit({ color: e.target.value })}
                      />
                    </button>
                    <input
                      type="text"
                      className="studio-input"
                      value={ic.color}
                      onChange={(e) => handleLayerChange({ color: e.target.value })}
                      onBlur={(e) => handleLayerCommit({ color: e.target.value })}
                    />
                  </div>
                </div>

                {/* Stroke width */}
                <div className="slider-container">
                  <div className="slider-header">
                    <span>Icon Line Thickness</span>
                    <span>{ic.strokeWidth}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="0.5"
                    className="studio-slider"
                    value={ic.strokeWidth}
                    onChange={(e) => handleLayerChange({ strokeWidth: parseFloat(e.target.value) })}
                    onMouseUp={() => handleLayerCommit({ strokeWidth: ic.strokeWidth })}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};
