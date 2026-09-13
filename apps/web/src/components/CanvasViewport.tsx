import React, { useRef, useEffect, useState } from 'react';
import {
  BackgroundSettings,
  PhotoBasicSettings,
  PhotoColorSettings,
  PhotoDetailSettings,
  PhotoTransformSettings,
  ProductShadowSettings,
  WatermarkSettings,
} from '@pixellift/types';
import { Eye } from 'lucide-react';

interface CanvasViewportProps {
  originalImage: string;
  processedImage: string | null;
  maskCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  backgroundSettings: BackgroundSettings;
  basicSettings: PhotoBasicSettings;
  colorSettings: PhotoColorSettings;
  detailSettings: PhotoDetailSettings;
  transformSettings: PhotoTransformSettings;
  shadowSettings?: ProductShadowSettings;
  watermarkSettings?: WatermarkSettings;
  refinementEnabled: boolean;
  brushMode: 'erase' | 'restore';
  brushSize: number;
  brushSoftness: number;
  zoomLevel: number;
  previewMode: 'original' | 'transparent' | 'background' | 'final';
  onChangePreviewMode: (mode: 'original' | 'transparent' | 'background' | 'final') => void;
  onCanvasRendered?: (dataUrl: string) => void;
  onRefinementCommitted?: (dataUrl:string)=>void;
}


