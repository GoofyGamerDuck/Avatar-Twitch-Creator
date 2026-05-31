export interface VoiceParams {
  rate: number;
  pitch: number;
}

export const VOICE_PARAMS: Record<string, VoiceParams> = {
  alloy:    { rate: 1.0,  pitch: 1.0 },
  echo:     { rate: 0.9,  pitch: 0.6 },
  fable:    { rate: 0.95, pitch: 1.1 },
  onyx:     { rate: 0.85, pitch: 0.5 },
  nova:     { rate: 1.1,  pitch: 1.3 },
  shimmer:  { rate: 1.0,  pitch: 1.2 },
  brian:    { rate: 1.0,  pitch: 0.9 },
  emma:     { rate: 0.95, pitch: 1.1 },
  amy:      { rate: 1.0,  pitch: 1.0 },
  joanna:   { rate: 0.9,  pitch: 1.0 },
  matthew:  { rate: 0.85, pitch: 0.8 },
  kimberly: { rate: 0.95, pitch: 1.1 },
  russell:  { rate: 1.1,  pitch: 0.9 },
};

let _currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(text: string, voiceId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!("speechSynthesis" in window)) {
      reject(new Error("Speech synthesis not supported"));
      return;
    }

    window.speechSynthesis.cancel();

    const params = VOICE_PARAMS[voiceId] ?? VOICE_PARAMS["alloy"];
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = params.rate;
    utterance.pitch = params.pitch;
    utterance.lang = "en-US";
    utterance.volume = 1;

    utterance.onend = () => resolve();
    utterance.onerror = (e) => {
      if (e.error !== "interrupted" && e.error !== "canceled") reject(e);
      else resolve();
    };

    _currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking(): void {
  window.speechSynthesis?.cancel();
  _currentUtterance = null;
}
