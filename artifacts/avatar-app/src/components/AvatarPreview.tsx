import React from 'react';
import { SKIN_TONES, HAIR_COLORS } from '../lib/constants';

interface AvatarPreviewProps {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeStyle: string;
  mouthStyle: string;
  outfitStyle: string;
  accessory: string | null;
  customPartImages?: Record<string, string>;
  size?: string;
  className?: string;
}

const AvatarPreview: React.FC<AvatarPreviewProps> = ({
  skinTone,
  hairStyle,
  hairColor,
  eyeStyle,
  mouthStyle,
  outfitStyle,
  accessory,
  customPartImages = {},
  className = "",
}) => {
  const skinHex = SKIN_TONES.find(s => s.id === skinTone)?.hex || SKIN_TONES[0].hex;
  const hairHex = HAIR_COLORS.find(h => h.id === hairColor)?.hex || HAIR_COLORS[0].hex;

  const customHairUrl = customPartImages[hairStyle];
  const customEyeUrl = customPartImages[eyeStyle];
  const customMouthUrl = customPartImages[mouthStyle];
  const customOutfitUrl = customPartImages[outfitStyle];
  const customAccessoryUrl = accessory ? customPartImages[accessory] : undefined;

  return (
    <div className={`relative w-full h-full aspect-square bg-muted rounded-2xl overflow-hidden flex items-center justify-center border border-border shadow-inner ${className}`}>
      <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-md">
        <defs>
          <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--background)" stopOpacity="0" />
          </radialGradient>
          <clipPath id="headClip">
            <circle cx="100" cy="90" r="50" />
          </clipPath>
          <clipPath id="bodyClip">
            <rect x="40" y="120" width="120" height="80" />
          </clipPath>
        </defs>

        {/* Background ambient glow */}
        <circle cx="100" cy="100" r="90" fill="url(#bgGlow)" opacity="0.5" />

        {/* Body / Outfit */}
        <g id="outfit">
          {customOutfitUrl ? (
            <image
              href={customOutfitUrl}
              x="40" y="125" width="120" height="75"
              preserveAspectRatio="xMidYMid meet"
              clipPath="url(#bodyClip)"
            />
          ) : outfitStyle === 'hoodie' ? (
            <path d="M50 200 Q 50 130 100 130 Q 150 130 150 200" fill="#4f46e5" />
          ) : (
            <path d="M60 200 Q 60 140 100 140 Q 140 140 140 200" fill="#2563eb" />
          )}
        </g>

        {/* Head */}
        <circle cx="100" cy="90" r="45" fill={skinHex} />

        {/* Hair */}
        <g id="hair">
          {customHairUrl ? (
            <image
              href={customHairUrl}
              x="48" y="38" width="104" height="70"
              preserveAspectRatio="xMidYMid meet"
              clipPath="url(#headClip)"
            />
          ) : (
            <g fill={hairHex}>
              {hairStyle === 'short' && (
                <path d="M 50 90 Q 50 40 100 40 Q 150 40 150 90 Q 150 70 100 50 Q 50 70 50 90" />
              )}
              {hairStyle === 'long' && (
                <path d="M 55 90 Q 55 35 100 35 Q 145 35 145 90 L 150 140 Q 100 120 50 140 Z" />
              )}
              {hairStyle === 'bun' && (
                <>
                  <path d="M 55 85 Q 55 40 100 40 Q 145 40 145 85 Q 145 60 100 50 Q 55 60 55 85" />
                  <circle cx="100" cy="42" r="10" />
                </>
              )}
              {hairStyle === 'curly' && (
                <path d="M 52 88 Q 45 55 65 42 Q 80 32 100 35 Q 120 32 135 42 Q 155 55 148 88 Q 130 50 100 45 Q 70 50 52 88" />
              )}
              {!['short', 'long', 'bun', 'curly'].includes(hairStyle) && (
                <path d="M 55 85 Q 55 40 100 40 Q 145 40 145 85 Q 145 60 100 45 Q 55 60 55 85" />
              )}
            </g>
          )}
        </g>

        {/* Eyes */}
        <g id="eyes">
          {customEyeUrl ? (
            <image
              href={customEyeUrl}
              x="70" y="75" width="60" height="22"
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <g fill="#1e1b4b">
              {eyeStyle === 'round' ? (
                <>
                  <circle cx="85" cy="85" r="5" />
                  <circle cx="115" cy="85" r="5" />
                </>
              ) : eyeStyle === 'sleepy' ? (
                <>
                  <path d="M80 86 Q85 82 90 86" fill="#1e1b4b" />
                  <path d="M110 86 Q115 82 120 86" fill="#1e1b4b" />
                </>
              ) : (
                <>
                  <ellipse cx="85" cy="85" rx="6" ry="4" />
                  <ellipse cx="115" cy="85" rx="6" ry="4" />
                </>
              )}
            </g>
          )}
        </g>

        {/* Mouth */}
        <g id="mouth">
          {customMouthUrl ? (
            <image
              href={customMouthUrl}
              x="82" y="102" width="36" height="20"
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <g stroke="#1e1b4b" strokeWidth="2" fill="transparent">
              {mouthStyle === 'smile' && <path d="M 90 110 Q 100 120 110 110" />}
              {mouthStyle === 'neutral' && <line x1="90" y1="110" x2="110" y2="110" />}
              {mouthStyle === 'open' && <circle cx="100" cy="110" r="4" fill="#1e1b4b" />}
              {mouthStyle === 'smirk' && <path d="M 90 112 Q 100 108 110 110" />}
              {!['smile', 'neutral', 'open', 'smirk'].includes(mouthStyle) && (
                <path d="M 85 110 Q 100 125 115 110" />
              )}
            </g>
          )}
        </g>

        {/* Accessory */}
        {accessory && accessory !== 'none' && (
          <g id="accessory">
            {customAccessoryUrl ? (
              <image
                href={customAccessoryUrl}
                x="70" y="70" width="60" height="35"
                preserveAspectRatio="xMidYMid meet"
              />
            ) : (
              <>
                {accessory === 'glasses' && (
                  <g stroke="#3b82f6" strokeWidth="2" fill="transparent">
                    <circle cx="85" cy="85" r="10" />
                    <circle cx="115" cy="85" r="10" />
                    <line x1="95" y1="85" x2="105" y2="85" />
                  </g>
                )}
                {accessory === 'sunglasses' && (
                  <g fill="#000000">
                    <rect x="75" y="78" width="20" height="14" rx="4" />
                    <rect x="105" y="78" width="20" height="14" rx="4" />
                    <line x1="95" y1="85" x2="105" y2="85" stroke="#000" strokeWidth="2" />
                  </g>
                )}
                {accessory === 'hat' && (
                  <g fill={hairHex}>
                    <rect x="65" y="52" width="70" height="12" rx="2" />
                    <rect x="78" y="32" width="44" height="24" rx="4" />
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