function toneCanvas(source:CanvasImageSource,width:number,height:number,basic:PhotoBasicSettings,color:PhotoColorSettings,detail:PhotoDetailSettings) {
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d')!;ctx.drawImage(source,0,0,width,height);
 if(!basic.highlights&&!basic.shadows&&!basic.whites&&!basic.blacks&&!color.temperature&&!color.tint&&!color.colorIntensity&&!detail.grain&&!detail.clarity)return canvas;
 const pixels=ctx.getImageData(0,0,width,height),p=pixels.data;
 for(let i=0;i<p.length;i+=4) {
  if(!p[i+3])continue;
  const luminance=(p[i]*.2126+p[i+1]*.7152+p[i+2]*.0722)/255;
  const bright=luminance*luminance,dark=(1-luminance)*(1-luminance);
  const tone=(basic.highlights*bright+basic.shadows*dark+basic.whites*Math.pow(luminance,4)+basic.blacks*Math.pow(1-luminance,4))*.65;
  const saturation=1+(color.colorIntensity||0)/100;
  const grain=((((i*1664525+1013904223)>>>0)%1024)/1023-.5)*(detail.grain||0)*.6;
  const contrast=1+(detail.clarity||0)/180;
  const adjustments=[(color.temperature||0)*.42+(color.tint||0)*.15,-(color.tint||0)*.3,-(color.temperature||0)*.42+(color.tint||0)*.15];
  for(let c=0;c<3;c++)p[i+c]=Math.max(0,Math.min(255,((luminance*255+(p[i+c]-luminance*255)*saturation+tone+adjustments[c])-128)*contrast+128+grain));
 }
 ctx.putImageData(pixels,0,0);return canvas;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  originalImage,
  processedImage,
  maskCanvasRef,
  backgroundSettings,
  basicSettings,
  colorSettings,
  detailSettings,
  transformSettings,
  shadowSettings,
  watermarkSettings,
  refinementEnabled,
  brushMode,
  brushSize,
  brushSoftness,
  zoomLevel,
  previewMode,
  onChangePreviewMode,
  onCanvasRendered,
  onRefinementCommitted,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isHoldOriginal, setIsHoldOriginal] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const origImgRef = useRef<HTMLImageElement | null>(null);
  const procImgRef = useRef<HTMLImageElement | null>(null);
  const customBgImgRef = useRef<HTMLImageElement | null>(null);
  const watermarkImgRef = useRef<HTMLImageElement | null>(null);

  // Load images
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      origImgRef.current = img;
      render();
    };
    img.src = originalImage;
  }, [originalImage]);

  useEffect(() => {
    if (processedImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        procImgRef.current = img;
        // Init mask canvas if not yet initialized
        if (!maskCanvasRef.current) {
          const mCanvas = document.createElement('canvas');
          mCanvas.width = img.width;
          mCanvas.height = img.height;
          const mCtx = mCanvas.getContext('2d');
          if (mCtx) {
            mCtx.drawImage(img, 0, 0);
          }
          maskCanvasRef.current = mCanvas;
        }
        render();
      };
      img.src = processedImage;
    } else {
      procImgRef.current = null;
      maskCanvasRef.current = null;
      render();
    }
  }, [processedImage]);

  useEffect(() => {
    if (backgroundSettings.mode === 'image' && backgroundSettings.imageUrl) {
      const bgImg = new Image();
      bgImg.crossOrigin = 'anonymous';
      bgImg.onload = () => {
        customBgImgRef.current = bgImg;
        render();
      };
      bgImg.src = backgroundSettings.imageUrl;
    } else {
      customBgImgRef.current = null;
      render();
    }
  }, [backgroundSettings.mode, backgroundSettings.imageUrl]);

  // Load watermark logo image if enabled
  useEffect(() => {
    if (watermarkSettings?.enabled && watermarkSettings.type === 'image' && watermarkSettings.logoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        watermarkImgRef.current = img;
        render();
      };
      img.src = watermarkSettings.logoUrl;
    } else {
      watermarkImgRef.current = null;
      render();
    }
  }, [watermarkSettings?.enabled, watermarkSettings?.type, watermarkSettings?.logoUrl]);

  // Main Render function
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const origImg = origImgRef.current;
    if (!origImg) return;

    const sourceWidth = origImg.naturalWidth || 800, sourceHeight = origImg.naturalHeight || 800;
    const quarterTurn = transformSettings.rotate % 180 !== 0;
    let width = quarterTurn ? sourceHeight : sourceWidth, height = quarterTurn ? sourceWidth : sourceHeight;
    if (transformSettings.aspectRatio !== 'Original') {
      const [a,b] = transformSettings.aspectRatio.split(':').map(Number);
      if (a > 0 && b > 0) { const ratio = a/b; if(width/height > ratio) width=Math.round(height*ratio); else height=Math.round(width/ratio); }
    }
    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    const activeView = isHoldOriginal ? 'original' : previewMode;

    if (activeView === 'original') {
      ctx.drawImage(origImg, 0, 0, width, height);
      return;
    }

    // 1. Draw Background
    if (activeView === 'final' || activeView === 'background') {
      if (backgroundSettings.mode === 'solid' && backgroundSettings.color) {
        ctx.fillStyle = backgroundSettings.color;
        ctx.fillRect(0, 0, width, height);
      } else if (backgroundSettings.mode === 'gradient' && backgroundSettings.gradient) {
        // Parse gradient colors or use standard gradient
        const css=backgroundSettings.gradient;
        const angle=Number(css.match(/([-\d.]+)deg/)?.[1]||(css.includes('to bottom')?'180':'135'))*Math.PI/180;
        const length=Math.abs(width*Math.sin(angle))+Math.abs(height*Math.cos(angle));
        const dx=Math.sin(angle)*length/2,dy=-Math.cos(angle)*length/2;
        const grad=css.startsWith('radial')?ctx.createRadialGradient(width/2,height*.35,0,width/2,height*.35,Math.max(width,height)*.75):ctx.createLinearGradient(width/2-dx,height/2-dy,width/2+dx,height/2+dy);
        const colors = backgroundSettings.gradient.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]+\)/g) || ['#6366f1','#a855f7'];
        colors.forEach((color,index)=>grad.addColorStop(colors.length===1?0:index/(colors.length-1),color));
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      } else if (backgroundSettings.mode === 'image' && customBgImgRef.current) {
        const bg=customBgImgRef.current,scale=Math.max(width/bg.naturalWidth,height/bg.naturalHeight);
        const dw=bg.naturalWidth*scale,dh=bg.naturalHeight*scale;
        ctx.drawImage(bg,(width-dw)/2,(height-dh)/2,dw,dh);
      } else if (backgroundSettings.mode === 'blur') {
        ctx.save();
        ctx.filter = `blur(${backgroundSettings.blurLevel || 20}px)`;
        ctx.drawImage(origImg, -20, -20, width + 40, height + 40);
        ctx.restore();
      }
    }

    if (activeView === 'background') {
      if (onCanvasRendered) onCanvasRendered(canvas.toDataURL());
      return;
    }

    // 1.5 Draw Realistic Product Floor Shadow or Reflection (Under Subject)
    if (shadowSettings?.enabled && (activeView === 'final' || activeView === 'transparent')) {
      if (shadowSettings.type === 'floor') {
        const cx = width / 2 + (shadowSettings.offsetX || 0);
        const cy = height * 0.88 + (shadowSettings.offsetY || 0);
        const rx = (width * 0.38 * ((shadowSettings.scale || 100) / 100));
        const ry = rx * 0.18;
        const op = ((shadowSettings.opacity ?? 60) / 100);
        const floorGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
        floorGrad.addColorStop(0, `rgba(0, 0, 0, ${op})`);
        floorGrad.addColorStop(0.45, `rgba(0, 0, 0, ${op * 0.4})`);
        floorGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.save();
        ctx.filter='blur('+Math.max(0,shadowSettings.blur||0)+'px)';
        ctx.fillStyle = floorGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      } else if (shadowSettings.type === 'reflection') {
        ctx.save();
        ctx.translate(shadowSettings.offsetX||0, height * 1.76+(shadowSettings.offsetY||0));
        ctx.filter="blur("+Math.max(0,shadowSettings.blur||0)+"px)";
        ctx.scale(1, -0.76);
        ctx.globalAlpha = ((shadowSettings.opacity ?? 40) / 100) * 0.4;
        if (maskCanvasRef.current) {
          ctx.drawImage(maskCanvasRef.current, 0, 0, width, height);
        } else if (procImgRef.current) {
          ctx.drawImage(procImgRef.current, 0, 0, width, height);
        }
        ctx.restore();
      }
    }

    // 2. Draw Foreground Subject with Filters & Refinement Mask
    ctx.save();

    // Transform: Rotate & Flip
    ctx.translate(width / 2, height / 2);
    if (transformSettings.rotate) {
      ctx.rotate((transformSettings.rotate * Math.PI) / 180);
    }
    ctx.scale(
      transformSettings.flipHorizontal ? -1 : 1,
      transformSettings.flipVertical ? -1 : 1
    );
    ctx.translate(-sourceWidth / 2, -sourceHeight / 2);

    // Apply Drop Shadow if enabled
    if (shadowSettings?.enabled && shadowSettings.type === 'drop') {
      const op = ((shadowSettings.opacity ?? 50) / 100);
      ctx.shadowColor = `rgba(0, 0, 0, ${op})`;
      ctx.shadowBlur = shadowSettings.blur ?? 15;
      ctx.shadowOffsetX = shadowSettings.offsetX ?? 0;
      ctx.shadowOffsetY = shadowSettings.offsetY ?? 10;
    }

    // Apply Lightroom-lite CSS filters
    const b = 100 + basicSettings.brightness + basicSettings.exposure;
    const c = 100 + basicSettings.contrast;
    const s = 100 + colorSettings.saturation + colorSettings.vibrance;
    const h = colorSettings.hue;
    const blr = detailSettings.blur / 10;

    let filterStr = `brightness(${Math.max(10, b)}%) contrast(${Math.max(10, c)}%) saturate(${Math.max(0, s)}%) hue-rotate(${h}deg)`;
    if (blr > 0) filterStr += ` blur(${blr}px)`;
    ctx.filter = filterStr;

    const foreground=maskCanvasRef.current||procImgRef.current||origImg;
    ctx.drawImage(toneCanvas(foreground,sourceWidth,sourceHeight,basicSettings,colorSettings,detailSettings),0,0);
    
    ctx.restore();

    // 3. Vignette
    if (detailSettings.vignette > 0) {
      const vGrad = ctx.createRadialGradient(
        width / 2,
        height / 2,
        Math.min(width, height) * 0.35,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.7
      );
      const alpha = (detailSettings.vignette / 100) * 0.8;
      vGrad.addColorStop(0, 'rgba(0,0,0,0)');
      vGrad.addColorStop(1, `rgba(0,0,0,${alpha})`);
      ctx.save();ctx.globalCompositeOperation="source-atop";
      ctx.fillStyle = vGrad;
      ctx.fillRect(0, 0, width, height);ctx.restore();
    }

    // 3.5 AI Sharpen Convolution Filter
    if (detailSettings.sharpness > 0) {
      try {
        const imgData = ctx.getImageData(0, 0, width, height);
        const src = imgData.data;
        const w = width;
        const h = height;
        const strength = (detailSettings.sharpness / 100) * 0.5;
        const output = ctx.createImageData(w, h);
        const dst = output.data;
        dst.set(src);

        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = (y * w + x) * 4;
            if (src[idx + 3] === 0) continue; // skip transparent pixels

            for (let ch = 0; ch < 3; ch++) {
              const center = src[idx + ch];
              const up = src[((y - 1) * w + x) * 4 + ch];
              const down = src[((y + 1) * w + x) * 4 + ch];
              const left = src[(y * w + (x - 1)) * 4 + ch];
              const right = src[(y * w + (x + 1)) * 4 + ch];

              const sharpened = center + strength * (4 * center - up - down - left - right);
              dst[idx + ch] = Math.min(255, Math.max(0, sharpened));
            }
          }
        }
        ctx.putImageData(output, 0, 0);
      } catch (e) {
        // Continue if getImageData restricted
      }
    }

    // 4. Watermark & Shop Logo
    if (watermarkSettings?.enabled) {
      ctx.save();
      const opacity = (watermarkSettings.opacity ?? 70) / 100;
      ctx.globalAlpha = opacity;
      const padding = Math.max(16, width * 0.035);

      if (watermarkSettings.type === 'image' && watermarkImgRef.current) {
        const logo = watermarkImgRef.current;
        const targetW = (width * 0.22 * (watermarkSettings.size || 50)) / 50;
        const aspect = logo.naturalWidth / (logo.naturalHeight || 1);
        const targetH = targetW / aspect;

        let posX = padding;
        let posY = padding;
        const pos = watermarkSettings.position || 'bottom-right';

        if (pos.includes('center') && !pos.includes('left') && !pos.includes('right')) {
          posX = (width - targetW) / 2;
        } else if (pos.includes('right')) {
          posX = width - targetW - padding;
        }

        if (pos.startsWith('center') || pos === 'center') {
          posY = (height - targetH) / 2;
        } else if (pos.includes('bottom')) {
          posY = height - targetH - padding;
        }

        ctx.drawImage(logo, posX, posY, targetW, targetH);
      } else if (watermarkSettings.text) {
        const fontSize = Math.round((Math.min(width, height) * 0.04 * (watermarkSettings.size || 50)) / 50);
        ctx.font = `bold ${Math.max(14, fontSize)}px sans-serif`;
        const text = watermarkSettings.text;
        const textMetrics = ctx.measureText(text);
        const textW = textMetrics.width;
        const textH = fontSize;

        let posX = padding;
        let posY = padding + textH;
        const pos = watermarkSettings.position || 'bottom-right';

        if (pos === 'top-center' || pos === 'center' || pos === 'bottom-center') {
          posX = (width - textW) / 2;
        } else if (pos.includes('right')) {
          posX = width - textW - padding;
        }

        if (pos.startsWith('center') || pos === 'center') {
          posY = height / 2 + textH / 3;
        } else if (pos.includes('bottom')) {
          posY = height - padding;
        }

        // Subtly shadowed text for high readability over any background
        ctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillStyle = watermarkSettings.color || '#FFFFFF';
        ctx.fillText(text, posX, posY);
      }
      ctx.restore();
    }

    if (onCanvasRendered) {
      onCanvasRendered(canvas.toDataURL());
    }
  };

  useEffect(() => {
    render();
  }, [
    basicSettings,
    colorSettings,
    detailSettings,
    transformSettings,
    backgroundSettings,
    shadowSettings,
    watermarkSettings,
    previewMode,
    isHoldOriginal,
  ]);

  // Interactive Refinement Painting
  const handleBrushAction = (clientX: number, clientY: number) => {
    if(!refinementEnabled||!canvasRef.current)return;
    if(!maskCanvasRef.current) {
     const source=procImgRef.current||origImgRef.current;if(!source)return;
     const mask=document.createElement('canvas');mask.width=source.naturalWidth;mask.height=source.naturalHeight;mask.getContext('2d')?.drawImage(source,0,0);maskCanvasRef.current=mask;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const dx=(clientX-rect.left)*scaleX-canvasRef.current.width/2;
    const dy=(clientY-rect.top)*scaleY-canvasRef.current.height/2;
    const radians=-transformSettings.rotate*Math.PI/180;
    const x=(dx*Math.cos(radians)-dy*Math.sin(radians))*(transformSettings.flipHorizontal?-1:1)+maskCanvasRef.current.width/2;
    const y=(dx*Math.sin(radians)+dy*Math.cos(radians))*(transformSettings.flipVertical?-1:1)+maskCanvasRef.current.height/2;

    const mCtx = maskCanvasRef.current.getContext('2d');
    if (!mCtx) return;

    const radius = Math.max(1,((brushSize / 100) * canvasRef.current.width) / 10);

    mCtx.save();
    if (brushMode === 'erase') {
      mCtx.globalCompositeOperation = 'destination-out';
      if (brushSoftness > 0) {
        const grad = mCtx.createRadialGradient(x, y, radius * (1 - brushSoftness / 100), x, y, radius);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        mCtx.fillStyle = grad;
      } else {
        mCtx.fillStyle = 'rgba(0,0,0,1)';
      }
      mCtx.beginPath();
      mCtx.arc(x, y, radius, 0, Math.PI * 2);
      mCtx.fill();
    } else {
      // Restore from original image
      if (origImgRef.current) {
        const stamp=document.createElement('canvas');stamp.width=maskCanvasRef.current.width;stamp.height=maskCanvasRef.current.height;
        const stampCtx=stamp.getContext('2d')!;stampCtx.drawImage(origImgRef.current,0,0,stamp.width,stamp.height);
        stampCtx.globalCompositeOperation='destination-in';
        const brush=stampCtx.createRadialGradient(x,y,radius*(1-brushSoftness/100),x,y,radius);
        brush.addColorStop(0,'rgba(0,0,0,1)');brush.addColorStop(1,brushSoftness>0?'rgba(0,0,0,0)':'rgba(0,0,0,1)');
        stampCtx.fillStyle=brush;stampCtx.beginPath();stampCtx.arc(x,y,radius,0,Math.PI*2);stampCtx.fill();
        mCtx.globalCompositeOperation='source-over';mCtx.drawImage(stamp,0,0);
      }
    }
    mCtx.restore();
    render();
  };

  const handleMouseDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!refinementEnabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    handleBrushAction(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (isDrawing) {
      handleBrushAction(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = () => {
   if(isDrawing&&maskCanvasRef.current)onRefinementCommitted?.(maskCanvasRef.current.toDataURL());
   setIsDrawing(false);
  };

  return (
    <div className="flex flex-col items-center justify-between h-full space-y-3">
      {/* Canvas Viewport Box */}
      <div
        ref={containerRef}
        className="canvas-viewport relative w-full flex-1 min-h-[420px] max-h-[580px] rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner flex items-center justify-center checkerboard-pattern group"
      >
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transition: isDrawing ? 'none' : 'transform 0.15s ease-out' }}
          className="relative max-w-full max-h-full flex items-center justify-center select-none"
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handleMouseDown}
            onPointerMove={handleMouseMove}
            onPointerUp={handleMouseUp}
            onPointerCancel={handleMouseUp}
            style={{touchAction: refinementEnabled ? "none" : "auto"}}
            onPointerLeave={() => {
              setCursorPos(null);
            }}
            className={`max-w-full max-h-[540px] rounded-2xl object-contain drop-shadow-md transition-shadow ${
              refinementEnabled ? 'cursor-crosshair' : 'cursor-default'
            }`}
          />
        </div>

        {/* Brush Indicator when refinement is active */}
        {refinementEnabled && cursorPos && (
          <div
            className={`pointer-events-none absolute rounded-full border-2 transform -translate-x-1/2 -translate-y-1/2 transition-opacity ${
              brushMode === 'erase' ? 'border-rose-500 bg-rose-500/10' : 'border-emerald-500 bg-emerald-500/10'
            }`}
            style={{
              left: cursorPos.x,
              top: cursorPos.y,
              width: `${(brushSize / 100) * 80 + 10}px`,
              height: `${(brushSize / 100) * 80 + 10}px`,
            }}
          />
        )}

        {/* Hold to View Original Button */}
        <button
          type="button"
          onMouseDown={() => setIsHoldOriginal(true)}
          onMouseUp={() => setIsHoldOriginal(false)}
          onTouchStart={() => setIsHoldOriginal(true)}
          onTouchEnd={() => setIsHoldOriginal(false)}
          onMouseLeave={() => setIsHoldOriginal(false)}
          onTouchCancel={() => setIsHoldOriginal(false)}
          onBlur={() => setIsHoldOriginal(false)}
          onKeyDown={e => { if(e.key === " " || e.key === "Enter") setIsHoldOriginal(true); }}
          onKeyUp={() => setIsHoldOriginal(false)}
          className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-semibold backdrop-blur-md shadow-md select-none transition-all active:scale-95"
          title="Press & hold to see original photo"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Hold Original</span>
        </button>
      </div>

      {/* Preview Mode Checkboxes (Matching Screenshot) */}
      <div className="w-full bg-white dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-wrap items-center justify-center gap-4 text-xs font-semibold select-none">
        <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
          <input
            type="radio"
            name="preview_mode"
            checked={previewMode === 'original'}
            onChange={() => onChangePreviewMode('original')}
            className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
          />
          <span>Original</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
          <input
            type="radio"
            name="preview_mode"
            checked={previewMode === 'transparent'}
            onChange={() => onChangePreviewMode('transparent')}
            className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
          />
          <span>Transparent</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 transition-colors">
          <input
            type="radio"
            name="preview_mode"
            checked={previewMode === 'background'}
            onChange={() => onChangePreviewMode('background')}
            className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
          />
          <span>Background Preview</span>
        </label>

        <label className="flex items-center gap-2 cursor-pointer text-brand-600 dark:text-brand-400 font-bold transition-colors">
          <input
            type="radio"
            name="preview_mode"
            checked={previewMode === 'final'}
            onChange={() => onChangePreviewMode('final')}
            className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500"
          />
          <span>Final Result</span>
        </label>
      </div>
    </div>
  );
};
