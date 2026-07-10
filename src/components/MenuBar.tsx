import React, { useState, useRef, useEffect } from 'react';
import * as Icons from 'lucide-react';
import type { GraphicDocument, Layer, ImageLayer } from '../types';

interface MenuBarProps {
  document: GraphicDocument;
  selectedLayerIds: string[];
  canUndo: boolean;
  canRedo: boolean;
  snapEnabled: boolean;
  setSnapEnabled: (val: boolean) => void;
  exportScale: number;
  setExportScale: (val: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onAddLayer: (layerData: Omit<Layer, 'id'>) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onBringForward: (id: string) => void;
  onSendBackward: (id: string) => void;
  onExport: (format: 'png' | 'jpeg' | 'webp' | 'gif' | 'bmp' | 'svg' | 'pdf' | 'psd' | 'ai' | 'cdr' | 'eps' | 'json') => void;
  onImportJSON: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSaveProject: (name: string) => void;
  activeTool: 'select' | 'draw' | 'crop' | 'slice' | 'magic-wand' | 'lasso';
  setActiveTool: (tool: 'select' | 'draw' | 'crop' | 'slice' | 'magic-wand' | 'lasso') => void;
  onClearCanvas: () => void;
  // Document resize
  onResizeDocument?: (w: number, h: number) => void;
  // Image adjustments on selected layer
  onApplyFilter?: (filter: string) => void;
  selectedLayer?: Layer | null;
  onUpdateLayer?: (id: string, updated: Partial<Layer>) => void;
}

type MenuId = 'file' | 'edit' | 'image' | 'layer' | 'type' | 'select' | 'filter' | 'view' | 'window';

export function MenuBar({
  document: doc,
  selectedLayerIds,
  canUndo,
  canRedo,
  snapEnabled,
  setSnapEnabled,
  exportScale,
  setExportScale,
  onUndo,
  onRedo,
  onAddLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onBringToFront,
  onSendToBack,
  onBringForward,
  onSendBackward,
  onExport,
  onImportJSON,
  onSaveProject,
  activeTool,
  setActiveTool,
  onClearCanvas,
  onResizeDocument,
  onUpdateLayer,
  selectedLayer,
}: MenuBarProps) {
  const [activeMenu, setActiveMenu] = useState<MenuId | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (menu: MenuId) => setActiveMenu(prev => prev === menu ? null : menu);
  const hover = (menu: MenuId) => { if (activeMenu !== null) setActiveMenu(menu); };
  const close = () => setActiveMenu(null);
  const act = (fn: () => void) => { fn(); close(); };

  // ─── File: import image ──────────────────────────────────────
  const importImage = () => {
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,image/svg+xml';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (!ev.target?.result) return;
        const img = new Image();
        img.onload = () => {
          const w = Math.min(img.width, doc.width);
          const h = Math.min(img.height, doc.height);
          onAddLayer({
            name: file.name.split('.')[0] || 'Image',
            type: 'image',
            x: Math.round((doc.width - w) / 2),
            y: Math.round((doc.height - h) / 2),
            width: w, height: h,
            rotation: 0, opacity: 1, locked: false, visible: true,
            src: ev.target?.result as string,
            brightness: 100, contrast: 100, saturation: 100,
            hueRotate: 0, blur: 0, grayscale: 0, sepia: 0,
            flipH: false, flipV: false,
          } as any);
        };
        img.src = ev.target.result as string;
      };
      reader.readAsDataURL(file);
    };
    input.click();
    close();
  };

  // ─── Image: canvas resize dialog ─────────────────────────────
  const promptResize = () => {
    const w = prompt('New canvas width (px):', String(doc.width));
    if (!w) return;
    const h = prompt('New canvas height (px):', String(doc.height));
    if (!h) return;
    if (onResizeDocument) onResizeDocument(parseInt(w), parseInt(h));
    close();
  };

  // ─── Image: quick adjustments via onUpdateLayer ───────────────
  const adjustLayer = (adj: Partial<Layer>) => {
    if (selectedLayerIds[0] && onUpdateLayer) {
      onUpdateLayer(selectedLayerIds[0], adj);
    }
    close();
  };

  // Selected image layer
  const imgLayer = selectedLayer?.type === 'image' ? selectedLayer as ImageLayer : null;

  return (
    <div className="menu-bar-container" ref={menuRef}>
      {/* Logo */}
      <div className="logo-section">
        <div className="logo-icon-box">L</div>
        <span className="logo-text">Loopstudio <span className="logo-badge">Pro</span></span>
      </div>

      {/* Menus */}
      <div className="menus-list">

        {/* ── FILE ───────────────────────────────────────────────── */}
        <div className="menu-item-wrapper">
          <button className={`menu-trigger-btn ${activeMenu==='file'?'active':''}`}
            onClick={()=>toggle('file')} onMouseEnter={()=>hover('file')}>File</button>
          {activeMenu==='file' && (
            <div className="menu-dropdown glass">
              <Btn icon={<Icons.FilePlus size={14}/>} label="New" shortcut="Ctrl+N"
                onClick={()=>act(()=>{ if(confirm('Create new canvas?')) onClearCanvas(); })} />
              <Btn icon={<Icons.FolderOpen size={14}/>} label="Open / Import Image..."
                onClick={importImage} />
              <label className="dropdown-action-btn" style={{cursor:'pointer'}}>
                <Icons.Upload size={14}/><span>Open JSON Project...</span>
                <input type="file" accept=".json"
                  onChange={(e)=>{onImportJSON(e);close();}} style={{display:'none'}}/>
              </label>
              <Divider/>
              <Btn icon={<Icons.Save size={14}/>} label="Save Project" shortcut="Ctrl+S"
                onClick={()=>act(()=>{const n=prompt('Project name:','Loopstudio Design');if(n) onSaveProject(n);})} />
              <Divider/>
              <SubMenu label="Export As..." icon={<Icons.Download size={14}/>}>
                <Btn label="PNG Image (.png)"       onClick={()=>act(()=>onExport('png'))} />
                <Btn label="JPEG Image (.jpg)"      onClick={()=>act(()=>onExport('jpeg'))} />
                <Btn label="WebP Image (.webp)"     onClick={()=>act(()=>onExport('webp'))} />
                <Btn label="BMP Image (.bmp)"       onClick={()=>act(()=>onExport('bmp'))} />
                <Btn label="GIF Animation (.gif)"   onClick={()=>act(()=>onExport('gif'))} />
                <Btn label="SVG Vector (.svg)"      onClick={()=>act(()=>onExport('svg'))} />
                <Btn label="PDF Document (.pdf)"    onClick={()=>act(()=>onExport('pdf'))} />
                <Divider/>
                <Btn label="Photoshop PSD (.psd)"   onClick={()=>act(()=>onExport('psd'))} />
                <Btn label="Illustrator AI (.ai)"   onClick={()=>act(()=>onExport('ai'))} />
                <Btn label="CorelDraw CDR (.cdr)"   onClick={()=>act(()=>onExport('cdr'))} />
                <Btn label="EPS Vector (.eps)"      onClick={()=>act(()=>onExport('eps'))} />
                <Btn label="JSON Project (.json)"   onClick={()=>act(()=>onExport('json'))} />
              </SubMenu>
              <Divider/>
              <SubMenu label="Export Scale" icon={<Icons.Maximize2 size={14}/>}>
                {([1,2,3,4] as const).map(s=>(
                  <Btn key={s} label={`${s}× ${s===1?'(72 DPI Web)':s===2?'(150 DPI Screen)':s===3?'(225 DPI Poster)':'(300 DPI Print)'}`}
                    check={exportScale===s} onClick={()=>act(()=>setExportScale(s))} />
                ))}
              </SubMenu>
            </div>
          )}
        </div>

        {/* ── EDIT ───────────────────────────────────────────────── */}
        <div className="menu-item-wrapper">
          <button className={`menu-trigger-btn ${activeMenu==='edit'?'active':''}`}
            onClick={()=>toggle('edit')} onMouseEnter={()=>hover('edit')}>Edit</button>
          {activeMenu==='edit' && (
            <div className="menu-dropdown glass">
              <Btn icon={<Icons.Undo2 size={14}/>} label="Undo" shortcut="Ctrl+Z"
                disabled={!canUndo} onClick={()=>act(onUndo)} />
              <Btn icon={<Icons.Redo2 size={14}/>} label="Redo" shortcut="Ctrl+Y"
                disabled={!canRedo} onClick={()=>act(onRedo)} />
              <Divider/>
              <Btn icon={<Icons.Copy size={14}/>} label="Copy Layer" shortcut="Ctrl+C"
                disabled={!selectedLayerIds[0]} onClick={()=>act(()=>selectedLayerIds[0]&&onDuplicateLayer(selectedLayerIds[0]))} />
              <Btn icon={<Icons.ClipboardCopy size={14}/>} label="Duplicate Layer" shortcut="Ctrl+D"
                disabled={!selectedLayerIds[0]} onClick={()=>act(()=>selectedLayerIds[0]&&onDuplicateLayer(selectedLayerIds[0]))} />
              <Btn icon={<Icons.Trash2 size={14}/>} label="Delete Layer" shortcut="Del"
                disabled={!selectedLayerIds[0]} danger
                onClick={()=>act(()=>selectedLayerIds[0]&&onDeleteLayer(selectedLayerIds[0]))} />
              <Divider/>
              <Btn icon={<Icons.FlipHorizontal size={14}/>} label="Flip Horizontal"
                disabled={!imgLayer}
                onClick={()=>act(()=>adjustLayer({flipH:!(imgLayer?.flipH)}))} />
              <Btn icon={<Icons.FlipVertical size={14}/>} label="Flip Vertical"
                disabled={!imgLayer}
                onClick={()=>act(()=>adjustLayer({flipV:!(imgLayer?.flipV)}))} />
              <Divider/>
              <SubMenu label="Transform" icon={<Icons.RefreshCcw size={14}/>}>
                <Btn label="Rotate 90° CW"  disabled={!selectedLayerIds[0]}
                  onClick={()=>act(()=>selectedLayerIds[0]&&onUpdateLayer?.(selectedLayerIds[0],{rotation:((selectedLayer?.rotation||0)+90)%360}))} />
                <Btn label="Rotate 90° CCW" disabled={!selectedLayerIds[0]}
                  onClick={()=>act(()=>selectedLayerIds[0]&&onUpdateLayer?.(selectedLayerIds[0],{rotation:((selectedLayer?.rotation||0)+270)%360}))} />
                <Btn label="Rotate 180°"    disabled={!selectedLayerIds[0]}
                  onClick={()=>act(()=>selectedLayerIds[0]&&onUpdateLayer?.(selectedLayerIds[0],{rotation:((selectedLayer?.rotation||0)+180)%360}))} />
              </SubMenu>
            </div>
          )}
        </div>

        {/* ── IMAGE ───────────────────────────────────────────────── */}
        <div className="menu-item-wrapper">
          <button className={`menu-trigger-btn ${activeMenu==='image'?'active':''}`}
            onClick={()=>toggle('image')} onMouseEnter={()=>hover('image')}>Image</button>
          {activeMenu==='image' && (
            <div className="menu-dropdown glass">
              <Btn icon={<Icons.Crop size={14}/>} label="Crop Mode"
                check={activeTool==='crop'} onClick={()=>act(()=>setActiveTool('crop'))} />
              <Btn icon={<Icons.Scissors size={14}/>} label="Slice Mode"
                check={activeTool==='slice'} onClick={()=>act(()=>setActiveTool('slice'))} />
              <Divider/>
              <Btn icon={<Icons.Maximize size={14}/>} label="Canvas Size..."
                onClick={()=>act(promptResize)} />
              <Divider/>
              <SubMenu label="Mode" icon={<Icons.Layers size={14}/>}>
                <Btn label="RGB Color (Default)"    onClick={close} check />
                <Btn label="CMYK (Print Preview)"   disabled onClick={close} />
                <Btn label="Grayscale"
                  onClick={()=>act(()=>adjustLayer({bitmapFilter:'none',saturation:0}))} />
              </SubMenu>
              <Divider/>
              <SubMenu label="Adjustments" icon={<Icons.SlidersHorizontal size={14}/>}>
                <Btn label="Brightness / Contrast..."
                  onClick={()=>act(()=>{const v=prompt('Brightness (0-200):',String(imgLayer?.brightness||100));if(v&&onUpdateLayer&&selectedLayerIds[0]) onUpdateLayer(selectedLayerIds[0],{brightness:+v});})} />
                <Btn label="Hue / Saturation..."
                  onClick={()=>act(()=>{const v=prompt('Saturation (0-200):',String(imgLayer?.saturation||100));if(v&&onUpdateLayer&&selectedLayerIds[0]) onUpdateLayer(selectedLayerIds[0],{saturation:+v});})} />
                <Btn label="Color Balance / Hue Rotate..."
                  onClick={()=>act(()=>{const v=prompt('Hue Rotate (0-360°):',String(imgLayer?.hueRotate||0));if(v&&onUpdateLayer&&selectedLayerIds[0]) onUpdateLayer(selectedLayerIds[0],{hueRotate:+v});})} />
                <Divider/>
                <Btn label="Grayscale"     onClick={()=>act(()=>adjustLayer({saturation:0}))} />
                <Btn label="Sepia Tone"    onClick={()=>act(()=>adjustLayer({sepia:80,saturation:60}))} />
                <Btn label="Invert Colors" onClick={()=>act(()=>adjustLayer({bitmapFilter:'invert'}))} />
                <Btn label="Desaturate"    onClick={()=>act(()=>adjustLayer({saturation:20}))} />
              </SubMenu>
              <Divider/>
              <SubMenu label="Image Rotation" icon={<Icons.RotateCw size={14}/>}>
                <Btn label="90° Clockwise"     disabled={!selectedLayerIds[0]}
                  onClick={()=>act(()=>selectedLayerIds[0]&&onUpdateLayer?.(selectedLayerIds[0],{rotation:((selectedLayer?.rotation||0)+90)%360}))} />
                <Btn label="90° Counter-Clockwise" disabled={!selectedLayerIds[0]}
                  onClick={()=>act(()=>selectedLayerIds[0]&&onUpdateLayer?.(selectedLayerIds[0],{rotation:((selectedLayer?.rotation||0)+270)%360}))} />
                <Btn label="180°"              disabled={!selectedLayerIds[0]}
                  onClick={()=>act(()=>selectedLayerIds[0]&&onUpdateLayer?.(selectedLayerIds[0],{rotation:((selectedLayer?.rotation||0)+180)%360}))} />
              </SubMenu>
            </div>
          )}
        </div>

        {/* ── LAYER ───────────────────────────────────────────────── */}
        <div className="menu-item-wrapper">
          <button className={`menu-trigger-btn ${activeMenu==='layer'?'active':''}`}
            onClick={()=>toggle('layer')} onMouseEnter={()=>hover('layer')}>Layer</button>
          {activeMenu==='layer' && (
            <div className="menu-dropdown glass">
              <Btn icon={<Icons.Plus size={14}/>} label="New Layer" shortcut="Ctrl+Shift+N"
                onClick={()=>act(()=>onAddLayer({name:'New Layer',type:'shape',x:50,y:50,width:200,height:200,rotation:0,opacity:1,locked:false,visible:true,shapeType:'rectangle',fill:'#6366f1',stroke:'none',strokeWidth:0} as any))} />
              <Btn icon={<Icons.Copy size={14}/>} label="Duplicate Layer" shortcut="Ctrl+J"
                disabled={!selectedLayerIds[0]} onClick={()=>act(()=>selectedLayerIds[0]&&onDuplicateLayer(selectedLayerIds[0]))} />
              <Btn icon={<Icons.Trash2 size={14}/>} label="Delete Layer" danger
                disabled={!selectedLayerIds[0]} onClick={()=>act(()=>selectedLayerIds[0]&&onDeleteLayer(selectedLayerIds[0]))} />
              <Divider/>
              <SubMenu label="Arrange" icon={<Icons.Layers3 size={14}/>}>
                <Btn icon={<Icons.ChevronsUp size={14}/>} label="Bring to Front"   shortcut="Ctrl+Shift+]"
                  disabled={!selectedLayerIds[0]} onClick={()=>act(()=>selectedLayerIds[0]&&onBringToFront(selectedLayerIds[0]))} />
                <Btn icon={<Icons.ChevronUp size={14}/>} label="Bring Forward"     shortcut="Ctrl+]"
                  disabled={!selectedLayerIds[0]} onClick={()=>act(()=>selectedLayerIds[0]&&onBringForward(selectedLayerIds[0]))} />
                <Btn icon={<Icons.ChevronDown size={14}/>} label="Send Backward"   shortcut="Ctrl+["
                  disabled={!selectedLayerIds[0]} onClick={()=>act(()=>selectedLayerIds[0]&&onSendBackward(selectedLayerIds[0]))} />
                <Btn icon={<Icons.ChevronsDown size={14}/>} label="Send to Back"   shortcut="Ctrl+Shift+["
                  disabled={!selectedLayerIds[0]} onClick={()=>act(()=>selectedLayerIds[0]&&onSendToBack(selectedLayerIds[0]))} />
              </SubMenu>
              <Divider/>
              <SubMenu label="New Shape Layer" icon={<Icons.Shapes size={14}/>}>
                <Btn label="Rectangle"  onClick={()=>act(()=>onAddLayer({name:'Rectangle',type:'shape',x:80,y:80,width:200,height:120,rotation:0,opacity:1,locked:false,visible:true,shapeType:'rectangle',fill:'#6366f1',stroke:'none',strokeWidth:0} as any))} />
                <Btn label="Ellipse"    onClick={()=>act(()=>onAddLayer({name:'Ellipse',type:'shape',x:80,y:80,width:180,height:180,rotation:0,opacity:1,locked:false,visible:true,shapeType:'circle',fill:'#ec4899',stroke:'none',strokeWidth:0} as any))} />
                <Btn label="Triangle"   onClick={()=>act(()=>onAddLayer({name:'Triangle',type:'shape',x:80,y:80,width:180,height:180,rotation:0,opacity:1,locked:false,visible:true,shapeType:'triangle',fill:'#f59e0b',stroke:'none',strokeWidth:0} as any))} />
                <Btn label="Star"       onClick={()=>act(()=>onAddLayer({name:'Star',type:'shape',x:80,y:80,width:180,height:180,rotation:0,opacity:1,locked:false,visible:true,shapeType:'star',fill:'#10b981',stroke:'none',strokeWidth:0} as any))} />
                <Btn label="Polygon"    onClick={()=>act(()=>onAddLayer({name:'Polygon',type:'shape',x:80,y:80,width:180,height:180,rotation:0,opacity:1,locked:false,visible:true,shapeType:'polygon',fill:'#8b5cf6',stroke:'none',strokeWidth:0,sides:6} as any))} />
                <Btn label="Line"       onClick={()=>act(()=>onAddLayer({name:'Line',type:'shape',x:80,y:140,width:300,height:4,rotation:0,opacity:1,locked:false,visible:true,shapeType:'line',fill:'none',stroke:'#ffffff',strokeWidth:3} as any))} />
              </SubMenu>
              <SubMenu label="New Text Layer" icon={<Icons.Type size={14}/>}>
                <Btn label="Heading"    onClick={()=>act(()=>onAddLayer({name:'Heading',type:'text',x:60,y:60,width:400,height:80,rotation:0,opacity:1,locked:false,visible:true,text:'Your Heading',fontSize:48,fontFamily:'Inter',fontWeight:'700',fontStyle:'normal',textDecoration:'none',color:'#ffffff',textAlign:'center',lineHeight:1.2,letterSpacing:0,strokeColor:'transparent',strokeWidth:0,shadowColor:'transparent',shadowBlur:0,shadowOffsetX:0,shadowOffsetY:0} as any))} />
                <Btn label="Body Text"  onClick={()=>act(()=>onAddLayer({name:'Body Text',type:'text',x:60,y:200,width:400,height:60,rotation:0,opacity:1,locked:false,visible:true,text:'Body text here...',fontSize:18,fontFamily:'Inter',fontWeight:'400',fontStyle:'normal',textDecoration:'none',color:'#cbd5e1',textAlign:'left',lineHeight:1.6,letterSpacing:0,strokeColor:'transparent',strokeWidth:0,shadowColor:'transparent',shadowBlur:0,shadowOffsetX:0,shadowOffsetY:0} as any))} />
              </SubMenu>
            </div>
          )}
        </div>

        {/* ── TYPE ───────────────────────────────────────────────── */}
        <div className="menu-item-wrapper">
          <button className={`menu-trigger-btn ${activeMenu==='type'?'active':''}`}
            onClick={()=>toggle('type')} onMouseEnter={()=>hover('type')}>Type</button>
          {activeMenu==='type' && (
            <div className="menu-dropdown glass">
              <Btn icon={<Icons.Type size={14}/>} label="Add Text Layer" shortcut="T"
                onClick={()=>act(()=>onAddLayer({name:'Text',type:'text',x:100,y:100,width:300,height:60,rotation:0,opacity:1,locked:false,visible:true,text:'Your Text Here',fontSize:32,fontFamily:'Inter',fontWeight:'700',fontStyle:'normal',textDecoration:'none',color:'#ffffff',textAlign:'center',lineHeight:1.3,letterSpacing:0,strokeColor:'transparent',strokeWidth:0,shadowColor:'transparent',shadowBlur:0,shadowOffsetX:0,shadowOffsetY:0} as any))} />
              <Divider/>
              <label className="dropdown-section-label">Font Families</label>
              {['Inter','Roboto','Outfit','Montserrat','Playfair Display','Bebas Neue','Dancing Script','Orbitron'].map(f=>(
                <Btn key={f} label={f}
                  onClick={()=>act(()=>selectedLayerIds[0]&&selectedLayer?.type==='text'&&onUpdateLayer?.(selectedLayerIds[0],{fontFamily:f}))} />
              ))}
              <Divider/>
              <SubMenu label="Text Style" icon={<Icons.Bold size={14}/>}>
                <Btn label="Bold"        onClick={()=>act(()=>selectedLayerIds[0]&&onUpdateLayer?.(selectedLayerIds[0],{fontWeight:'700'}))} />
                <Btn label="Regular"     onClick={()=>act(()=>selectedLayerIds[0]&&onUpdateLayer?.(selectedLayerIds[0],{fontWeight:'400'}))} />
                <Btn label="Light"       onClick={()=>act(()=>selectedLayerIds[0]&&onUpdateLayer?.(selectedLayerIds[0],{fontWeight:'300'}))} />
                <Btn label="Italic"      onClick={()=>act(()=>selectedLayerIds[0]&&onUpdateLayer?.(selectedLayerIds[0],{fontStyle:'italic'}))} />
                <Btn label="Underline"   onClick={()=>act(()=>selectedLayerIds[0]&&onUpdateLayer?.(selectedLayerIds[0],{textDecoration:'underline'}))} />
              </SubMenu>
            </div>
          )}
        </div>

        {/* ── SELECT ─────────────────────────────────────────────── */}
        <div className="menu-item-wrapper">
          <button className={`menu-trigger-btn ${activeMenu==='select'?'active':''}`}
            onClick={()=>toggle('select')} onMouseEnter={()=>hover('select')}>Select</button>
          {activeMenu==='select' && (
            <div className="menu-dropdown glass">
              <Btn icon={<Icons.MousePointer size={14}/>} label="Selection Tool (Move)"
                check={activeTool==='select'} onClick={()=>act(()=>setActiveTool('select'))} />
              <Btn icon={<Icons.Brush size={14}/>} label="Brush / Draw Tool"
                check={activeTool==='draw'}   onClick={()=>act(()=>setActiveTool('draw'))} />
              <Btn icon={<Icons.Crop size={14}/>} label="Crop Tool"
                check={activeTool==='crop'}   onClick={()=>act(()=>setActiveTool('crop'))} />
              <Btn icon={<Icons.Scissors size={14}/>} label="Slice Tool"
                check={activeTool==='slice'}  onClick={()=>act(()=>setActiveTool('slice'))} />
              <Btn icon={<Icons.Wand2 size={14}/>} label="Magic Wand (Extract Background)"
                check={activeTool==='magic-wand'} onClick={()=>act(()=>setActiveTool('magic-wand'))} />
              <Btn icon={<Icons.Lasso size={14}/>} label="Lasso Cut Tool"
                check={activeTool==='lasso'} onClick={()=>act(()=>setActiveTool('lasso'))} />
            </div>
          )}
        </div>

        {/* ── FILTER ─────────────────────────────────────────────── */}
        <div className="menu-item-wrapper">
          <button className={`menu-trigger-btn ${activeMenu==='filter'?'active':''}`}
            onClick={()=>toggle('filter')} onMouseEnter={()=>hover('filter')}>Filter</button>
          {activeMenu==='filter' && (
            <div className="menu-dropdown glass">
              <label className="dropdown-section-label">Bitmap Filters</label>
              <Btn label="None (Original)"     disabled={!imgLayer} onClick={()=>act(()=>adjustLayer({bitmapFilter:'none'}))} />
              <Btn label="Oil Painting"        disabled={!imgLayer} onClick={()=>act(()=>adjustLayer({bitmapFilter:'oil'}))} />
              <Btn label="Pencil Sketch"       disabled={!imgLayer} onClick={()=>act(()=>adjustLayer({bitmapFilter:'sketch'}))} />
              <Btn label="Halftone"            disabled={!imgLayer} onClick={()=>act(()=>adjustLayer({bitmapFilter:'halftone'}))} />
              <Btn label="Pixelate"            disabled={!imgLayer} onClick={()=>act(()=>adjustLayer({bitmapFilter:'pixelate'}))} />
              <Btn label="Duotone"             disabled={!imgLayer} onClick={()=>act(()=>adjustLayer({bitmapFilter:'duotone'}))} />
              <Btn label="Invert"              disabled={!imgLayer} onClick={()=>act(()=>adjustLayer({bitmapFilter:'invert'}))} />
              <Divider/>
              <label className="dropdown-section-label">Blur & Sharpen</label>
              <Btn label="Gaussian Blur..."    disabled={!imgLayer}
                onClick={()=>act(()=>{const v=prompt('Blur (0-20px):',String(imgLayer?.blur||0));if(v&&onUpdateLayer&&selectedLayerIds[0]) onUpdateLayer(selectedLayerIds[0],{blur:+v});})} />
              <Divider/>
              <label className="dropdown-section-label">Color Effects</label>
              <Btn label="Grayscale"           onClick={()=>act(()=>adjustLayer({saturation:0}))} disabled={!imgLayer} />
              <Btn label="Sepia"               onClick={()=>act(()=>adjustLayer({sepia:80}))} disabled={!imgLayer} />
              <Btn label="Vivid (High Sat)"    onClick={()=>act(()=>adjustLayer({saturation:180,contrast:110}))} disabled={!imgLayer} />
              <Btn label="Cold Blue"           onClick={()=>act(()=>adjustLayer({hueRotate:220,saturation:120}))} disabled={!imgLayer} />
              <Btn label="Warm Orange"         onClick={()=>act(()=>adjustLayer({hueRotate:30,saturation:130}))} disabled={!imgLayer} />
              <Btn label="Purple Dream"        onClick={()=>act(()=>adjustLayer({hueRotate:280,saturation:140}))} disabled={!imgLayer} />
            </div>
          )}
        </div>

        {/* ── VIEW ───────────────────────────────────────────────── */}
        <div className="menu-item-wrapper">
          <button className={`menu-trigger-btn ${activeMenu==='view'?'active':''}`}
            onClick={()=>toggle('view')} onMouseEnter={()=>hover('view')}>View</button>
          {activeMenu==='view' && (
            <div className="menu-dropdown glass">
              <Btn icon={<Icons.ZoomIn size={14}/>}  label="Zoom In"  shortcut="Ctrl++" onClick={close} />
              <Btn icon={<Icons.ZoomOut size={14}/>} label="Zoom Out" shortcut="Ctrl+-" onClick={close} />
              <Btn icon={<Icons.Maximize2 size={14}/>} label="Fit to Screen" shortcut="Ctrl+0" onClick={close} />
              <Divider/>
              <Btn icon={<Icons.Magnet size={14}/>} label="Snap to Guides"
                check={snapEnabled} onClick={()=>act(()=>setSnapEnabled(!snapEnabled))} />
              <Divider/>
              <SubMenu label="Color Proof" icon={<Icons.Palette size={14}/>}>
                <Btn label="None (RGB Screen)" check onClick={close} />
                <Btn label="CMYK Print Preview" disabled onClick={close} />
                <Btn label="Grayscale" disabled onClick={close} />
              </SubMenu>
            </div>
          )}
        </div>

        {/* ── WINDOW ─────────────────────────────────────────────── */}
        <div className="menu-item-wrapper">
          <button className={`menu-trigger-btn ${activeMenu==='window'?'active':''}`}
            onClick={()=>toggle('window')} onMouseEnter={()=>hover('window')}>Window</button>
          {activeMenu==='window' && (
            <div className="menu-dropdown glass">
              <label className="dropdown-section-label">Panels</label>
              <Btn icon={<Icons.Layers size={14}/>} label="Layers" check onClick={close} />
              <Btn icon={<Icons.SlidersHorizontal size={14}/>} label="Properties" check onClick={close} />
              <Btn icon={<Icons.LayoutGrid size={14}/>} label="Templates" check onClick={close} />
              <Btn icon={<Icons.Brush size={14}/>} label="Brush Settings" check onClick={close} />
            </div>
          )}
        </div>

      </div>{/* end menus-list */}

      {/* Right status */}
      <div className="menu-right-info">
        <span className="doc-dimensions-badge">{doc.width}×{doc.height}px · {doc.dpi||72}dpi</span>
        {snapEnabled && (
          <span className="snap-status-badge"><Icons.Magnet size={12}/>Snap</span>
        )}
        <span className="export-scale-badge">{exportScale}× Export</span>
      </div>
    </div>
  );
}

/* ─── Helper sub-components ─────────────────────────────────────── */

function Btn({
  icon, label, shortcut, onClick, disabled = false, danger = false, check = false,
}: {
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  check?: boolean;
}) {
  return (
    <button
      className={`dropdown-action-btn ${danger ? 'danger-btn' : ''} ${check ? 'checked-btn' : ''}`}
      disabled={disabled}
      onClick={onClick}
    >
      {check && <Icons.Check size={12} className="check-icon" />}
      {!check && icon && icon}
      {!check && !icon && <span style={{ width: 14 }} />}
      <span>{label}</span>
      {shortcut && <span className="menu-shortcut">{shortcut}</span>}
    </button>
  );
}

function Divider() {
  return <div className="dropdown-divider" />;
}

function SubMenu({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="submenu-parent">
      <span className="dropdown-action-btn justify-between">
        <span className="flex-align">
          {icon}
          <span>{label}</span>
        </span>
        <Icons.ChevronRight size={12} />
      </span>
      <div className="menu-submenu glass">{children}</div>
    </div>
  );
}
