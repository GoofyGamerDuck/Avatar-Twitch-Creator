import { useState, useEffect, useRef } from "react";
import AvatarPreview from "@/components/AvatarPreview";

interface AvatarData {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  eyeStyle: string;
  mouthStyle: string;
  outfitStyle: string;
  accessory: string | null;
  voiceId: string;
}

interface ChatMessage {
  id: string;
  username: string;
  displayName: string;
  message: string;
  color: string | null;
  avatar: AvatarData | null;
  profileImageUrl: string | null;
}

const VOICE_PARAMS: Record<string, { pitch: number; rate: number }> = {
  alloy: { pitch: 1.0, rate: 1.0 },
  echo: { pitch: 0.85, rate: 0.9 },
  fable: { pitch: 1.15, rate: 1.05 },
  onyx: { pitch: 0.7, rate: 0.85 },
  nova: { pitch: 1.2, rate: 1.1 },
  shimmer: { pitch: 1.3, rate: 1.05 },
};

function speakMessage(text: string, voiceId: string) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  const params = VOICE_PARAMS[voiceId] ?? VOICE_PARAMS.alloy;
  utt.pitch = params.pitch;
  utt.rate = params.rate;
  window.speechSynthesis.speak(utt);
}

export default function Overlay() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  const channel = params.get("channel") ?? "";

  const [current, setCurrent] = useState<ChatMessage | null>(null);
  const [visible, setVisible] = useState(false);
  const queueRef = useRef<ChatMessage[]>([]);
  const busyRef = useRef(false);

  function processQueue() {
    if (busyRef.current || queueRef.current.length === 0) return;
    const msg = queueRef.current.shift()!;
    busyRef.current = true;
    setCurrent(msg);
    setVisible(true);

    if (msg.avatar?.voiceId) {
      speakMessage(msg.message, msg.avatar.voiceId);
    }

    const duration = Math.max(4000, msg.message.length * 60);
    setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        busyRef.current = false;
        setCurrent(null);
        processQueue();
      }, 500);
    }, duration);
  }

  useEffect(() => {
    if (!channel) return;
    const es = new EventSource(`/api/chat/stream?channel=${encodeURIComponent(channel)}`);

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ChatMessage;
        queueRef.current.push(msg);
        processQueue();
      } catch {
        // ignore
      }
    };

    return () => es.close();
  }, [channel]);

  if (!channel) {
    return (
      <div style={{ padding: 16, color: "white", fontSize: 14, opacity: 0.7 }}>
        No channel specified. Add ?channel=USERNAME to the URL.
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        right: 24,
        pointerEvents: "none",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {current && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(8px)",
            borderRadius: 12,
            padding: "10px 16px",
            maxWidth: 520,
            transform: visible ? "translateY(0)" : "translateY(40px)",
            opacity: visible ? 1 : 0,
            transition: "transform 0.4s cubic-bezier(.22,1,.36,1), opacity 0.3s ease",
          }}
        >
          <div style={{ flexShrink: 0, width: 56, height: 56 }}>
            {current.avatar ? (
              <AvatarPreview
                skinTone={current.avatar.skinTone}
                hairStyle={current.avatar.hairStyle}
                hairColor={current.avatar.hairColor}
                eyeStyle={current.avatar.eyeStyle}
                mouthStyle={current.avatar.mouthStyle}
                outfitStyle={current.avatar.outfitStyle}
                accessory={current.avatar.accessory}
                size="sm"
              />
            ) : current.profileImageUrl ? (
              <img
                src={current.profileImageUrl}
                alt={current.displayName}
                style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#6B46C1",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  fontWeight: "bold",
                  fontSize: 22,
                }}
              >
                {current.displayName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                color: current.color ?? "#A78BFA",
                marginBottom: 2,
              }}
            >
              {current.displayName}
            </div>
            <div
              style={{
                color: "white",
                fontSize: 14,
                lineHeight: 1.4,
                wordBreak: "break-word",
              }}
            >
              {current.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
