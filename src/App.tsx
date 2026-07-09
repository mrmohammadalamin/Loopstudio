import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { Layer, GraphicDocument } from './types';
import { useHistory } from './hooks/useHistory';
import { Canvas } from './components/Canvas';
import { Sidebar } from './components/Sidebar';
import { PropertyPanel } from './components/PropertyPanel';
import { MenuBar } from './components/MenuBar';


const DEFAULT_DOCUMENT: GraphicDocument = {
  width: 1080,
  height: 1080,
  backgroundColor: '#111827',
  unit: 'px',
  dpi: 72,
  slices: [],
  layers: [
    {
      id: 'default-shape',
      name: 'Glowing Accent',
      type: 'shape',
      shapeType: 'circle',
      x: 340,
      y: 340,
      width: 400,
      height: 400,
      rotation: 0,
      opacity: 0.3,
      locked: false,
      visible: true,
      fill: '#8b5cf6',
      stroke: '#ec4899',
      strokeWidth: 4,
    },
    {
      id: 'default-title',
      name: 'Title Text',
      type: 'text',
      x: 90,
      y: 460,
      width: 900,
      height: 90,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      text: 'CREATE STUNNING GRAPHICS',
      fontSize: 56,
      fontFamily: 'Montserrat',
      fontWeight: '800',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#ffffff',
      textAlign: 'center',
      lineHeight: 1.2,
      letterSpacing: 2,
      strokeColor: 'transparent',
      strokeWidth: 0,
      shadowColor: '#8b5cf6',
      shadowBlur: 20,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    },
    {
      id: 'default-subtitle',
      name: 'Subtitle Text',
      type: 'text',
      x: 140,
      y: 560,
      width: 800,
      height: 40,
      rotation: 0,
      opacity: 1,
      locked: false,
      visible: true,
      text: 'Express Your Creativity in Vivid Studio',
      fontSize: 24,
      fontFamily: 'Outfit',
      fontWeight: '600',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#9ca3af',
      textAlign: 'center',
      lineHeight: 1.2,
      letterSpacing: 1,
      strokeColor: 'transparent',
      strokeWidth: 0,
      shadowColor: 'transparent',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
    },
    {
      id: 'default-icon',
      name: 'Sparkles Icon',
      type: 'icon',
      iconName: 'Sparkles',
      x: 490,
      y: 240,
      width: 100,
      height: 100,
      rotation: 15,
      opacity: 0.9,
      locked: false,
      visible: true,
      color: '#fbbf24',
      strokeWidth: 1.5,
    }
  ],
};

