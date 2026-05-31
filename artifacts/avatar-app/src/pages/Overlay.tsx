import { useState, useEffect, useRef } from "react";
import AvatarPreview from "@/components/AvatarPreview";

interface AvatarData {
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

interface DbPart { id: number; name: string; imageUrl: string; }
interface VoiceConfig { name: string; pitch: number; rate: number; browserVoiceName?: string | null; elevenLabsVoiceId?: string | null; modelPath?: string | null; }

export default function Overlay() {
  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  const channel = params.get("channel") ?? "";

  const [current, setCurrent] = useState<ChatMessage | null>(null);
  const [visible, setVisible] = useState(false);
  const [customPartImages, setCustomPartImages] = useState<Record<string, string>>({});
  const [voiceMap, setVoiceMap] = useState<Record<string, VoiceConfig>>({});
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const queueRef = useRef<ChatMessage[]>([]);
  const busyRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load parts and voices from API
  useEffect(() => {
    fetch("/api/parts")
      .then(r => r.json())
      .then((d: { parts: DbPart[] }) => {
        const map: Record<string, string> = {};
        d.parts?.forEach(p => { if (p.imageUrl) map[p.name] = p.imageUrl; });
        setCustomPartImages(map);
      })
      .catch(() => {});

    fetch("/api/voices")
      .then(r => r.json())
      .then((d: { voices: VoiceConfig[] }) => {
        const map: Record<string, VoiceConfig> = {};
        d.voices?.forEach(v => { map[v.name.toLowerCase()] = v; });
        setVoiceMap(map);
      })
      .catch(() => {});
  }, []);

  // Load browser voices
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const load = () => setBrowserVoices([...window.speechSynthesis.getVoices()]);
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  function speakMessage(text: string, voiceId: string) {
    const vc = voiceMap[voiceId.toLowerCase()];

    // Stop any existing audio
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    window.speechSynthesis?.cancel();

    if (vc?.elevenLabsVoiceId || vc?.modelPath) {
      // Use server-side TTS (ElevenLabs or Piper)
      const url = `/api/tts/synthesize?voiceId=${encodeURIComponent(voiceId)}&text=${encodeURIComponent(text)}`;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(() => {});
      return;
    }

    // Browser SpeechSynthesis fallback
    if (!window.speechSynthesis) return;
    const utt = new SpeechSynthesisUtterance(text);
    utt.pitch = vc?.pitch ?? 1.0;
    utt.rate = vc?.rate ?? 1.0;
    if (vc?.browserVoiceName) {
      const bv = browserVoices.find(v => v.name === vc.browserVoiceName);
      if (bv) utt.voice = bv;
    }
    window.speechSynthesis.speak(utt);
  }

  function processQueue() {
    if (busyRef.current || queueRef.current.length === 0) return;
    const msg = queueRef.current.shift()!;
    busyRef.current = true;
    setCurrent(msg);
    setVisible(true);
    if (msg.avatar?.voiceId) speakMessage(msg.message, msg.avatar.voiceId);
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
      } catch { /* ignore */ }
    };
    return () => es.close();
  }, [channel, voiceMap, browserVoices]);

  if (!channel) {
    return (
      <div style={{ padding: 16, color: "white", fontSize: 14, opacity: 0.7 }}>
        No channel specified. Add ?channel=USERNAME to the URL.
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", bottom: 24, left: 24, right: 24, pointerEvents: "none", fontFamily: "system-ui, sans-serif" }}>
      {current && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
          borderRadius: 12, padding: "10px 16px", maxWidth: 520,
          transform: visible ? "translateY(0)" : "translateY(40px)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.4s cubic-bezier(.22,1,.36,1), opacity 0.3s ease",
        }}>
          <div style={{ flexShrink: 0, width: 56, height: 56 }}>
            {current.avatar ? (
              <AvatarPreview
                skinTone={current.avatar.skinTone}
                hairStyle={current.avatar.hairStyle}
                hairColor={current.avatar.hairColor}
                eyeStyle={current.avatar.eyeStyle}
                eyeColor={current.avatar.eyeColor}
                mouthStyle={current.avatar.mouthStyle}
                outfitStyle={current.avatar.outfitStyle}
                outfitColor={current.avatar.outfitColor}
                accessory={current.avatar.accessory}
                accessoryColor={current.avatar.accessoryColor}
                customPartImages={customPartImages}

              />
            ) : current.profileImageUrl ? (
              <img src={current.profileImageUrl} alt={current.displayName}
                style={{ width: 56, height: 56, borderRadius: "50%", objectFit: "cover" }} />
            ) : (
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: "#6B46C1",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "white", fontWeight: "bold", fontSize: 22,
              }}>
                {current.displayName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: current.color ?? "#A78BFA", marginBottom: 2 }}>
              {current.displayName}
            </div>
            <div style={{ color: "white", fontSize: 14, lineHeight: 1.4, wordBreak: "break-word" }}>
              {current.message}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
