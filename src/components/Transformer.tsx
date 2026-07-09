import React, { useRef } from 'react';
import type { Layer } from '../types';

interface TransformerProps {
  layer: Layer;
  zoom: number;
  onTransform: (updatedLayer: Partial<Layer>) => void;
  // Now receives the final committed transform so Canvas can commit without reading stale doc
  onTransformEnd: (finalTransform: Partial<Layer>) => void;
  canvasBounds: DOMRect | null;
}

export const Transformer: React.FC<TransformerProps> = ({
  layer,
  zoom,
  onTransform,
  onTransformEnd,
  canvasBounds,
}) => {
  const isTransforming = useRef(false);

  // Math helper: rotate a point around center
  const rotatePoint = (x: number, y: number, cx: number, cy: number, angleDegrees: number) => {
    const angleRadians = (angleDegrees * Math.PI) / 180;
    const cos = Math.cos(angleRadians);
    const sin = Math.sin(angleRadians);
    const dx = x - cx;
    const dy = y - cy;
    return {
      x: cx + dx * cos - dy * sin,
      y: cy + dx * sin + dy * cos,
    };
  };

  const handleRotateStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isTransforming.current = true;

    if (!canvasBounds) return;

    // Capture layer center at start of rotation
    const cx = layer.x + layer.width / 2;
    const cy = layer.y + layer.height / 2;

    // Track final rotation in a mutable object — avoids stale closure
    const finalTransform: Partial<Layer> = { rotation: layer.rotation };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const mouseX = (moveEvent.clientX - canvasBounds.left) / zoom;
      const mouseY = (moveEvent.clientY - canvasBounds.top) / zoom;

      const dx = mouseX - cx;
      const dy = mouseY - cy;

      const angleRad = Math.atan2(dy, dx);
      let angleDeg = (angleRad * 180) / Math.PI - 90;

      if (moveEvent.shiftKey) {
        angleDeg = Math.round(angleDeg / 45) * 45;
      }

      angleDeg = ((angleDeg % 360) + 360) % 360;
      finalTransform.rotation = Math.round(angleDeg);
      onTransform({ rotation: finalTransform.rotation });
    };

    const handleMouseUp = () => {
      isTransforming.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      // Pass the final rotation directly — no stale doc read needed
      onTransformEnd(finalTransform);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    e.preventDefault();
    isTransforming.current = true;

    if (!canvasBounds) return;

    const startX = layer.x;
    const startY = layer.y;
    const startW = layer.width;
    const startH = layer.height;
    const startRotation = layer.rotation;
    const rad = (startRotation * Math.PI) / 180;

    const mouseStartClientX = e.clientX;
    const mouseStartClientY = e.clientY;

    // Fixed corner in local coordinates (the anchor that doesn't move)
    let fixedLocalX = 0;
    let fixedLocalY = 0;
    switch (handle) {
      case 'se': fixedLocalX = 0;        fixedLocalY = 0;         break;
      case 'sw': fixedLocalX = startW;   fixedLocalY = 0;         break;
      case 'ne': fixedLocalX = 0;        fixedLocalY = startH;    break;
      case 'nw': fixedLocalX = startW;   fixedLocalY = startH;    break;
      case 'e':  fixedLocalX = 0;        fixedLocalY = startH/2;  break;
      case 'w':  fixedLocalX = startW;   fixedLocalY = startH/2;  break;
      case 's':  fixedLocalX = startW/2; fixedLocalY = 0;         break;
      case 'n':  fixedLocalX = startW/2; fixedLocalY = startH;    break;
    }

    // World-space coordinates of that fixed anchor
    const startCenter = { x: startX + startW / 2, y: startY + startH / 2 };
    const fixedScreen = rotatePoint(
      startX + fixedLocalX,
      startY + fixedLocalY,
      startCenter.x,
      startCenter.y,
      startRotation
    );

    // Mutable object to track the final committed transform — eliminates stale closure
    const finalTransform: Partial<Layer> = { x: startX, y: startY, width: startW, height: startH, rotation: startRotation };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dxScreen = (moveEvent.clientX - mouseStartClientX) / zoom;
      const dyScreen = (moveEvent.clientY - mouseStartClientY) / zoom;

      // Rotate delta into local coordinate space
      const cosRad = Math.cos(-rad);
      const sinRad = Math.sin(-rad);
      const dxLocal = dxScreen * cosRad - dyScreen * sinRad;
      const dyLocal = dxScreen * sinRad + dyScreen * cosRad;

      let newW = startW;
      let newH = startH;

      switch (handle) {
        case 'se': newW = startW + dxLocal; newH = startH + dyLocal; break;
        case 'sw': newW = startW - dxLocal; newH = startH + dyLocal; break;
        case 'ne': newW = startW + dxLocal; newH = startH - dyLocal; break;
        case 'nw': newW = startW - dxLocal; newH = startH - dyLocal; break;
        case 'e':  newW = startW + dxLocal; break;
        case 'w':  newW = startW - dxLocal; break;
        case 's':  newH = startH + dyLocal; break;
        case 'n':  newH = startH - dyLocal; break;
      }

      const minSize = 10;
      if (newW < minSize) newW = minSize;
      if (newH < minSize) newH = minSize;

      // Proportional lock for images/icons or when Shift held
      const isCorner = ['se','sw','ne','nw'].includes(handle);
      if ((moveEvent.shiftKey || layer.type === 'image' || layer.type === 'icon') && isCorner) {
        const ratio = startW / startH;
        if (Math.abs(newW - startW) > Math.abs(newH - startH)) {
          newH = newW / ratio;
        } else {
          newW = newH * ratio;
        }
      }

      // Re-compute the new fixed anchor offset in local space
      let newFixedLocalX = 0;
      let newFixedLocalY = 0;
      switch (handle) {
        case 'se': newFixedLocalX = 0;      newFixedLocalY = 0;      break;
        case 'sw': newFixedLocalX = newW;   newFixedLocalY = 0;      break;
        case 'ne': newFixedLocalX = 0;      newFixedLocalY = newH;   break;
        case 'nw': newFixedLocalX = newW;   newFixedLocalY = newH;   break;
        case 'e':  newFixedLocalX = 0;      newFixedLocalY = newH/2; break;
        case 'w':  newFixedLocalX = newW;   newFixedLocalY = newH/2; break;
        case 's':  newFixedLocalX = newW/2; newFixedLocalY = 0;      break;
        case 'n':  newFixedLocalX = newW/2; newFixedLocalY = newH;   break;
      }

      // Offset from fixed anchor to center in local space
      const offsetLocal = { x: newW / 2 - newFixedLocalX, y: newH / 2 - newFixedLocalY };

      // Rotate offset back to world space
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const offsetScreen = {
        x: offsetLocal.x * cos - offsetLocal.y * sin,
        y: offsetLocal.x * sin + offsetLocal.y * cos,
      };

      // New center = fixed world anchor + rotated offset
      const newCenter = { x: fixedScreen.x + offsetScreen.x, y: fixedScreen.y + offsetScreen.y };

      const newX = Math.round(newCenter.x - newW / 2);
      const newY = Math.round(newCenter.y - newH / 2);

      // Keep finalTransform updated with every move
      finalTransform.x = newX;
      finalTransform.y = newY;
      finalTransform.width = Math.round(newW);
      finalTransform.height = Math.round(newH);

      onTransform(finalTransform);
    };

    const handleMouseUp = () => {
      isTransforming.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      // Pass final transform directly — no stale closure on doc needed in parent
      onTransformEnd(finalTransform);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleStyles = {
    left: `${layer.x}px`,
    top: `${layer.y}px`,
    width: `${layer.width}px`,
    height: `${layer.height}px`,
    transform: `rotate(${layer.rotation}deg)`,
  };

  return (
    <div className="transformer-box" style={handleStyles}>
      {/* Corner Handles */}
      <div className="transform-handle nw" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
      <div className="transform-handle ne" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
      <div className="transform-handle se" onMouseDown={(e) => handleResizeStart(e, 'se')} />
      <div className="transform-handle sw" onMouseDown={(e) => handleResizeStart(e, 'sw')} />

      {/* Edge Handles */}
      {!['text'].includes(layer.type) && (
        <>
          <div className="transform-handle n" onMouseDown={(e) => handleResizeStart(e, 'n')} />
          <div className="transform-handle s" onMouseDown={(e) => handleResizeStart(e, 's')} />
          <div className="transform-handle e" onMouseDown={(e) => handleResizeStart(e, 'e')} />
          <div className="transform-handle w" onMouseDown={(e) => handleResizeStart(e, 'w')} />
        </>
      )}

      {/* Rotation Arm & Handle */}
      <div className="transform-rotation-arm" />
      <div className="transform-rotation-handle" onMouseDown={handleRotateStart} />
    </div>
  );
};
