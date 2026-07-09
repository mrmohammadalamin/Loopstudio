import React, { useState, useRef, useEffect } from 'react';
import './AdvancedColorPicker.css';

export type FillType = 'color' | 'linear-gradient' | 'radial-gradient' | 'mesh-gradient' | 'pattern';

export interface GradientStop {
  offset: number; // 0 to 100
  color: string;
}

export interface MeshPoint {
  x: number; // 0 to 100
  y: number; // 0 to 100
  color: string;
  radius: number; // 0 to 100
}

interface AdvancedColorPickerProps {
  fillType: FillType;
  solidColor: string;
  gradientStops: GradientStop[];
  meshPoints: MeshPoint[];
  gradientAngle: number;
  patternUrl?: string;
  patternScale?: number;
  onChange: (data: {
    fillType: FillType;
    solidColor?: string;
    gradientStops?: GradientStop[];
    meshPoints?: MeshPoint[];
    gradientAngle?: number;
    patternUrl?: string;
    patternScale?: number;
  }) => void;
}

const defaultGradientStops: GradientStop[] = [
  { offset: 0, color: '#3b82f6' },
  { offset: 100, color: '#ec4899' }
];

const defaultMeshPoints: MeshPoint[] = [
  { x: 20, y: 20, color: '#3b82f6', radius: 50 },
  { x: 80, y: 80, color: '#ec4899', radius: 50 },
  { x: 20, y: 80, color: '#8b5cf6', radius: 50 }
];

export const PRESET_PATTERNS = [
  { name: 'Grid', url: "data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 20 0 L 0 0 0 20' fill='none' stroke='%23ffffff' stroke-width='1' opacity='0.3'/%3E%3C/svg%3E" },
  { name: 'Dots', url: "data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='4' cy='4' r='2' fill='%23ffffff' opacity='0.4'/%3E%3C/svg%3E" },
  { name: 'Lines', url: "data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,20 L20,0' stroke='%23ffffff' stroke-width='2' opacity='0.3'/%3E%3C/svg%3E" },
  { name: 'Cross', url: "data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10,0 L10,20 M0,10 L20,10' stroke='%23ffffff' stroke-width='1' opacity='0.3'/%3E%3C/svg%3E" },
  { name: 'Checker', url: "data:image/svg+xml,%3Csvg width='20' height='20' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='10' height='10' fill='%23ffffff' opacity='0.15'/%3E%3Crect x='10' y='10' width='10' height='10' fill='%23ffffff' opacity='0.15'/%3E%3C/svg%3E" },
  { name: 'Waves', url: "data:image/svg+xml,%3Csvg width='20' height='10' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,5 Q5,0 10,5 T20,5' fill='none' stroke='%23ffffff' stroke-width='1' opacity='0.4'/%3E%3C/svg%3E" }
];

