import React, { useRef } from 'react';
import { SKIN_TONES, HAIR_COLORS } from '../lib/constants';

export interface PartPosition { x: number; y: number; scale?: number; }
export type PartPositionsMap = Partial<Record<'hair' | 'eyes' | 'mouth' | 'outfit' | 'accessory' | 'head', PartPosition>>;
export interface AccessoryItemPosition { x: number; y: number; scale: number; }
export interface AccessoryItem { name: string; color: string; position?: AccessoryItemPosition; }

interface AvatarPreviewProps {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  headShape?: string;
  eyeStyle: string;
  eyeColor?: string;
  eyeWidth?: number;
  eyeSpacing?: number;
  mouthStyle: string;
  mouthColor?: string;
  outfitStyle: string;
  outfitColor?: string;
  accessory?: string | null;
  accessoryColor?: string;
  accessories?: AccessoryItem[];
  backgroundColor?: string;
  customPartImages?: Record<string, string>;
  partPositions?: PartPositionsMap | null;
  layerOrder?: string[];
  // Editable drag mode
  editable?: boolean;
  onLayerDrag?: (layerKey: string, x: number, y: number) => void;
  className?: string;
}

function resolveHex(value: string, map: { id: string; hex: string }[]): string {
  if (!value) return map[0].hex;
  if (value.startsWith('#')) return value;
  return map.find(m => m.id === value)?.hex ?? map[0].hex;
}

const PART_CENTERS: Record<string, { cx: number; cy: number }> = {
  hair:      { cx: 100, cy: 65 },
  eyes:      { cx: 100, cy: 86 },
  mouth:     { cx: 100, cy: 112 },
  outfit:    { cx: 100, cy: 160 },
  accessory: { cx: 100, cy: 70 },
  head:      { cx: 100, cy: 90 },
};

function partTransform(pos: PartPosition | undefined, cx: number, cy: number): string | undefined {
  const dx = pos?.x ?? 0;
  const dy = pos?.y ?? 0;
  const s = pos?.scale ?? 1;
  if (dx === 0 && dy === 0 && s === 1) return undefined;
  if (s === 1) return `translate(${dx} ${dy})`;
  return `translate(${dx} ${dy}) translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`;
}

function accTransform(p: AccessoryItemPosition | undefined): string | undefined {
  if (!p) return undefined;
  const { x, y, scale: s = 1 } = p;
  if (x === 0 && y === 0 && s === 1) return undefined;
  const cx = PART_CENTERS.accessory.cx, cy = PART_CENTERS.accessory.cy;
  if (s === 1) return `translate(${x} ${y})`;
  return `translate(${x} ${y}) translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`;
}

function headShapeEl(shape: string, fill: string): React.ReactNode {
  switch (shape) {
    case 'oval':           return <ellipse cx="100" cy="90" rx="38" ry="50" fill={fill} />;
    case 'wide':           return <ellipse cx="100" cy="90" rx="56" ry="40" fill={fill} />;
    case 'square':         return <rect x="54" y="44" width="92" height="92" fill={fill} />;
    case 'rounded-square': return <rect x="54" y="44" width="92" height="92" rx="20" fill={fill} />;
    case 'diamond':        return <polygon points="100,40 150,90 100,140 50,90" fill={fill} />;
    default:               return <circle cx="100" cy="90" r="46" fill={fill} />;
  }
}
function headClipEl(shape: string): React.ReactNode {
  switch (shape) {
    case 'oval':           return <ellipse cx="100" cy="90" rx="40" ry="52" />;
    case 'wide':           return <ellipse cx="100" cy="90" rx="58" ry="42" />;
    case 'square':         return <rect x="52" y="42" width="96" height="96" />;
    case 'rounded-square': return <rect x="52" y="42" width="96" height="96" rx="20" />;
    case 'diamond':        return <polygon points="100,38 152,90 100,142 48,90" />;
    default:               return <circle cx="100" cy="90" r="48" />;
  }
}