function App() {
  const {
    document: doc,
    updateDocument,
    commitDocument,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
  } = useHistory(DEFAULT_DOCUMENT);

  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [bulkPreviewUrl, setBulkPreviewUrl] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'draw' | 'crop' | 'slice' | 'magic-wand' | 'lasso'>('select');
  const [lassoMode, setLassoMode] = useState<'select' | 'cut' | 'erase'>('select');
  const [lassoFeather, setLassoFeather] = useState<number>(2);
  const [brushColor, setBrushColor] = useState('#8b5cf6');
  const [brushWidth, setBrushWidth] = useState(8);
  const [brushStyle, setBrushStyle] = useState<string>('soft-round');
  const [colorSeparation, setColorSeparation] = useState<'none' | 'c' | 'm' | 'y' | 'k' | 'r' | 'g' | 'b'>('none');
  const [localProjects, setLocalProjects] = useState<{ id: string; name: string; document: GraphicDocument; updatedAt: string }[]>([]);
  const [snapEnabled, setSnapEnabled] = useState<boolean>(true);
  const [exportScale, setExportScale] = useState<number>(1);

  // Local projects sync on mount
  useEffect(() => {
    const saved = localStorage.getItem('vivid_projects');
    if (saved) {
      try {
        setLocalProjects(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse projects:', e);
      }
    }
  }, []);

  const handleSaveProject = (projectName?: string) => {
    const newProject = {
      id: `project-${Date.now()}`,
      name: projectName || 'Untitled Design',
      document: doc,
      updatedAt: new Date().toLocaleString(),
    };
    const updated = [newProject, ...localProjects.filter((p) => p.name !== projectName)];
    setLocalProjects(updated);
    localStorage.setItem('vivid_projects', JSON.stringify(updated));
    confettiCelebration();
  };

  const handleLoadProject = (id: string) => {
    const proj = localProjects.find((p) => p.id === id);
    if (!proj) return;
    resetHistory(proj.document);
    setSelectedLayerIds([]);
    setActiveTool('select');
  };

  const handleDeleteProject = (id: string) => {
    const updated = localProjects.filter((p) => p.id !== id);
    setLocalProjects(updated);
    localStorage.setItem('vivid_projects', JSON.stringify(updated));
  };


  // Update zoom to fit on load
  useEffect(() => {
    const handleInitialZoom = () => {
      const workspace = document.querySelector('.canvas-container');
      if (workspace) {
        const w = (workspace as HTMLElement).offsetWidth - 120;
        const h = (workspace as HTMLElement).offsetHeight - 120;
        const fitZoom = Math.min(w / doc.width, h / doc.height, 0.7);
        setZoom(fitZoom);
      }
    };
    handleInitialZoom();
    // Delay slightly to ensure layout is painted
    setTimeout(handleInitialZoom, 100);
  }, []);

  // Keyboard shortcut: Delete active layer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedLayerIds.length > 0) {
        e.preventDefault();
        selectedLayerIds.forEach(id => handleDeleteLayer(id));
        setSelectedLayerIds([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedLayerIds, doc.layers]);

  // LAYER ACTIONS
  const handleAddLayer = (newLayerData: Omit<Layer, 'id'>) => {
    const id = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newLayer = { ...newLayerData, id } as Layer;
    const updatedLayers = [...doc.layers, newLayer];
    commitDocument({ ...doc, layers: updatedLayers });
    setSelectedLayerIds([id]);
  };

  const handleUpdateLayers = (updates: {id: string, fields: Partial<Layer>}[]) => {
    const updatedLayers = doc.layers.map((layer) => {
      const update = updates.find(u => u.id === layer.id);
      return update ? { ...layer, ...update.fields } as Layer : layer;
    });
    updateDocument({ ...doc, layers: updatedLayers });
  };

  const handleUpdateLayer = (id: string, updatedFields: Partial<Layer>) => {
    const updatedLayers = doc.layers.map((layer) =>
      layer.id === id ? ({ ...layer, ...updatedFields } as Layer) : layer
    );
    updateDocument({ ...doc, layers: updatedLayers });
  };

  const handleCommitLayers = (updates: {id: string, fields: Partial<Layer>}[]) => {
    const updatedLayers = doc.layers.map((layer) => {
      const update = updates.find(u => u.id === layer.id);
      return update ? { ...layer, ...update.fields } as Layer : layer;
    });
    commitDocument({ ...doc, layers: updatedLayers });
  };

  const handleCommitLayer = (id: string, updatedFields: Partial<Layer>) => {
    const updatedLayers = doc.layers.map((layer) =>
      layer.id === id ? ({ ...layer, ...updatedFields } as Layer) : layer
    );
    commitDocument({ ...doc, layers: updatedLayers });
  };

  const handleDeleteLayer = (id: string) => {
    const updatedLayers = doc.layers.filter((layer) => layer.id !== id);
    commitDocument({ ...doc, layers: updatedLayers });
    setSelectedLayerIds(prev => prev.filter(selectedId => selectedId !== id));
  };

  const handleDuplicateLayer = (id: string) => {
    const layerToDuplicate = doc.layers.find((layer) => layer.id === id);
    if (!layerToDuplicate) return;

    const newId = `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duplicatedLayer = {
      ...layerToDuplicate,
      id: newId,
      name: `${layerToDuplicate.name} (Copy)`,
      x: layerToDuplicate.x + 30,
      y: layerToDuplicate.y + 30,
    } as Layer;

    const updatedLayers = [...doc.layers, duplicatedLayer];
    commitDocument({ ...doc, layers: updatedLayers });
    setSelectedLayerIds([newId]);
  };

  const handleReorderLayers = (newLayers: Layer[]) => {
    commitDocument({ ...doc, layers: newLayers });
  };

  const handleBringToFront = (id: string) => {
    const layer = doc.layers.find((l) => l.id === id);
    if (!layer) return;
    const others = doc.layers.filter((l) => l.id !== id);
    commitDocument({ ...doc, layers: [...others, layer] });
  };

  const handleSendToBack = (id: string) => {
    const layer = doc.layers.find((l) => l.id === id);
    if (!layer) return;
    const others = doc.layers.filter((l) => l.id !== id);
    commitDocument({ ...doc, layers: [layer, ...others] });
  };

  const handleBringForward = (id: string) => {
    const index = doc.layers.findIndex((l) => l.id === id);
    if (index === -1 || index === doc.layers.length - 1) return;
    const newLayers = [...doc.layers];
    const temp = newLayers[index];
    newLayers[index] = newLayers[index + 1];
    newLayers[index + 1] = temp;
    commitDocument({ ...doc, layers: newLayers });
  };

  const handleResizeDocument = (w: number, h: number) => {
    if (w > 0 && h > 0) {
      commitDocument({ ...doc, width: w, height: h });
    }
  };

  const handleSendBackward = (id: string) => {
    const index = doc.layers.findIndex((l) => l.id === id);
    if (index === -1 || index === 0) return;
    const newLayers = [...doc.layers];
    const temp = newLayers[index];
    newLayers[index] = newLayers[index - 1];
    newLayers[index - 1] = temp;
    commitDocument({ ...doc, layers: newLayers });
  };

  const handleAddSlice = (slice: { x: number, y: number, width: number, height: number, name?: string }) => {
    const id = `slice-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newSlice = { id, ...slice };
    const updatedSlices = [...(doc.slices || []), newSlice];
    commitDocument({ ...doc, slices: updatedSlices });
  };

  const handleDeleteSlice = (id: string) => {
    const updatedSlices = (doc.slices || []).filter((s) => s.id !== id);
    commitDocument({ ...doc, slices: updatedSlices });
  };

  const handleClearSlices = () => {
    commitDocument({ ...doc, slices: [] });
  };

  const handleClearCanvas = () => {
    commitDocument({
      width: doc.width,
      height: doc.height,
      backgroundColor: doc.backgroundColor,
      unit: doc.unit || 'px',
      dpi: doc.dpi || 72,
      slices: [],
      layers: [],
    });
  };

  // DOCUMENT ACTIONS
  const handleUpdateDocument = (updatedFields: Partial<GraphicDocument>) => {
    updateDocument({ ...doc, ...updatedFields });
  };

  const handleCommitDocument = (updatedFields: Partial<GraphicDocument>) => {
    commitDocument({ ...doc, ...updatedFields });
  };

  const handleLoadTemplate = (template: any) => {
    const newDoc: GraphicDocument = {
      width: template.width,
      height: template.height,
      backgroundColor: template.backgroundColor || '#ffffff',
      unit: 'px',
      dpi: 72,
      slices: [],
      layers: JSON.parse(JSON.stringify(template.layers)).map((l: any, i: number) => ({ ...l, id: Date.now().toString() + '-' + i })),
    };
    resetHistory(newDoc);
    setSelectedLayerIds([]);
    
    // Zoom to fit loaded template
    const workspace = document.querySelector('.canvas-container');
    if (workspace) {
      const w = (workspace as HTMLElement).offsetWidth - 120;
      const h = (workspace as HTMLElement).offsetHeight - 120;
      const fitZoom = Math.max(0.1, Math.min(Math.max(w, 100) / template.width, Math.max(h, 100) / template.height, 0.8));
      setZoom(fitZoom);
      setPan({ x: 0, y: 0 });
    }

    // Celebrate loading template
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#8b5cf6', '#ec4899', '#3b82f6'],
    });
  };

  // EXPORT ENGINE
  const serializeToSVGString = (layerList: Layer[] = doc.layers): string => {
    // 1. Gather Fonts to embed (Cannot use external @import in SVG loaded via <img> due to strict security policies)
    const fontsStyle = `
      /* External fonts omitted to prevent img.onerror security blocks. Local fonts will be used if available. */
    `;

    // 2. Generate layers SVG nodes
    const svgLayersMarkup = layerList
      .filter((layer) => layer.visible)
      .map((layer) => {
        const cx = layer.x + layer.width / 2;
        const cy = layer.y + layer.height / 2;
        const transform = `rotate(${layer.rotation} ${cx} ${cy})`;
        const opacityStr = layer.opacity < 1 ? `opacity="${layer.opacity}"` : '';

        switch (layer.type) {
          case 'text': {
            const tl = layer as any;
            const textShadow = tl.shadowBlur > 0
              ? `filter="url(#glow-${tl.id})"`
              : '';
            
            // Build filter definitions for shadows if present
            const shadowFilter = tl.shadowBlur > 0
              ? `<filter id="glow-${tl.id}" x="-50%" y="-50%" width="200%" height="200%">
                   <feDropShadow dx="${tl.shadowOffsetX}" dy="${tl.shadowOffsetY}" stdDeviation="${tl.shadowBlur / 4}" flood-color="${tl.shadowColor}" flood-opacity="0.8"/>
                 </filter>`
              : '';

            // Split into lines for SVG line breaks
            const lines = tl.text.split('\n');
            const dyVal = tl.lineHeight * tl.fontSize;
            
            // Align adjustments in SVG
            let textAnchor = 'start';
            let textX = tl.x;
            if (tl.textAlign === 'center') {
              textAnchor = 'middle';
              textX = tl.x + tl.width / 2;
            } else if (tl.textAlign === 'right') {
              textAnchor = 'end';
              textX = tl.x + tl.width;
            }

            const textLines = lines
              .map((line: string, i: number) => {
                const yPos = tl.y + tl.fontSize + i * dyVal;
                return `<tspan x="${textX}" y="${yPos}" dy="0">${escapeHtml(line)}</tspan>`;
              })
              .join('');

            const strokeStyle = tl.strokeWidth > 0
              ? `stroke="${tl.strokeColor}" stroke-width="${tl.strokeWidth}" paint-order="stroke fill"`
              : '';

            return `
              ${shadowFilter}
              <text 
                font-family="${tl.fontFamily}" 
                font-size="${tl.fontSize}" 
                font-weight="${tl.fontWeight}" 
                font-style="${tl.fontStyle}"
                text-decoration="${tl.textDecoration}"
                fill="${tl.color}" 
                text-anchor="${textAnchor}"
                transform="${transform}"
                ${textShadow}
                ${strokeStyle}
                ${opacityStr}
                style="letter-spacing: ${tl.letterSpacing}px;"
              >
                ${textLines}
              </text>
            `;
          }

          case 'shape': {
            const sl = layer as any;
            const fill = sl.fill;
            const stroke = sl.stroke;
            const strokeW = sl.strokeWidth;
            const rad = sl.cornerRadius ?? 0;

            let pathNode = '';
            if (sl.shapeType === 'rectangle') {
              pathNode = `<rect x="${sl.x}" y="${sl.y}" width="${sl.width}" height="${sl.height}" rx="${rad}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />`;
            } else if (sl.shapeType === 'circle') {
              pathNode = `<circle cx="${cx}" cy="${cy}" r="${sl.width / 2 - 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />`;
            } else if (sl.shapeType === 'triangle') {
              pathNode = `<polygon points="${cx},${sl.y} ${sl.x + sl.width},${sl.y + sl.height} ${sl.x},${sl.y + sl.height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />`;
            } else if (sl.shapeType === 'line') {
              pathNode = `<line x1="${sl.x}" y1="${cy}" x2="${sl.x + sl.width}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeW}" />`;
            } else if (sl.shapeType === 'arrow') {
              pathNode = `
                <g>
                  <line x1="${sl.x}" y1="${cy}" x2="${sl.x + sl.width - 12}" y2="${cy}" stroke="${stroke}" stroke-width="${strokeW}" />
                  <polygon points="${sl.x + sl.width - 12},${cy - 8} ${sl.x + sl.width},${cy} ${sl.x + sl.width - 12},${cy + 8}" fill="${stroke}" />
                </g>
              `;
            } else if (sl.shapeType === 'star') {
              // Scale default points coordinates
              const scaleX = sl.width / 100;
              const scaleY = sl.height / 100;
              const pts = [
                [50, 2], [63, 33], [97, 38], [72, 62], [78, 96],
                [50, 80], [22, 96], [28, 62], [3, 38], [37, 33]
              ].map(([px, py]) => `${sl.x + px * scaleX},${sl.y + py * scaleY}`).join(' ');
              
              pathNode = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />`;
            } else if (sl.shapeType === 'polygon') {
              const scaleX = sl.width / 100;
              const scaleY = sl.height / 100;
              const pts = [
                [50, 2], [95, 25], [95, 75], [50, 98], [5, 75], [5, 25]
              ].map(([px, py]) => `${sl.x + px * scaleX},${sl.y + py * scaleY}`).join(' ');
              
              pathNode = `<polygon points="${pts}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeW}" />`;
            }

            return `
              <g transform="${transform}" ${opacityStr}>
                ${pathNode}
              </g>
            `;
          }

          case 'image': {
            const im = layer as any;
            const filterId = `filter-${im.id}`;
            const flipScaleX = im.flipH ? -1 : 1;
            const flipScaleY = im.flipV ? -1 : 1;
            
            // Re-center rotation and flips
            const rotateTransform = `rotate(${im.rotation} ${cx} ${cy})`;
            // Flip requires translation offset to flip on center
            const flipTransform = im.flipH || im.flipV 
              ? `translate(${cx} ${cy}) scale(${flipScaleX} ${flipScaleY}) translate(${-cx} ${-cy})` 
              : '';

            return `
              <filter id="${filterId}">
                <feColorMatrix type="matrix" values="
                  ${im.contrast/100} 0 0 0 0
                  0 ${im.contrast/100} 0 0 0
                  0 0 ${im.contrast/100} 0 0
                  0 0 0 1 0" />
                <feComponentTransfer>
                  <feFuncR type="linear" slope="${im.brightness/100}"/>
                  <feFuncG type="linear" slope="${im.brightness/100}"/>
                  <feFuncB type="linear" slope="${im.brightness/100}"/>
                </feComponentTransfer>
              </filter>
              <g transform="${rotateTransform} ${flipTransform}" ${opacityStr}>
                <image 
                  href="${escapeHtml(im.src)}" 
                  x="${im.x}" 
                  y="${im.y}" 
                  width="${im.width}" 
                  height="${im.height}" 
                  preserveAspectRatio="xMidYMid slice"
                  filter="url(#${filterId})"
                />
              </g>
            `;
          }

          case 'icon': {
            const ic = layer as any;
            // Fetch icon path from screen DOM to maintain complete accuracy
            const domIcon = document.querySelector(`.layer-wrapper[style*="z-index: ${doc.layers.indexOf(layer)}"] svg`);
            let innerPaths = '';
            if (domIcon) {
              innerPaths = domIcon.innerHTML;
            } else {
              // Fallback default path if DOM is not ready
              innerPaths = `<circle cx="50" cy="50" r="40" /><path d="m50 10-5 30H15l25 20-10 30 30-20 30 20-10-30 25-20H55z" />`;
            }

            return `
              <g transform="translate(${ic.x} ${ic.y}) rotate(${ic.rotation} ${ic.width / 2} ${ic.height / 2})" ${opacityStr}>
                <svg width="${ic.width}" height="${ic.height}" viewBox="0 0 24 24" fill="none" stroke="${ic.color}" stroke-width="${ic.strokeWidth}" stroke-linecap="round" stroke-linejoin="round">
                  ${innerPaths}
                </svg>
              </g>
            `;
          }

          default:
            return '';
        }
      })
      .join('\n');

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${doc.width}" height="${doc.height}" viewBox="0 0 ${doc.width} ${doc.height}">
        <defs>
          <style>
            ${fontsStyle}
          </style>
        </defs>
        <rect width="100%" height="100%" fill="${doc.backgroundColor}" />
        ${svgLayersMarkup}
      </svg>
    `;
  };

  const escapeHtml = (text: string) => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  };

  const inlineExternalResources = async (svgString: string): Promise<string> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgString, 'image/svg+xml');
    const elements = doc.querySelectorAll('[href], [xlink\\:href]');
    
    for (const el of elements) {
      const href = el.getAttribute('href') || el.getAttribute('xlink:href');
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        try {
          const response = await fetch(href);
          const blob = await response.blob();
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
          if (el.hasAttribute('href')) el.setAttribute('href', base64);
          if (el.hasAttribute('xlink:href')) el.setAttribute('xlink:href', base64);
        } catch (e) {
          console.error("Failed to inline resource:", href, e);
        }
      }
    }
    const serializer = new XMLSerializer();
    return serializer.serializeToString(doc);
  };

  const handleExport = async (format: 'png' | 'jpeg' | 'webp' | 'gif' | 'bmp' | 'svg' | 'pdf' | 'psd' | 'ai' | 'cdr' | 'eps' | 'json') => {
    let mimeType = 'image/png';
    if (format === 'jpeg') mimeType = 'image/jpeg';
    else if (format === 'webp') mimeType = 'image/webp';
    else if (format === 'gif') mimeType = 'image/gif';
    else if (format === 'bmp') mimeType = 'image/bmp';
    else if (format === 'svg') mimeType = 'image/svg+xml';
    else if (format === 'pdf') mimeType = 'application/pdf';
    else if (format === 'json') mimeType = 'application/json';
    else if (format === 'psd') mimeType = 'application/octet-stream';
    else if (format === 'eps') mimeType = 'application/postscript';
    else if (format === 'ai' || format === 'cdr') mimeType = 'image/svg+xml';

    const suggestedName = `vivid-design.${format}`;
    let fileHandle: any = null;
    
    // 1. Immediately request the file handle from the user to preserve the user gesture context!
    if ('showSaveFilePicker' in window) {
      try {
        const accept: Record<string, string[]> = {};
        accept[mimeType] = [`.${format}`];
        fileHandle = await (window as any).showSaveFilePicker({
          suggestedName,
          types: [{ description: `${format.toUpperCase()} File`, accept }]
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') console.error(err);
        return; // User cancelled or error, do not proceed with generation
      }
    } else {
      // Fallback for environments lacking the File System Access API
      console.warn("Native Save Dialog is not supported in this browser or context (requires HTTPS). Using auto-download fallback.");
    }

    // Helper to write to handle or fallback
    const saveBlob = async (blob: Blob) => {
      if (fileHandle) {
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
      } else {
        const url = URL.createObjectURL(blob);
        triggerDownload(url, suggestedName);
        setTimeout(() => URL.revokeObjectURL(url), 100);
      }
      confettiCelebration();
    };

    // 2. Generate the requested file type
    const rawSvgString = serializeToSVGString();
    const svgString = await inlineExternalResources(rawSvgString);

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json;charset=utf-8' });
      await saveBlob(blob);
      return;
    }

    if (format === 'svg') {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      await saveBlob(blob);
      return;
    }

    if (format === 'ai' || format === 'cdr' || format === 'eps') {
      let fileContent = '';
      if (format === 'eps') {
        fileContent = `%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 ${doc.width} ${doc.height}\n%%Title: VividExpress Design\n%%Creator: VividExpress\n%%Pages: 1\n%%EndComments\n\n% SVG Source code wrapped for vector graphic packages:\n\n(${svgString.replace(/\(/g, '\\(').replace(/\)/g, '\\)')}) showpage\n`;
      } else {
        fileContent = svgString;
      }
      const blob = new Blob([fileContent], { type: `${mimeType};charset=utf-8` });
      await saveBlob(blob);
      return;
    }

    if (format === 'psd') {
      try {
        const { writePsd } = await import('ag-psd');
        const children = [];
        if (doc.backgroundColor && doc.backgroundColor !== 'transparent') {
          const bgCanvas = document.createElement('canvas');
          bgCanvas.width = doc.width;
          bgCanvas.height = doc.height;
          const bgCtx = bgCanvas.getContext('2d');
          if (bgCtx) {
            bgCtx.fillStyle = doc.backgroundColor;
            bgCtx.fillRect(0, 0, doc.width, doc.height);
            children.push({ name: 'Background', canvas: bgCanvas });
          }
        }
        for (const layer of doc.layers) {
           const singleSvgRaw = serializeToSVGString([layer]);
           const singleSvg = await inlineExternalResources(singleSvgRaw);
           const blob = new Blob([singleSvg], { type: 'image/svg+xml;charset=utf-8' });
           const url = URL.createObjectURL(blob);
           const img = new Image();
           await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
           const canvas = document.createElement('canvas');
           canvas.width = doc.width;
           canvas.height = doc.height;
           const ctx = canvas.getContext('2d');
           if (ctx) ctx.drawImage(img, 0, 0);
           children.push({ name: layer.name || layer.id, canvas, opacity: Math.round(layer.opacity * 255), hidden: !layer.visible });
           URL.revokeObjectURL(url);
        }
        const psdData = { width: doc.width, height: doc.height, children };
        const buffer = writePsd(psdData);
        const blob = new Blob([buffer], { type: 'application/octet-stream' });
        await saveBlob(blob);
      } catch (err) {
        console.error("Failed to export PSD", err);
        alert("Failed to export PSD format.");
      }
      return;
    }

    if (format === 'pdf') {
      try {
        const { jsPDF } = await import('jspdf');
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        const img = new Image();
        await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
        const canvas = document.createElement('canvas');
        canvas.width = doc.width * exportScale;
        canvas.height = doc.height * exportScale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pdf = new jsPDF({ orientation: doc.width > doc.height ? 'landscape' : 'portrait', unit: 'px', format: [doc.width, doc.height] });
          const imgData = canvas.toDataURL('image/jpeg', 1.0);
          pdf.addImage(imgData, 'JPEG', 0, 0, doc.width, doc.height);
          const pdfBlob = pdf.output('blob');
          await saveBlob(pdfBlob);
        }
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error("Failed to export PDF", err);
        alert("Failed to export PDF.");
      }
      return;
    }

    // Convert SVG to PNG/JPEG/WebP/GIF/BMP via canvas scaled by exportScale
    try {
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      await new Promise((res, rej) => { 
        img.onload = res; 
        img.onerror = (e) => rej(new Error("SVG Image failed to load. " + (e ? e.toString() : ''))); 
        img.src = url; 
      });
      const canvas = document.createElement('canvas');
      canvas.width = doc.width * exportScale;
      canvas.height = doc.height * exportScale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
          if (blob) await saveBlob(blob);
          else alert(`Failed to export ${format.toUpperCase()}: Canvas toBlob returned null (likely tainted by external resources).`);
        }, mimeType);
      }
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to export image: ${err.message || err.toString()}`);
    }
  };

  const handleExportSlices = () => {
    // Export specific rectangular slices defined by the user
    const exportData = async () => {
      // Small delay to ensure any active edits are flushed
      await new Promise(r => setTimeout(r, 100));
      
      const appMain = document.querySelector('.app-main');
      if (!appMain) return;
      const canvasEl = appMain.querySelector('canvas') as HTMLCanvasElement;
      if (!canvasEl) return;
      
      // The canvas we grab is the composited rendering canvas.
      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = doc.width;
      fullCanvas.height = doc.height;
      const ctx = fullCanvas.getContext('2d');
      if (!ctx) return;
      
      // Optional: draw background color
      ctx.fillStyle = doc.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, doc.width, doc.height);
      
      ctx.drawImage(canvasEl, 0, 0, doc.width, doc.height);
      
      if (!doc.slices || doc.slices.length === 0) {
        alert("No slices defined! Use the Slice tool to create slices.");
        return;
      }
      
      let sliceCount = 1;
      for (const slice of doc.slices) {
        if (slice.width <= 0 || slice.height <= 0) continue;
        
        const sx = Math.max(0, slice.x);
        const sy = Math.max(0, slice.y);
        const sw = Math.min(doc.width - sx, slice.width);
        const sh = Math.min(doc.height - sy, slice.height);
        
        if (sw <= 0 || sh <= 0) continue;
        
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = sw;
        sliceCanvas.height = sh;
        const sliceCtx = sliceCanvas.getContext('2d');
        if (sliceCtx) {
          sliceCtx.drawImage(fullCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
          const dataUrl = sliceCanvas.toDataURL('image/png');
          const name = slice.name || `slice_${sliceCount.toString().padStart(2, '0')}`;
          triggerDownload(dataUrl, `${name}.png`);
          sliceCount++;
        }
      }
    };
    exportData();
  };

  const triggerDownload = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confettiCelebration = () => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#8b5cf6', '#ec4899', '#3b82f6'],
    });
  };

  // Import JSON configuration
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedDoc = JSON.parse(event.target?.result as string) as GraphicDocument;
        if (importedDoc.width && importedDoc.height && importedDoc.layers) {
          resetHistory(importedDoc);
          setSelectedLayerIds([]);
          confettiCelebration();
        } else {
          alert('Invalid design file structure');
        }
      } catch (err) {
        alert('Failed to parse design file');
      }
    };
    reader.readAsText(file);
  };

  const parseCSV = async (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return resolve([]);
        const lines = text.split('\n');
        if (lines.length < 2) return resolve([]);
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        const data = [];
        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const row: any = {};
          headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
          data.push(row);
        }
        resolve(data);
      };
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  const generateBadgeCanvas = async (row: any) => {
    const tempLayers = JSON.parse(JSON.stringify(doc.layers));
    tempLayers.forEach((layer: any) => {
      if (layer.type === 'text') {
        let newText = layer.text;
        Object.keys(row).forEach(key => {
          const regex = new RegExp(`{{${key}}}`, 'gi');
          newText = newText.replace(regex, row[key] || '');
        });
        layer.text = newText;
      }
    });
    let svgString = serializeToSVGString(tempLayers);
    svgString = await inlineExternalResources(svgString);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const canvas = document.createElement('canvas');
    canvas.width = doc.width;
    canvas.height = doc.height;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    return canvas.toDataURL('image/jpeg', 0.95);
  };

  const handleBulkExportPreview = async (file: File, layout: '1x1' | '2x1' | '2x2', margins: any) => {
    try {
      const csvData = await parseCSV(file);
      if (!csvData || csvData.length === 0) {
        alert('CSV is empty or invalid.');
        return;
      }
      
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const cols = layout === '1x1' ? 1 : 2;
      const rows = layout === '2x2' ? 2 : 1;
      const maxItemsPerPage = cols * rows;
      
      const availW = 210 - (margins.left + margins.right);
      const availH = 297 - (margins.top + margins.bottom);
      const cellW = (availW - (cols - 1) * margins.gap) / cols;
      const cellH = (availH - (rows - 1) * margins.gap) / rows;
      
      const scale = Math.min(cellW / doc.width, cellH / doc.height);
      const renderW = doc.width * scale;
      const renderH = doc.height * scale;
      
      for (let i = 0; i < Math.min(csvData.length, maxItemsPerPage); i++) {
        const row = csvData[i];
        const imgData = await generateBadgeCanvas(row);
        const colIdx = i % cols;
        const rowIdx = Math.floor(i / cols);
        const x = margins.left + colIdx * (cellW + margins.gap) + (cellW - renderW) / 2;
        const y = margins.top + rowIdx * (cellH + margins.gap) + (cellH - renderH) / 2;
        pdf.addImage(imgData, 'JPEG', x, y, renderW, renderH);
      }
      
      const previewUrl = pdf.output('bloburl');
      setBulkPreviewUrl(previewUrl as any);
    } catch (e) {
      console.error(e);
      alert('Error generating preview.');
    }
  };

  const handleBulkExport = async (file: File, layout: '1x1' | '2x1' | '2x2', margins: any) => {
    try {
      const csvData = await parseCSV(file);
      if (!csvData || csvData.length === 0) {
        alert('CSV is empty or invalid.');
        return;
      }

      const isConfirmed = confirm(`Found ${csvData.length} records in CSV. This might take a few moments to generate. Proceed?`);
      if (!isConfirmed) return;

      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      let itemsOnPage = 0;
      const cols = layout === '1x1' ? 1 : 2;
      const rows = layout === '2x2' ? 2 : 1;
      const maxItemsPerPage = cols * rows;

      const availW = 210 - (margins.left + margins.right);
      const availH = 297 - (margins.top + margins.bottom);
      const cellW = (availW - (cols - 1) * margins.gap) / cols;
      const cellH = (availH - (rows - 1) * margins.gap) / rows;
      
      const scale = Math.min(cellW / doc.width, cellH / doc.height);
      const renderW = doc.width * scale;
      const renderH = doc.height * scale;

      alert('Generating Bulk PDF... Please wait.');

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const imgData = await generateBadgeCanvas(row);

        const colIdx = itemsOnPage % cols;
        const rowIdx = Math.floor(itemsOnPage / cols);
        const x = margins.left + colIdx * (cellW + margins.gap) + (cellW - renderW) / 2;
        const y = margins.top + rowIdx * (cellH + margins.gap) + (cellH - renderH) / 2;

        pdf.addImage(imgData, 'JPEG', x, y, renderW, renderH);

        itemsOnPage++;
        if (itemsOnPage >= maxItemsPerPage && i < csvData.length - 1) {
          pdf.addPage();
          itemsOnPage = 0;
        }
      }

      pdf.save('bulk_attendee_badges.pdf');
      alert('Bulk generation complete!');

    } catch (e) {
      console.error(e);
      alert('Error generating bulk PDF.');
    }
  };

  return (
    <div className="app-container">
      {/* Top Menu Bar */}
      <MenuBar
        document={doc}
        selectedLayerIds={selectedLayerIds}
        canUndo={canUndo}
        canRedo={canRedo}
        snapEnabled={snapEnabled}
        setSnapEnabled={setSnapEnabled}
        exportScale={exportScale}
        setExportScale={setExportScale}
        onUndo={undo}
        onRedo={redo}
        onAddLayer={handleAddLayer}
        onDeleteLayer={handleDeleteLayer}
        onDuplicateLayer={handleDuplicateLayer}
        onBringToFront={handleBringToFront}
        onSendToBack={handleSendToBack}
        onBringForward={handleBringForward}
        onSendBackward={handleSendBackward}
        onExport={handleExport}
        onImportJSON={handleImportJSON}
        onSaveProject={handleSaveProject}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onClearCanvas={handleClearCanvas}
        onResizeDocument={handleResizeDocument}
      />

      {/* Main Designer Grid Workspace */}
      <main className="studio-layout">
        {/* Left collapsable panels */}
        <Sidebar
          document={doc}
          onBulkExport={handleBulkExport}
          onBulkExportPreview={handleBulkExportPreview}
          selectedLayerIds={selectedLayerIds}
          setSelectedLayerIds={setSelectedLayerIds}
          onAddLayer={handleAddLayer}
          onUpdateLayer={handleUpdateLayer}

          onCommitLayer={handleCommitLayer}

          onDeleteLayer={handleDeleteLayer}
          onDuplicateLayer={handleDuplicateLayer}
          onResizeDocument={handleResizeDocument}
          onReorderLayers={handleReorderLayers}
          onLoadTemplate={handleLoadTemplate}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          lassoMode={lassoMode}
          setLassoMode={setLassoMode}
          lassoFeather={lassoFeather}
          setLassoFeather={setLassoFeather}
          brushColor={brushColor}
          setBrushColor={setBrushColor}
          brushWidth={brushWidth}
          setBrushWidth={setBrushWidth}
          brushStyle={brushStyle}
          setBrushStyle={setBrushStyle}
          colorSeparation={colorSeparation}
          setColorSeparation={setColorSeparation}
          localProjects={localProjects}
          onSaveProject={handleSaveProject}
          onLoadProject={handleLoadProject}
          onDeleteProject={handleDeleteProject}
          onAddSlice={handleAddSlice}
          onDeleteSlice={handleDeleteSlice}
          onClearSlices={handleClearSlices}
          onExportSlices={handleExportSlices}
          exportScale={exportScale}
          setExportScale={setExportScale}
        />



        {/* Central interactive canvas */}
        <Canvas
          onUpdateLayers={handleUpdateLayers}
          onCommitLayers={handleCommitLayers}
          document={doc}
          selectedLayerIds={selectedLayerIds}
          setSelectedLayerIds={setSelectedLayerIds}
          onUpdateLayer={handleUpdateLayer}

          onCommitLayer={handleCommitLayer}

          zoom={zoom}
          setZoom={setZoom}
          pan={pan}
          setPan={setPan}
          editingTextId={editingTextId}
          setEditingTextId={setEditingTextId}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          lassoMode={lassoMode}
          lassoFeather={lassoFeather}
          brushColor={brushColor}
          brushWidth={brushWidth}
          brushStyle={brushStyle}
          colorSeparation={colorSeparation}
          onAddLayer={handleAddLayer}
          snapEnabled={snapEnabled}
          onAddSlice={handleAddSlice}
          onDeleteSlice={handleDeleteSlice}
        />

        {/* Right styling panel */}
        <PropertyPanel
          document={doc}
          selectedLayerIds={selectedLayerIds}
          onUpdateLayer={handleUpdateLayer}

          onCommitLayer={handleCommitLayer}

          onUpdateDocument={handleUpdateDocument}
          onCommitDocument={handleCommitDocument}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          onBringToFront={handleBringToFront}
          onSendToBack={handleSendToBack}
          onBringForward={handleBringForward}
          onSendBackward={handleSendBackward}
        />
      </main>

      {bulkPreviewUrl && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 100000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', width: '90%', height: '90%', borderRadius: '8px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>A4 PDF Layout Preview</h2>
              <button onClick={() => setBulkPreviewUrl(null)} style={{ padding: '8px 16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Close Preview</button>
            </div>
            <iframe src={bulkPreviewUrl} style={{ width: '100%', flex: 1, border: 'none' }} title="PDF Preview" />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