export const AdvancedColorPicker: React.FC<AdvancedColorPickerProps> = ({
  fillType,
  solidColor,
  gradientStops = [],
  meshPoints = [],
  gradientAngle,
  patternUrl,
  patternScale,
  onChange
}) => {
  const [activeTab, setActiveTab] = useState<FillType>(fillType || 'color');
  
  // Track active selections
  const [activeStopIndex, setActiveStopIndex] = useState<number>(0);
  const [activeMeshIndex, setActiveMeshIndex] = useState<number>(0);

  // Refs for drag operations
  const trackRef = useRef<HTMLDivElement>(null);
  const meshRef = useRef<HTMLDivElement>(null);

  // Initialize missing arrays if switching types
  useEffect(() => {
    setActiveTab(fillType || 'color');
  }, [fillType]);

  const handleTabChange = (tab: FillType) => {
    setActiveTab(tab);
    onChange({
      fillType: tab,
      gradientStops: gradientStops.length > 0 ? gradientStops : defaultGradientStops,
      meshPoints: meshPoints.length > 0 ? meshPoints : defaultMeshPoints,
      gradientAngle: gradientAngle ?? 0,
      solidColor: solidColor || '#ffffff',
      patternUrl: patternUrl || PRESET_PATTERNS[0].url,
      patternScale: patternScale || 50
    });
  };

  // --- Gradient Handlers ---
  const handleTrackClick = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const offset = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    
    // Add new stop
    const newStops = [...gradientStops, { offset, color: '#ffffff' }].sort((a, b) => a.offset - b.offset);
    onChange({ fillType: activeTab, gradientStops: newStops });
    setActiveStopIndex(newStops.findIndex(s => s.offset === offset));
  };

  const handleStopDrag = (e: React.MouseEvent | MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveStopIndex(index);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const offset = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      
      const newStops = [...gradientStops];
      newStops[index] = { ...newStops[index], offset };
      // Sort and update active index to keep selection tracking
      const sortedStops = [...newStops].sort((a, b) => a.offset - b.offset);
      const newIndex = sortedStops.findIndex(s => s === newStops[index]);
      
      onChange({ fillType: activeTab, gradientStops: sortedStops });
      setActiveStopIndex(newIndex);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const removeActiveStop = () => {
    if (gradientStops.length <= 2) return; // Need at least 2 stops
    const newStops = gradientStops.filter((_, i) => i !== activeStopIndex);
    onChange({ fillType: activeTab, gradientStops: newStops });
    setActiveStopIndex(Math.max(0, activeStopIndex - 1));
  };

  const updateActiveStopColor = (color: string) => {
    const newStops = [...gradientStops];
    newStops[activeStopIndex] = { ...newStops[activeStopIndex], color };
    onChange({ fillType: activeTab, gradientStops: newStops });
  };

  // --- Mesh Handlers ---
  const handleMeshClick = (e: React.MouseEvent) => {
    if (!meshRef.current) return;
    const rect = meshRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    
    // Check if clicked on existing node
    const clickedNodeIndex = meshPoints.findIndex(p => {
      const px = (p.x / 100) * rect.width;
      const py = (p.y / 100) * rect.height;
      const dist = Math.sqrt(Math.pow(px - (e.clientX - rect.left), 2) + Math.pow(py - (e.clientY - rect.top), 2));
      return dist < 12; // hit radius
    });

    if (clickedNodeIndex !== -1) {
      setActiveMeshIndex(clickedNodeIndex);
      return;
    }

    // Add new node
    const newPoints = [...meshPoints, { x, y, color: '#ffffff', radius: 50 }];
    onChange({ fillType: 'mesh-gradient', meshPoints: newPoints });
    setActiveMeshIndex(newPoints.length - 1);
  };

  const handleMeshNodeDrag = (e: React.MouseEvent | MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveMeshIndex(index);

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!meshRef.current) return;
      const rect = meshRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((moveEvent.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((moveEvent.clientY - rect.top) / rect.height) * 100));
      
      const newPoints = [...meshPoints];
      newPoints[index] = { ...newPoints[index], x, y };
      onChange({ fillType: 'mesh-gradient', meshPoints: newPoints });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const removeActiveMeshNode = () => {
    if (meshPoints.length <= 1) return;
    const newPoints = meshPoints.filter((_, i) => i !== activeMeshIndex);
    onChange({ fillType: 'mesh-gradient', meshPoints: newPoints });
    setActiveMeshIndex(Math.max(0, activeMeshIndex - 1));
  };

  const updateActiveMeshColor = (color: string) => {
    const newPoints = [...meshPoints];
    newPoints[activeMeshIndex] = { ...newPoints[activeMeshIndex], color };
    onChange({ fillType: 'mesh-gradient', meshPoints: newPoints });
  };

  const updateActiveMeshRadius = (radius: number) => {
    const newPoints = [...meshPoints];
    newPoints[activeMeshIndex] = { ...newPoints[activeMeshIndex], radius };
    onChange({ fillType: 'mesh-gradient', meshPoints: newPoints });
  };

  // --- Render Helpers ---
  const getGradientBackground = () => {
    const stopsStr = [...(gradientStops || [])]
      .sort((a, b) => a.offset - b.offset)
      .map(s => `${s.color} ${s.offset}%`)
      .join(', ');
    return `linear-gradient(to right, ${stopsStr})`;
  };

  const getMeshPreviewBackground = () => {
    return solidColor || '#1e293b';
  };

  return (
    <div className="advanced-color-picker" onClick={e => e.stopPropagation()}>
      <div className="acp-tabs">
        <button className={`acp-tab ${activeTab === 'color' ? 'active' : ''}`} onClick={() => handleTabChange('color')}>Solid</button>
        <button className={`acp-tab ${activeTab === 'linear-gradient' ? 'active' : ''}`} onClick={() => handleTabChange('linear-gradient')}>Linear</button>
        <button className={`acp-tab ${activeTab === 'radial-gradient' ? 'active' : ''}`} onClick={() => handleTabChange('radial-gradient')}>Radial</button>
        <button className={`acp-tab ${activeTab === 'mesh-gradient' ? 'active' : ''}`} onClick={() => handleTabChange('mesh-gradient')}>Mesh</button>
        <button className={`acp-tab ${activeTab === 'pattern' ? 'active' : ''}`} onClick={() => handleTabChange('pattern')}>Texture</button>
      </div>

      {activeTab === 'color' && (
        <div className="acp-solid-container">
          <input 
            type="color" 
            className="acp-native-color" 
            value={solidColor} 
            onChange={e => onChange({ fillType: 'color', solidColor: e.target.value })} 
          />
        </div>
      )}

      {(activeTab === 'linear-gradient' || activeTab === 'radial-gradient') && (
        <div className="acp-gradient-container">
          <div 
            className="acp-gradient-track" 
            ref={trackRef} 
            style={{ background: getGradientBackground() }}
            onMouseDown={handleTrackClick}
          >
            {gradientStops.map((stop, i) => (
              <div 
                key={i}
                className={`acp-gradient-stop ${i === activeStopIndex ? 'active' : ''}`}
                style={{ left: `${stop.offset}%`, backgroundColor: stop.color }}
                onMouseDown={(e) => handleStopDrag(e, i)}
              />
            ))}
          </div>

          <div className="acp-stop-controls">
            <input 
              type="color" 
              className="acp-stop-color-input" 
              value={gradientStops[activeStopIndex]?.color || '#ffffff'} 
              onChange={e => updateActiveStopColor(e.target.value)}
            />
            <button 
              className="acp-remove-stop" 
              onClick={removeActiveStop}
              disabled={gradientStops.length <= 2}
              style={{ opacity: gradientStops.length <= 2 ? 0.5 : 1 }}
            >
              Remove Stop
            </button>
          </div>
          
          {activeTab === 'linear-gradient' && (
            <div className="acp-slider-row" style={{ marginTop: '12px' }}>
              <span>Angle</span>
              <input 
                type="range" 
                min="0" max="360" 
                className="acp-slider" style={{ width: '120px' }}
                value={gradientAngle || 0}
                onChange={e => onChange({ fillType: activeTab, gradientAngle: parseInt(e.target.value) })}
              />
              <span>{gradientAngle || 0}°</span>
            </div>
          )}
          
          <div className="acp-hint">Click track to add stop. Drag to move.</div>
        </div>
      )}

      {activeTab === 'mesh-gradient' && (
        <div className="acp-mesh-container">
          <div 
            className="acp-mesh-editor" 
            ref={meshRef} 
            onMouseDown={handleMeshClick}
            style={{ backgroundColor: getMeshPreviewBackground() }}
          >
            {meshPoints.map((point, i) => (
              <div 
                key={i}
                className={`acp-mesh-node ${i === activeMeshIndex ? 'active' : ''}`}
                style={{ left: `${point.x}%`, top: `${point.y}%`, backgroundColor: point.color }}
                onMouseDown={(e) => handleMeshNodeDrag(e, i)}
              />
            ))}
          </div>

          <div className="acp-mesh-controls">
            <div className="acp-stop-controls">
              <input 
                type="color" 
                className="acp-stop-color-input" 
                value={meshPoints[activeMeshIndex]?.color || '#ffffff'} 
                onChange={e => updateActiveMeshColor(e.target.value)}
              />
              <button 
                className="acp-remove-stop" 
                onClick={removeActiveMeshNode}
                disabled={meshPoints.length <= 1}
                style={{ opacity: meshPoints.length <= 1 ? 0.5 : 1 }}
              >
                Remove Node
              </button>
            </div>
            
            <div className="acp-slider-row">
              <span>Spread Radius</span>
              <input 
                type="range" 
                min="10" max="150" 
                className="acp-slider" style={{ width: '120px' }}
                value={meshPoints[activeMeshIndex]?.radius || 50}
                onChange={e => updateActiveMeshRadius(parseInt(e.target.value))}
              />
              <span>{meshPoints[activeMeshIndex]?.radius || 50}</span>
            </div>
          </div>
          
          <div className="acp-hint">Click canvas to add nodes. Drag to reposition.</div>
        </div>
      )}

      {activeTab === 'pattern' && (
        <div className="acp-pattern-container">
          <div className="acp-pattern-grid">
            {PRESET_PATTERNS.map((p, i) => (
              <div 
                key={i} 
                className={`acp-pattern-item ${patternUrl === p.url ? 'active' : ''}`}
                title={p.name}
                onClick={() => onChange({ fillType: 'pattern', patternUrl: p.url, patternScale })}
              >
                <div style={{ width: '100%', height: '100%', backgroundImage: `url("${p.url}")`, backgroundSize: '20px 20px', backgroundColor: '#334155' }} />
              </div>
            ))}
          </div>
          
          <div className="acp-slider-row" style={{ marginTop: '12px' }}>
            <span>Scale</span>
            <input 
              type="range" 
              min="10" max="200" 
              className="acp-slider" style={{ width: '120px' }}
              value={patternScale || 50}
              onChange={e => onChange({ fillType: 'pattern', patternScale: parseInt(e.target.value) })}
            />
            <span>{patternScale || 50}%</span>
          </div>
          
          <div className="acp-solid-container" style={{ marginTop: '12px' }}>
            <span className="input-label" style={{ fontSize: '11px', color: '#cbd5e1' }}>Background Color</span>
            <input 
              type="color" 
              className="acp-native-color" 
              value={solidColor} 
              onChange={e => onChange({ fillType: 'pattern', solidColor: e.target.value })} 
            />
          </div>
        </div>
      )}
    </div>
  );
};