function EyeShape({ style, cx, cy, color }: { style: string; cx: number; cy: number; color: string }) {
  if (style === 'round') return (
    <g fill={color}><circle cx={cx} cy={cy} r="5.5" /><circle cx={cx-2} cy={cy-2} r="1.5" fill="white" opacity="0.6" /></g>
  );
  if (style === 'sleepy') return (
    <path fill={color} d={`M ${cx-7} ${cy} Q ${cx} ${cy-6} ${cx+7} ${cy} Q ${cx} ${cy-2} ${cx-7} ${cy}`} />
  );
  if (style === 'almond') return (
    <path fill={color} d={`M ${cx-7} ${cy} Q ${cx} ${cy-6} ${cx+7} ${cy} Q ${cx} ${cy+6} ${cx-7} ${cy}`} />
  );
  if (style === 'hooded') return (
    <><ellipse cx={cx} cy={cy+1} rx="7" ry="5" fill={color} />
      <path d={`M ${cx-7} ${cy-2} Q ${cx} ${cy-6} ${cx+7} ${cy-2}`} fill="rgba(0,0,0,0.15)" /></>
  );
  if (style === 'monolid') return <rect x={cx-7} y={cy-4} width="14" height="8" rx="4" fill={color} />;
  return (
    <g fill={color}><ellipse cx={cx} cy={cy} rx="6.5" ry="5" /><circle cx={cx-2} cy={cy-2} r="1.5" fill="white" opacity="0.6" /></g>
  );
}

function SingleAccessory({ name, color, customUrl }: { name: string; color: string; customUrl?: string }) {
  if (customUrl) return <image href={customUrl} x="68" y="60" width="64" height="40" preserveAspectRatio="xMidYMid meet" />;
  if (name === 'glasses') return (
    <g stroke={color} strokeWidth="2" fill={color} fillOpacity="0.15">
      <circle cx="83" cy="86" r="11" /><circle cx="117" cy="86" r="11" />
      <line x1="94" y1="86" x2="106" y2="86" strokeWidth="2" />
      <line x1="72" y1="82" x2="68" y2="78" strokeWidth="1.5" />
      <line x1="128" y1="82" x2="132" y2="78" strokeWidth="1.5" />
    </g>
  );
  if (name === 'sunglasses') return (
    <g>
      <rect x="72" y="79" width="22" height="14" rx="5" fill="#111" />
      <rect x="106" y="79" width="22" height="14" rx="5" fill="#111" />
      <line x1="94" y1="86" x2="106" y2="86" stroke={color} strokeWidth="2" />
      <line x1="72" y1="83" x2="68" y2="79" stroke={color} strokeWidth="1.5" />
      <line x1="128" y1="83" x2="132" y2="79" stroke={color} strokeWidth="1.5" />
    </g>
  );
  if (name === 'hat') return (
    <g fill={color}><rect x="63" y="54" width="74" height="11" rx="4" /><rect x="76" y="30" width="48" height="27" rx="5" /></g>
  );
  if (name === 'headphones') return (
    <g stroke={color} strokeWidth="3" fill="none">
      <path d="M 60 90 Q 60 48 100 48 Q 140 48 140 90" />
      <rect x="54" y="83" width="13" height="18" rx="4" fill={color} stroke="none" />
      <rect x="133" y="83" width="13" height="18" rx="4" fill={color} stroke="none" />
    </g>
  );
  if (name === 'crown') return (
    <g fill="#f59e0b" stroke="#d97706" strokeWidth="1">
      <path d="M 70 60 L 75 40 L 90 52 L 100 36 L 110 52 L 125 40 L 130 60 Z" />
      <circle cx="75" cy="42" r="3" fill="#ef4444" stroke="none" />
      <circle cx="100" cy="38" r="3" fill="#3b82f6" stroke="none" />
      <circle cx="125" cy="42" r="3" fill="#10b981" stroke="none" />
    </g>
  );
  return null;
}

// Part key → PartPositionsMap key
const PART_KEY_MAP: Record<string, keyof PartPositionsMap> = {
  backhair: 'hair', fronthair: 'hair', head: 'head',
  outfit: 'outfit', eyes: 'eyes', mouth: 'mouth',
};

