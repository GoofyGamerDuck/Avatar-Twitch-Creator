import React from 'react';
import { SKIN_TONES, HAIR_COLORS } from '../lib/constants';

export interface PartPosition { x: number; y: number; }
export type PartPositionsMap = Partial<Record<'hair' | 'eyes' | 'mouth' | 'outfit' | 'accessory', PartPosition>>;

interface AvatarPreviewProps {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeStyle: string;
  eyeColor?: string;
  mouthStyle: string;
  outfitStyle: string;
  outfitColor?: string;
  accessory: string | null;
  accessoryColor?: string;
  customPartImages?: Record<string, string>;
  partPositions?: PartPositionsMap | null;
  size?: string;
  className?: string;
}

function t(pos: PartPosition | undefined) {
  if (!pos || (pos.x === 0 && pos.y === 0)) return undefined;
  return `translate(${pos.x} ${pos.y})`;
}

function BackHair({ style, color, pos }: { style: string; color: string; pos?: PartPosition }) {
  if (!['long', 'wavy', 'ponytail'].includes(style)) return null;
  return (
    <g fill={color} transform={t(pos)}>
      {style === 'long' && (
        <>
          <path d="M 57 88 Q 50 115 48 158 Q 62 150 68 128 L 70 88" />
          <path d="M 143 88 Q 150 115 152 158 Q 138 150 132 128 L 130 88" />
        </>
      )}
      {style === 'wavy' && (
        <>
          <path d="M 57 88 Q 46 100 50 116 Q 44 132 50 152 Q 64 146 64 132 Q 58 116 64 100 L 66 88" />
          <path d="M 143 88 Q 154 100 150 116 Q 156 132 150 152 Q 136 146 136 132 Q 142 116 136 100 L 134 88" />
        </>
      )}
      {style === 'ponytail' && (
        <path d="M 93 46 Q 88 85 86 125 Q 90 155 100 162 Q 110 155 114 125 Q 112 85 107 46" />
      )}
    </g>
  );
}

function FrontHair({ style, color, customUrl, pos }: {
  style: string; color: string; customUrl?: string; pos?: PartPosition;
}) {
  return (
    <g transform={t(pos)}>
      {customUrl ? (
        <image href={customUrl} x="48" y="38" width="104" height="70"
          preserveAspectRatio="xMidYMid meet" clipPath="url(#headClip)" />
      ) : (
        <g fill={color}>
          {(style === 'short' || style === 'long') && (
            <path d="M 57 88 Q 57 37 100 37 Q 143 37 143 88 Q 138 62 100 48 Q 62 62 57 88" />
          )}
          {style === 'wavy' && (
            <path d="M 57 88 Q 57 37 100 37 Q 143 37 143 88 Q 138 62 100 48 Q 62 62 57 88" />
          )}
          {style === 'curly' && (
            <>
              <circle cx="68" cy="55" r="16" />
              <circle cx="100" cy="42" r="18" />
              <circle cx="132" cy="55" r="16" />
              <circle cx="58" cy="78" r="14" />
              <circle cx="142" cy="78" r="14" />
              <path d="M 54 90 Q 54 60 100 45 Q 146 60 146 90" />
            </>
          )}
          {style === 'bun' && (
            <>
              <path d="M 57 90 Q 57 50 100 50 Q 143 50 143 90 Q 138 68 100 56 Q 62 68 57 90" />
              <circle cx="100" cy="43" r="13" />
            </>
          )}
          {style === 'ponytail' && (
            <>
              <path d="M 57 90 Q 57 38 100 38 Q 143 38 143 90 Q 138 62 100 48 Q 62 62 57 90" />
              <rect x="95" y="42" width="10" height="12" rx="3" opacity="0.7" />
            </>
          )}
          {style === 'buzz' && (
            <path d="M 57 90 Q 57 45 100 43 Q 143 45 143 90 Q 141 72 100 62 Q 59 72 57 90" opacity="0.85" />
          )}
          {!['short','long','wavy','curly','bun','ponytail','buzz'].includes(style) && (
            <path d="M 55 90 Q 55 38 100 38 Q 145 38 145 90 Q 140 65 100 50 Q 60 65 55 90" />
          )}
        </g>
      )}
    </g>
  );
}

