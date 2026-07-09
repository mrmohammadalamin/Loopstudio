export type LayerType = 'text' | 'shape' | 'image' | 'icon' | 'drawing';

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // in degrees
  opacity: number; // 0 to 1
  locked: boolean;
  visible: boolean;
}

export interface FillProperties {
  fill?: string;
  fillType?: 'color' | 'linear-gradient' | 'radial-gradient' | 'mesh-gradient' | 'pattern';
  gradientColors?: [string, string]; // [startColor, endColor] - Legacy
  gradientStops?: { offset: number; color: string }[];
  meshPoints?: { x: number; y: number; color: string; radius: number }[];
  gradientAngle?: number; // angle in degrees for linear gradient
  radialGradientCenter?: { x: number; y: number; r: number }; // 0-100 percentage
  patternUrl?: string; // base64 or url for texture
  patternScale?: number; // 10 to 200
}

export interface TextLayer extends BaseLayer, FillProperties {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: 'normal' | 'bold' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
  fontStyle: 'normal' | 'italic';
  textDecoration: 'none' | 'underline';
  color: string;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  lineHeight: number; // multiplier, e.g., 1.2
  letterSpacing: number; // px, e.g., 0
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'star' | 'polygon' | 'line' | 'arrow';

export interface ShapeLayer extends BaseLayer, FillProperties {
  type: 'shape';
  shapeType: ShapeType;
  stroke: string;
  strokeWidth: number;
  cornerRadius?: number; // for rectangle
  sides?: number; // for polygon
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  src: string; // base64 / data URL or public URL
  brightness: number; // 0 to 200 (100 is default)
  contrast: number; // 0 to 200 (100 is default)
  saturation: number; // 0 to 200 (100 is default)
  blur: number; // 0 to 20 px
  grayscale: number; // 0 to 100
  sepia: number; // 0 to 100
  hueRotate: number; // 0 to 360 deg
  flipH: boolean;
  flipV: boolean;
  crop?: {
    x: number; // percentage or original px offset
    y: number;
    width: number;
    height: number;
  };
  bgRemoval?: {
    enabled: boolean;
    targetColor: string; // hex color e.g., "#ffffff"
    tolerance: number; // 0-100
  };
  bitmapFilter?: 'none' | 'oil' | 'sketch' | 'halftone' | 'pixelate' | 'duotone' | 'invert';
  duotoneColor1?: string;
  duotoneColor2?: string;
  chromaKey?: boolean;
  chromaColor?: string;  // hex chroma color e.g. '#00ff00'
  chromaSimilarity?: number; // 0-100
  chromaSmoothness?: number; // 0-100
}

export interface IconLayer extends BaseLayer {
  type: 'icon';
  iconName: string; // Name of Lucide icon, e.g., 'Heart'
  color: string;
  strokeWidth: number;
}

export interface DrawingLayer extends BaseLayer {
  type: 'drawing';
  points: { x: number; y: number }[];
  strokeColor: string;
  strokeWidth: number;
  brushStyle: string;
}

export type Layer = TextLayer | ShapeLayer | ImageLayer | IconLayer | DrawingLayer;

export interface CanvasSlice {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
}

export interface GraphicDocument {
  width: number;
  height: number;
  backgroundColor: string;
  layers: Layer[];
  unit?: 'px' | 'in' | 'mm' | 'cm';
  dpi?: number;
  slices?: CanvasSlice[];
}

export interface Preset {
  name: string;
  width: number;
  height: number;
  icon: string;
  description: string;
  category?: 'Web' | 'Print' | 'Banner';
}

