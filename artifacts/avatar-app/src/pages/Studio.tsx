import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { AvatarPreview, type PartPositionsMap } from "@/components/AvatarPreview";
import {
  useGetMe, useGetMyAvatar, useSaveAvatar, useGetVoices,
  getGetMeQueryKey, getGetMyAvatarQueryKey,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Square, SlidersHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import { SKIN_TONES, HAIR_COLORS, EYE_COLORS, OUTFIT_COLORS, ACCESSORY_COLORS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

interface DbPart {
  id: number; category: string; name: string; label: string;
  imageUrl: string; isActive: boolean; isBuiltIn: boolean;
  allowColorOverride: boolean; sortOrder: number;
}

interface VoiceConfig {
  id: number; name: string; description: string;
  pitch: number; rate: number; browserVoiceName?: string | null;
}

// ── Position controls ─────────────────────────────────────────────────────────
function AxisSlider({ label, value, onChange }: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-4">{label}</span>
      <input type="range" min="-40" max="40" step="1" value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 accent-primary" />
      <span className="text-xs text-muted-foreground w-8 text-right">
        {value > 0 ? `+${value}` : value}
      </span>
    </div>
  );
}

function PositionControl({ part, positions, onChange }: {
  part: keyof PartPositionsMap;
  positions: PartPositionsMap;
  onChange: (part: keyof PartPositionsMap, pos: { x: number; y: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const pos = positions[part] ?? { x: 0, y: 0 };
  const isSet = pos.x !== 0 || pos.y !== 0;
  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${isSet ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
        <SlidersHorizontal className="h-3 w-3" />
        Position{isSet ? ` (${pos.x > 0 ? '+' : ''}${pos.x}, ${pos.y > 0 ? '+' : ''}${pos.y})` : ''}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-1.5 p-2.5 bg-muted/60 rounded-lg space-y-2">
          <AxisSlider label="X" value={pos.x} onChange={v => onChange(part, { ...pos, x: v })} />
          <AxisSlider label="Y" value={pos.y} onChange={v => onChange(part, { ...pos, y: v })} />
          {isSet && (
            <button type="button" className="text-xs text-destructive hover:underline"
              onClick={() => onChange(part, { x: 0, y: 0 })}>Reset</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Color dot row ─────────────────────────────────────────────────────────────
function ColorPicker({ label, colors, value, onChange }: {
  label: string;
  colors: { id: string; hex: string; name: string }[];
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      <div className="flex flex-wrap gap-2">
        {colors.map(c => (
          <button key={c.id} onClick={() => onChange(c.id)}
            title={c.name}
            className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${value === c.id ? 'border-primary ring-2 ring-primary ring-offset-1 ring-offset-background' : 'border-border'}`}
            style={{ backgroundColor: c.hex }} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function Studio() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: userLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const { data: avatarData, isLoading: avatarLoading } = useGetMyAvatar({ query: { queryKey: getGetMyAvatarQueryKey(), enabled: !!user } });
  const { data: voicesData } = useGetVoices();
  const saveAvatar = useSaveAvatar();
  const { toast } = useToast();

  const [settings, setSettings] = useState({
    skinTone: "light",
    hairStyle: "short",
    hairColor: "brown",
    eyeStyle: "default",
    eyeColor: "#1e1b4b",
    mouthStyle: "smile",
    outfitStyle: "casual",
    outfitColor: "#2563eb",
    accessory: "none",
    accessoryColor: "#3b82f6",
    voiceId: "Alloy",
  });
  const [partPositions, setPartPositions] = useState<PartPositionsMap>({});
  const [allParts, setAllParts] = useState<DbPart[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);
  const [testText, setTestText] = useState("Hello! This is how my voice sounds in your stream.");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => { if (!userLoading && !user) setLocation("/"); }, [user, userLoading, setLocation]);

  useEffect(() => {
    if (avatarData) {
      setSettings({
        skinTone: avatarData.skinTone,
        hairStyle: avatarData.hairStyle,
        hairColor: avatarData.hairColor,
        eyeStyle: avatarData.eyeStyle,
        eyeColor: avatarData.eyeColor ?? "#1e1b4b",
        mouthStyle: avatarData.mouthStyle,
        outfitStyle: avatarData.outfitStyle,
        outfitColor: avatarData.outfitColor ?? "#2563eb",
        accessory: avatarData.accessory ?? "none",
        accessoryColor: avatarData.accessoryColor ?? "#3b82f6",
        voiceId: avatarData.voiceId,
      });
      setPartPositions((avatarData.partPositions as PartPositionsMap) ?? {});
    }
  }, [avatarData]);

  useEffect(() => {
    fetch("/api/parts")
      .then(r => r.json())
      .then((d: { parts: DbPart[] }) => setAllParts(d.parts ?? []))
      .catch(() => {})
      .finally(() => setPartsLoading(false));
  }, []);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const load = () => setBrowserVoices([...window.speechSynthesis.getVoices()]);
    load();
    window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  const update = (key: string, value: string) => setSettings(p => ({ ...p, [key]: value }));
  const updatePosition = (part: keyof PartPositionsMap, pos: { x: number; y: number }) =>
    setPartPositions(p => ({ ...p, [part]: pos }));

  function handleTestVoice() {
    if (!window.speechSynthesis || !testText.trim()) return;
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const voices = voicesData?.voices ?? [];
    const voiceConfig = (voices as VoiceConfig[]).find(v => v.name.toLowerCase() === settings.voiceId.toLowerCase());
    const utt = new SpeechSynthesisUtterance(testText.trim());
    utt.pitch = voiceConfig?.pitch ?? 1.0;
    utt.rate = voiceConfig?.rate ?? 1.0;
    if (voiceConfig?.browserVoiceName) {
      const bv = browserVoices.find(v => v.name === voiceConfig.browserVoiceName);
      if (bv) utt.voice = bv;
    }
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => setIsSpeaking(false);
    utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  }

  function handleSave() {
    const cleanPos: PartPositionsMap = {};
    for (const [k, v] of Object.entries(partPositions)) {
      if (v && (v.x !== 0 || v.y !== 0)) (cleanPos as Record<string, typeof v>)[k] = v;
    }
    saveAvatar.mutate({
      data: {
        ...settings,
        accessory: settings.accessory === "none" ? null : settings.accessory,
        partPositions: cleanPos,
      },
    }, {
      onSuccess: () => toast({ title: "Avatar saved!", description: "Your profile has been updated." }),
      onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
    });
  }

  // Build customPartImages map (only parts with a real imageUrl)
  const customPartImages: Record<string, string> = {};
  allParts.forEach(p => { if (p.imageUrl) customPartImages[p.name] = p.imageUrl; });

  // Build per-category option lists from DB only (no hardcoded arrays)
  function partOptions(category: string) {
    return allParts.filter(p => p.category === category).map(p => ({
      value: p.name, label: p.label, isBuiltIn: p.isBuiltIn,
      allowColorOverride: p.allowColorOverride,
    }));
  }

  const hairOpts   = partOptions("hair_style");
  const eyeOpts    = partOptions("eye_style");
  const mouthOpts  = partOptions("mouth_style");
  const outfitOpts = partOptions("outfit_style");
  const accessOpts = partOptions("accessory");

  // Check if selected accessory allows colour override
  const selectedAccessoryPart = allParts.find(p => p.name === settings.accessory);
  const accessoryCanColor = settings.accessory !== "none"
    && (selectedAccessoryPart?.allowColorOverride ?? true)
    && settings.accessory !== "crown"; // crown has its own fixed gem look

  const voices = voicesData?.voices ?? [];

  if (userLoading || avatarLoading) {
    return <Layout><div className="flex-1 flex items-center justify-center">Loading studio…</div></Layout>;
  }
  if (!user) return null;

  return (
    <Layout>
      <div className="container max-w-7xl mx-auto p-4 flex-1 flex flex-col md:flex-row gap-8">
        {/* Preview */}
        <div className="w-full md:w-[380px] flex-shrink-0">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-xl sticky top-24">
            <h2 className="text-xl font-bold font-mono mb-4 text-center">Live Preview</h2>
            <AvatarPreview
              {...settings}
              customPartImages={customPartImages}
              partPositions={partPositions}
            />
            <div className="mt-6 flex gap-3">
              <Button onClick={handleSave} className="flex-1" disabled={saveAvatar.isPending}>
                {saveAvatar.isPending ? "Saving…" : "Save Avatar"}
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/profile">View Profile</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 bg-card border border-border rounded-3xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-6 border-b border-border bg-muted/30">
            <h1 className="text-2xl font-bold font-mono">Customization Studio</h1>
            <p className="text-muted-foreground text-sm">Adjust appearance and position of each part, then save.</p>
          </div>

          <ScrollArea className="flex-1 p-6">
            <Tabs defaultValue="appearance">
              <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
                <TabsTrigger value="appearance" className="text-base h-full">Appearance</TabsTrigger>
                <TabsTrigger value="voice" className="text-base h-full">Voice & TTS</TabsTrigger>
              </TabsList>

              <TabsContent value="appearance" className="space-y-8">
                {/* Skin tone */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Skin Tone</Label>
                  <div className="flex flex-wrap gap-3">
                    {SKIN_TONES.map(t => (
                      <button key={t.id} onClick={() => update('skinTone', t.id)} title={t.name}
                        className={`w-12 h-12 rounded-full border-2 transition-all hover:scale-110 ${settings.skinTone === t.id ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-border'}`}
                        style={{ backgroundColor: t.hex }} />
                    ))}
                  </div>
                </div>

                {/* Hair colour */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Hair Colour</Label>
                  <div className="flex flex-wrap gap-3">
                    {HAIR_COLORS.map(c => (
                      <button key={c.id} onClick={() => update('hairColor', c.id)} title={c.name}
                        className={`w-12 h-12 rounded-full border-2 transition-all hover:scale-110 ${settings.hairColor === c.id ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-border'}`}
                        style={{ backgroundColor: c.hex }} />
                    ))}
                  </div>
                </div>

                {/* Part selectors */}
                {partsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading options…</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { key: 'hairStyle',  label: 'Hair Style',  part: 'hair'      as const, opts: hairOpts   },
                      { key: 'eyeStyle',   label: 'Eye Style',   part: 'eyes'      as const, opts: eyeOpts    },
                      { key: 'mouthStyle', label: 'Mouth Style', part: 'mouth'     as const, opts: mouthOpts  },
                      { key: 'outfitStyle',label: 'Outfit',      part: 'outfit'    as const, opts: outfitOpts },
                      { key: 'accessory',  label: 'Accessory',   part: 'accessory' as const, opts: accessOpts },
                    ].map(({ key, label, part, opts }) => (
                      <div key={key} className="space-y-1">
                        <Label>{label}</Label>
                        <Select value={settings[key as keyof typeof settings]} onValueChange={v => update(key, v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {opts.map(o => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}
                                {!o.isBuiltIn && <span className="ml-2 text-xs text-purple-500">✦</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <PositionControl part={part} positions={partPositions} onChange={updatePosition} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Colour pickers */}
                <div className="space-y-6 pt-2 border-t border-border">
                  <Label className="text-base font-semibold block pt-4">Colours</Label>

                  <ColorPicker label="Eye Colour" colors={EYE_COLORS}
                    value={settings.eyeColor} onChange={v => update('eyeColor', v)} />

                  <ColorPicker label="Outfit Colour" colors={OUTFIT_COLORS}
                    value={settings.outfitColor} onChange={v => update('outfitColor', v)} />

                  {accessoryCanColor && (
                    <ColorPicker label="Accessory Colour" colors={ACCESSORY_COLORS}
                      value={settings.accessoryColor} onChange={v => update('accessoryColor', v)} />
                  )}
                </div>
              </TabsContent>

              <TabsContent value="voice" className="space-y-8 pt-4">
                <div className="space-y-4 max-w-md">
                  <Label className="text-lg font-semibold">TTS Voice</Label>
                  <p className="text-sm text-muted-foreground">Choose the voice your stream bot uses for chat messages.</p>
                  {voices.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">Loading voices…</p>
                  ) : (
                    <Select value={settings.voiceId} onValueChange={v => update('voiceId', v)}>
                      <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {(voices as VoiceConfig[]).map(v => (
                          <SelectItem key={v.id} value={v.name}>
                            <span className="font-medium">{v.name}</span>
                            {v.description && (
                              <span className="ml-3 text-muted-foreground text-xs">{v.description}</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-4 max-w-md">
                  <div>
                    <Label className="text-base font-semibold">Preview Voice</Label>
                    <p className="text-sm text-muted-foreground mt-1">Hear it before saving.</p>
                  </div>
                  <Textarea value={testText} onChange={e => setTestText(e.target.value)}
                    placeholder="Type something to preview…" className="resize-none" rows={3} />
                  <Button onClick={handleTestVoice}
                    variant={isSpeaking ? "destructive" : "outline"}
                    className="gap-2" disabled={!testText.trim()}>
                    {isSpeaking
                      ? <><Square className="h-4 w-4" /> Stop</>
                      : <><Play className="h-4 w-4" /> Play Voice</>}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </div>
      </div>
    </Layout>
  );
}