const AvatarPreview: React.FC<AvatarPreviewProps> = ({
  skinTone, hairStyle, hairColor, eyeStyle, eyeColor = "#1e1b4b",
  mouthStyle, outfitStyle, outfitColor = "#2563eb",
  accessory, accessoryColor = "#3b82f6",
  customPartImages = {}, partPositions, className = "",
}) => {
  const skinHex = SKIN_TONES.find(s => s.id === skinTone)?.hex ?? SKIN_TONES[0].hex;
  const hairHex = HAIR_COLORS.find(h => h.id === hairColor)?.hex ?? HAIR_COLORS[0].hex;

  const positions: PartPositionsMap = partPositions ?? {};

  const customHairUrl = customPartImages[hairStyle] || undefined;
  const customEyeUrl = customPartImages[eyeStyle] || undefined;
  const customMouthUrl = customPartImages[mouthStyle] || undefined;
  const customOutfitUrl = customPartImages[outfitStyle] || undefined;
  const customAccessoryUrl = accessory ? (customPartImages[accessory] || undefined) : undefined;

  return (
    <div className={`relative w-full h-full aspect-square bg-muted rounded-2xl overflow-hidden flex items-center justify-center border border-border shadow-inner ${className}`}>
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md">
        <defs>
          <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--background)" stopOpacity="0" />
          </radialGradient>
          <clipPath id="headClip">
            <circle cx="100" cy="90" r="52" />
          </clipPath>
          <clipPath id="bodyClip">
            <rect x="35" y="122" width="130" height="78" />
          </clipPath>
        </defs>

        {/* Background */}
        <circle cx="100" cy="100" r="90" fill="url(#bgGlow)" opacity="0.5" />

        {/* 1. Back hair — behind head */}
        <BackHair style={hairStyle} color={hairHex} pos={positions.hair} />

        {/* 2. Outfit / body */}
        <g transform={t(positions.outfit)}>
          {customOutfitUrl ? (
            <image href={customOutfitUrl} x="35" y="125" width="130" height="75"
              preserveAspectRatio="xMidYMid meet" clipPath="url(#bodyClip)" />
          ) : (
            <g fill={outfitColor}>
              {outfitStyle === 'hoodie' && (
                <>
                  <path d="M 55 200 Q 52 132 100 132 Q 148 132 145 200" />
                  <path d="M 65 200 Q 63 145 100 145 Q 137 145 135 200" opacity="0.5" />
                </>
              )}
              {outfitStyle === 'dress' && (
                <path d="M 45 200 Q 55 125 100 128 Q 145 125 155 200" />
              )}
              {outfitStyle === 'sporty' && (
                <>
                  <path d="M 60 200 Q 60 138 100 136 Q 140 138 140 200" />
                  <path d="M 78 200 L 78 155 L 122 155 L 122 200" opacity="0.35" />
                </>
              )}
              {!['hoodie', 'dress', 'sporty'].includes(outfitStyle) && (
                <path d="M 62 200 Q 62 138 100 136 Q 138 138 138 200" />
              )}
            </g>
          )}
        </g>

        {/* 3. Head */}
        <circle cx="100" cy="90" r="46" fill={skinHex} />

        {/* 4. Front hair */}
        <FrontHair style={hairStyle} color={hairHex} customUrl={customHairUrl} pos={positions.hair} />

        {/* 5. Eyes */}
        <g transform={t(positions.eyes)}>
          {customEyeUrl ? (
            <image href={customEyeUrl} x="70" y="76" width="60" height="22"
              preserveAspectRatio="xMidYMid meet" />
          ) : (
            <g fill={eyeColor}>
              {eyeStyle === 'round' && (
                <>
                  <circle cx="83" cy="86" r="5.5" />
                  <circle cx="117" cy="86" r="5.5" />
                  <circle cx="81" cy="84" r="1.5" fill="white" opacity="0.6" />
                  <circle cx="115" cy="84" r="1.5" fill="white" opacity="0.6" />
                </>
              )}
              {eyeStyle === 'sleepy' && (
                <>
                  <path d="M 76 88 Q 83 82 90 88 Q 83 86 76 88" />
                  <path d="M 110 88 Q 117 82 124 88 Q 117 86 110 88" />
                </>
              )}
              {eyeStyle === 'almond' && (
                <>
                  <path d="M 76 86 Q 83 80 90 86 Q 83 92 76 86" />
                  <path d="M 110 86 Q 117 80 124 86 Q 117 92 110 86" />
                </>
              )}
              {eyeStyle === 'hooded' && (
                <>
                  <ellipse cx="83" cy="87" rx="7" ry="5" />
                  <ellipse cx="117" cy="87" rx="7" ry="5" />
                  <path d="M 76 84 Q 83 80 90 84" fill={skinHex} opacity="0.6" />
                  <path d="M 110 84 Q 117 80 124 84" fill={skinHex} opacity="0.6" />
                </>
              )}
              {eyeStyle === 'monolid' && (
                <>
                  <rect x="76" y="83" width="14" height="8" rx="4" />
                  <rect x="110" y="83" width="14" height="8" rx="4" />
                </>
              )}
              {(eyeStyle === 'default' || !['round','sleepy','almond','hooded','monolid'].includes(eyeStyle)) && (
                <>
                  <ellipse cx="83" cy="86" rx="6.5" ry="5" />
                  <ellipse cx="117" cy="86" rx="6.5" ry="5" />
                  <circle cx="81" cy="84" r="1.5" fill="white" opacity="0.6" />
                  <circle cx="115" cy="84" r="1.5" fill="white" opacity="0.6" />
                </>
              )}
            </g>
          )}
        </g>

        {/* 6. Mouth */}
        <g transform={t(positions.mouth)}>
          {customMouthUrl ? (
            <image href={customMouthUrl} x="82" y="104" width="36" height="20"
              preserveAspectRatio="xMidYMid meet" />
          ) : (
            <g stroke={eyeColor} strokeWidth="2" fill="transparent" strokeLinecap="round">
              {mouthStyle === 'smile' && <path d="M 88 110 Q 100 122 112 110" />}
              {mouthStyle === 'neutral' && <line x1="88" y1="112" x2="112" y2="112" />}
              {mouthStyle === 'smirk' && <path d="M 88 113 Q 98 108 112 110" />}
              {mouthStyle === 'open' && (
                <ellipse cx="100" cy="113" rx="9" ry="6" fill="#cc5c5c" stroke={eyeColor} strokeWidth="1.5" />
              )}
              {mouthStyle === 'wide-smile' && <path d="M 84 109 Q 100 126 116 109" />}
              {!['smile','neutral','smirk','open','wide-smile'].includes(mouthStyle) && (
                <path d="M 88 110 Q 100 122 112 110" />
              )}
            </g>
          )}
        </g>

        {/* 7. Accessory */}
        {accessory && accessory !== 'none' && (
          <g transform={t(positions.accessory)}>
            {customAccessoryUrl ? (
              <image href={customAccessoryUrl} x="68" y="70" width="64" height="36"
                preserveAspectRatio="xMidYMid meet" />
            ) : (
              <>
                {accessory === 'glasses' && (
                  <g stroke={accessoryColor} strokeWidth="2" fill={accessoryColor} fillOpacity="0.15">
                    <circle cx="83" cy="86" r="11" />
                    <circle cx="117" cy="86" r="11" />
                    <line x1="94" y1="86" x2="106" y2="86" strokeWidth="2" />
                    <line x1="72" y1="82" x2="68" y2="78" strokeWidth="1.5" />
                    <line x1="128" y1="82" x2="132" y2="78" strokeWidth="1.5" />
                  </g>
                )}
                {accessory === 'sunglasses' && (
                  <g>
                    <rect x="72" y="79" width="22" height="14" rx="5" fill="#111" />
                    <rect x="106" y="79" width="22" height="14" rx="5" fill="#111" />
                    <line x1="94" y1="86" x2="106" y2="86" stroke={accessoryColor} strokeWidth="2" />
                    <line x1="72" y1="83" x2="68" y2="79" stroke={accessoryColor} strokeWidth="1.5" />
                    <line x1="128" y1="83" x2="132" y2="79" stroke={accessoryColor} strokeWidth="1.5" />
                  </g>
                )}
                {accessory === 'hat' && (
                  <g fill={accessoryColor}>
                    <rect x="63" y="54" width="74" height="11" rx="4" />
                    <rect x="76" y="30" width="48" height="27" rx="5" />
                  </g>
                )}
                {accessory === 'headphones' && (
                  <g stroke={accessoryColor} strokeWidth="3" fill="none">
                    <path d="M 60 90 Q 60 48 100 48 Q 140 48 140 90" />
                    <rect x="54" y="83" width="13" height="18" rx="4" fill={accessoryColor} stroke="none" />
                    <rect x="133" y="83" width="13" height="18" rx="4" fill={accessoryColor} stroke="none" />
                  </g>
                )}
                {accessory === 'crown' && (
                  /* Crown keeps its iconic gold + gem look regardless of accessoryColor */
                  <g fill="#f59e0b" stroke="#d97706" strokeWidth="1">
                    <path d="M 70 60 L 75 40 L 90 52 L 100 36 L 110 52 L 125 40 L 130 60 Z" />
                    <circle cx="75" cy="42" r="3" fill="#ef4444" stroke="none" />
                    <circle cx="100" cy="38" r="3" fill="#3b82f6" stroke="none" />
                    <circle cx="125" cy="42" r="3" fill="#10b981" stroke="none" />
                  </g>
                )}
              </>
            )}
          </g>
        )}
      </svg>
    </div>
  );
};

export { AvatarPreview };
export default AvatarPreview;