const AvatarPreview: React.FC<AvatarPreviewProps> = ({
  skinTone, hairStyle, hairColor, headShape = 'circle',
  eyeStyle, eyeColor = "#1e1b4b", eyeWidth = 1.0, eyeSpacing = 1.0,
  mouthStyle, mouthColor = "#2d1a0e",
  outfitStyle, outfitColor = "#2563eb",
  accessory, accessoryColor = "#3b82f6",
  accessories = [], backgroundColor = "#1e1b4b",
  customPartImages = {}, partPositions, layerOrder = [],
  editable = false, onLayerDrag,
  className = "",
}) => {
  const uidRef = useRef(`av${Math.random().toString(36).slice(2, 7)}`);
  const uid = uidRef.current;
  const clipId = `hc-${uid}`;
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ part: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const skinHex = resolveHex(skinTone, SKIN_TONES);
  const hairHex = resolveHex(hairColor, HAIR_COLORS);
  const pos: PartPositionsMap = partPositions ?? {};

  const resolvedAcc: AccessoryItem[] = accessories.length > 0
    ? accessories
    : (accessory && accessory !== 'none' ? [{ name: accessory, color: accessoryColor }] : []);

  const accKeys = resolvedAcc.map((_, i) => `acc_${i}`);
  const ALL_KEYS = ['backhair', 'outfit', 'head', 'fronthair', 'eyes', 'mouth', ...accKeys];
  const resolvedOrder = (() => {
    if (!layerOrder || layerOrder.length === 0) return ALL_KEYS;
    const valid = new Set(ALL_KEYS);
    const ordered = layerOrder.filter(k => valid.has(k));
    const missing = ALL_KEYS.filter(k => !ordered.includes(k));
    return [...ordered, ...missing];
  })();

  // ── Drag helpers ────────────────────────────────────────────────────────────
  function toSvgCoords(clientX: number, clientY: number) {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return { x: ((clientX - rect.left) / rect.width) * 200, y: ((clientY - rect.top) / rect.height) * 200 };
  }

  function onLayerMouseDown(e: React.MouseEvent, part: string) {
    if (!editable || !onLayerDrag) return;
    e.preventDefault(); e.stopPropagation();
    const { x, y } = toSvgCoords(e.clientX, e.clientY);
    let origX = 0, origY = 0;
    if (part.startsWith('acc_')) {
      const idx = parseInt(part.slice(4), 10);
      origX = resolvedAcc[idx]?.position?.x ?? 0;
      origY = resolvedAcc[idx]?.position?.y ?? 0;
    } else {
      const pk = PART_KEY_MAP[part];
      if (pk) { origX = pos[pk]?.x ?? 0; origY = pos[pk]?.y ?? 0; }
    }
    dragRef.current = { part, startX: x, startY: y, origX, origY };
  }

  function onSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragRef.current || !onLayerDrag) return;
    const { x, y } = toSvgCoords(e.clientX, e.clientY);
    const { part, startX, startY, origX, origY } = dragRef.current;
    const newX = Math.max(-90, Math.min(90, origX + (x - startX)));
    const newY = Math.max(-90, Math.min(90, origY + (y - startY)));
    onLayerDrag(part, newX, newY);
  }

  function onSvgEnd() { dragRef.current = null; }

  function layerProps(key: string) {
    if (!editable) return {};
    return { onMouseDown: (e: React.MouseEvent) => onLayerMouseDown(e, key), style: { cursor: 'grab' } };
  }

  // ── Layer renderers ─────────────────────────────────────────────────────────
  function renderBackHair(): React.ReactNode {
    if (hairStyle === 'none') return null;
    if (!['long', 'wavy', 'ponytail'].includes(hairStyle)) return null;
    const tr = partTransform(pos.hair, PART_CENTERS.hair.cx, PART_CENTERS.hair.cy);
    return (
      <g fill={hairHex} transform={tr}>
        {hairStyle === 'long' && (
          <><path d="M 57 88 Q 50 115 48 158 Q 62 150 68 128 L 70 88" />
            <path d="M 143 88 Q 150 115 152 158 Q 138 150 132 128 L 130 88" /></>
        )}
        {hairStyle === 'wavy' && (
          <><path d="M 57 88 Q 46 100 50 116 Q 44 132 50 152 Q 64 146 64 132 Q 58 116 64 100 L 66 88" />
            <path d="M 143 88 Q 154 100 150 116 Q 156 132 150 152 Q 136 146 136 132 Q 142 116 136 100 L 134 88" /></>
        )}
        {hairStyle === 'ponytail' && (
          <path d="M 93 46 Q 88 85 86 125 Q 90 155 100 162 Q 110 155 114 125 Q 112 85 107 46" />
        )}
      </g>
    );
  }

  function renderOutfit(): React.ReactNode {
    if (outfitStyle === 'none') return null;
    const tr = partTransform(pos.outfit, PART_CENTERS.outfit.cx, PART_CENTERS.outfit.cy);
    const url = customPartImages[outfitStyle];
    return (
      <g transform={tr}>
        {url ? (
          <image href={url} x="35" y="125" width="130" height="75" preserveAspectRatio="xMidYMid meet" clipPath={`url(#bc-${uid})`} />
        ) : (
          <g fill={outfitColor}>
            {outfitStyle === 'hoodie' && (
              <><path d="M 55 200 Q 52 132 100 132 Q 148 132 145 200" />
                <path d="M 65 200 Q 63 145 100 145 Q 137 145 135 200" opacity="0.5" /></>
            )}
            {outfitStyle === 'dress' && <path d="M 45 200 Q 55 125 100 128 Q 145 125 155 200" />}
            {outfitStyle === 'sporty' && (
              <><path d="M 60 200 Q 60 138 100 136 Q 140 138 140 200" />
                <path d="M 78 200 L 78 155 L 122 155 L 122 200" opacity="0.35" /></>
            )}
            {outfitStyle === 'formal' && (
              <><path d="M 62 200 Q 62 138 100 136 Q 138 138 138 200" />
                <path d="M 97 136 L 93 155 L 100 168 L 107 155 L 103 136" fill="white" opacity="0.4" /></>
            )}
            {!['hoodie','dress','sporty','formal','none'].includes(outfitStyle) && (
              <path d="M 62 200 Q 62 138 100 136 Q 138 138 138 200" />
            )}
          </g>
        )}
      </g>
    );
  }

  function renderHead(): React.ReactNode {
    const tr = partTransform(pos.head, PART_CENTERS.head.cx, PART_CENTERS.head.cy);
    return <g transform={tr}>{headShapeEl(headShape, skinHex)}</g>;
  }

  function renderFrontHair(): React.ReactNode {
    if (hairStyle === 'none') return null;
    const tr = partTransform(pos.hair, PART_CENTERS.hair.cx, PART_CENTERS.hair.cy);
    const url = customPartImages[hairStyle];
    return (
      <g transform={tr}>
        {url ? (
          <image href={url} x="48" y="38" width="104" height="70" preserveAspectRatio="xMidYMid meet" clipPath={`url(#${clipId})`} />
        ) : (
          <g fill={hairHex}>
            {['short','long','wavy'].includes(hairStyle) && (
              <path d="M 57 88 Q 57 37 100 37 Q 143 37 143 88 Q 138 62 100 48 Q 62 62 57 88" />
            )}
            {hairStyle === 'curly' && (
              <><circle cx="68" cy="55" r="16" /><circle cx="100" cy="42" r="18" />
                <circle cx="132" cy="55" r="16" /><circle cx="58" cy="78" r="14" />
                <circle cx="142" cy="78" r="14" />
                <path d="M 54 90 Q 54 60 100 45 Q 146 60 146 90" /></>
            )}
            {hairStyle === 'bun' && (
              <><path d="M 57 90 Q 57 50 100 50 Q 143 50 143 90 Q 138 68 100 56 Q 62 68 57 90" />
                <circle cx="100" cy="43" r="13" /></>
            )}
            {hairStyle === 'ponytail' && (
              <><path d="M 57 90 Q 57 38 100 38 Q 143 38 143 90 Q 138 62 100 48 Q 62 62 57 90" />
                <rect x="95" y="42" width="10" height="12" rx="3" opacity="0.7" /></>
            )}
            {hairStyle === 'buzz' && (
              <path d="M 57 90 Q 57 45 100 43 Q 143 45 143 90 Q 141 72 100 62 Q 59 72 57 90" opacity="0.85" />
            )}
          </g>
        )}
      </g>
    );
  }

  function renderEyes(): React.ReactNode {
    if (eyeStyle === 'none') return null;
    const spacing = eyeSpacing ?? 1.0;
    const size = eyeWidth ?? 1.0;
    const leftX = 100 - 17 * spacing;
    const rightX = 100 + 17 * spacing;
    const tr = partTransform(pos.eyes, PART_CENTERS.eyes.cx, PART_CENTERS.eyes.cy);
    const url = customPartImages[eyeStyle];
    return (
      <g transform={tr}>
        {url ? (
          <image href={url} x="70" y="76" width="60" height="22" preserveAspectRatio="xMidYMid meet" />
        ) : (
          <>
            <g transform={`translate(${leftX} 86) scale(${size}) translate(${-leftX} -86)`}>
              <EyeShape style={eyeStyle} cx={leftX} cy={86} color={eyeColor} />
            </g>
            <g transform={`translate(${rightX} 86) scale(${size}) translate(${-rightX} -86)`}>
              <EyeShape style={eyeStyle} cx={rightX} cy={86} color={eyeColor} />
            </g>
          </>
        )}
      </g>
    );
  }

  function renderMouth(): React.ReactNode {
    if (mouthStyle === 'none') return null;
    const tr = partTransform(pos.mouth, PART_CENTERS.mouth.cx, PART_CENTERS.mouth.cy);
    const url = customPartImages[mouthStyle];
    const stroke = mouthColor;
    return (
      <g transform={tr}>
        {url ? (
          <image href={url} x="82" y="104" width="36" height="20" preserveAspectRatio="xMidYMid meet" />
        ) : (
          <g stroke={stroke} strokeWidth="2" fill="transparent" strokeLinecap="round">
            {mouthStyle === 'smile'      && <path d="M 88 110 Q 100 122 112 110" />}
            {mouthStyle === 'neutral'    && <line x1="88" y1="112" x2="112" y2="112" />}
            {mouthStyle === 'smirk'      && <path d="M 88 113 Q 98 108 112 110" />}
            {mouthStyle === 'open'       && <ellipse cx="100" cy="113" rx="9" ry="6" fill={mouthColor} fillOpacity="0.6" stroke={stroke} strokeWidth="1.5" />}
            {mouthStyle === 'wide-smile' && <path d="M 84 109 Q 100 126 116 109" />}
            {!['smile','neutral','smirk','open','wide-smile','none'].includes(mouthStyle) && <path d="M 88 110 Q 100 122 112 110" />}
          </g>
        )}
      </g>
    );
  }

  function renderAccessory(acc: AccessoryItem, idx: number): React.ReactNode {
    const tr = accTransform(acc.position);
    return (
      <g transform={tr}>
        <SingleAccessory name={acc.name} color={acc.color} customUrl={customPartImages[acc.name]} />
      </g>
    );
  }

  function renderLayer(key: string): React.ReactNode {
    switch (key) {
      case 'backhair':  return renderBackHair();
      case 'outfit':    return renderOutfit();
      case 'head':      return renderHead();
      case 'fronthair': return renderFrontHair();
      case 'eyes':      return renderEyes();
      case 'mouth':     return renderMouth();
      default: {
        if (key.startsWith('acc_')) {
          const idx = parseInt(key.slice(4), 10);
          if (!isNaN(idx) && idx < resolvedAcc.length) return renderAccessory(resolvedAcc[idx], idx);
        }
        return null;
      }
    }
  }

  return (
    <div className={`relative w-full h-full aspect-square rounded-2xl overflow-hidden flex items-center justify-center border border-border shadow-inner ${className}`}
      style={{ backgroundColor }}>
      {editable && (
        <div className="absolute top-2 left-2 z-10 text-xs bg-black/50 text-white px-2 py-0.5 rounded-full pointer-events-none">
          drag to move
        </div>
      )}
      <svg ref={svgRef} viewBox="0 0 200 200" className="w-full h-full drop-shadow-md select-none"
        onMouseMove={onSvgMouseMove} onMouseUp={onSvgEnd} onMouseLeave={onSvgEnd}>
        <defs>
          <clipPath id={clipId}>{headClipEl(headShape)}</clipPath>
          <clipPath id={`bc-${uid}`}><rect x="35" y="122" width="130" height="78" /></clipPath>
        </defs>
        {resolvedOrder.map(key => (
          <g key={key} {...layerProps(key)}>
            {renderLayer(key)}
          </g>
        ))}
      </svg>
    </div>
  );
};

export { AvatarPreview };
export default AvatarPreview;
