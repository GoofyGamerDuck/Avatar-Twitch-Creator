import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { AvatarPreview, type PartPositionsMap, type AccessoryItem } from "@/components/AvatarPreview";
import {
  useGetMe, useGetMyAvatar, useSaveAvatar, useGetVoices,
  getGetMeQueryKey, getGetMyAvatarQueryKey,
} from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Play, Square, SlidersHorizontal, ChevronUp, ChevronDown, Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { SKIN_TONES, HAIR_COLORS, EYE_COLORS, OUTFIT_COLORS, ACCESSORY_COLORS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

interface DbPart {
  id: number; category: string; name: string; label: string;
  imageUrl: string; isActive: boolean; isBuiltIn: boolean;
  allowColorOverride: boolean; sortOrder: number;
}

interface VoiceConfig {
  id: number; name: string; description: string; pitch: number; rate: number;
  browserVoiceName?: string | null;
}

const FACE_LAYERS = [
  { key: 'fronthair', label: 'Front Hair' },
  { key: 'eyes',      label: 'Eyes' },
  { key: 'mouth',     label: 'Mouth' },
  { key: 'accessories', label: 'Accessories' },
] as const;

// ── Position + Scale control ──────────────────────────────────────────────────
function PositionControl({ partKey, positions, onChange }: {
  partKey: keyof PartPositionsMap;
  positions: PartPositionsMap;
  onChange: (part: keyof PartPositionsMap, pos: { x: number; y: number; scale: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const pos = positions[partKey] ?? { x: 0, y: 0, scale: 1 };
  const scale = pos.scale ?? 1;
  const isSet = pos.x !== 0 || pos.y !== 0 || scale !== 1;

  function set(patch: Partial<{ x: number; y: number; scale: number }>) {
    onChange(partKey, { x: pos.x, y: pos.y, scale, ...patch });
  }

  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${isSet ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
        <SlidersHorizontal className="h-3 w-3" />
        {isSet ? `(${pos.x > 0 ? '+' : ''}${pos.x}, ${pos.y > 0 ? '+' : ''}${pos.y}, ${scale.toFixed(1)}×)` : 'Position & Scale'}
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-1.5 p-2.5 bg-muted/60 rounded-lg space-y-2">
          {[
            { label: 'X', value: pos.x, min: -40, max: 40, step: 1, format: (v: number) => v > 0 ? `+${v}` : String(v), onChange: (v: number) => set({ x: v }) },
            { label: 'Y', value: pos.y, min: -40, max: 40, step: 1, format: (v: number) => v > 0 ? `+${v}` : String(v), onChange: (v: number) => set({ y: v }) },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-4">{s.label}</span>
              <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                onChange={e => s.onChange(Number(e.target.value))}
                className="flex-1 h-1.5 accent-primary" />
              <span className="text-xs text-muted-foreground w-10 text-right">{s.format(s.value)}</span>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-4">S</span>
            <input type="range" min="0.25" max="2.0" step="0.05" value={scale}
              onChange={e => set({ scale: Number(e.target.value) })}
              className="flex-1 h-1.5 accent-primary" />
            <span className="text-xs text-muted-foreground w-10 text-right">{scale.toFixed(2)}×</span>
          </div>
          {isSet && (
            <button type="button" className="text-xs text-destructive hover:underline"
              onClick={() => set({ x: 0, y: 0, scale: 1 })}>Reset</button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Colour dot picker ─────────────────────────────────────────────────────────
function ColorPicker({ label, colors, value, onChange, small }: {
  label?: string; colors: { id: string; hex: string; name: string }[];
  value: string; onChange: (hex: string) => void; small?: boolean;
}) {
  return (
    <div className="space-y-2">
      {label && <Label className="text-sm">{label}</Label>}
      <div className="flex flex-wrap gap-1.5">
        {colors.map(c => (
          <button key={c.id} onClick={() => onChange(c.id)} title={c.name}
            className={`rounded-full border-2 transition-all hover:scale-110 ${small ? 'w-6 h-6' : 'w-8 h-8'} ${value === c.id ? 'border-primary ring-2 ring-primary ring-offset-1 ring-offset-background' : 'border-border'}`}
            style={{ backgroundColor: c.hex }} />
        ))}
      </div>
    </div>
  );
}

// ── Accessories multi-select ──────────────────────────────────────────────────
function AccessoriesEditor({
  accessories, allParts, onChange,
}: {
  accessories: AccessoryItem[];
  allParts: DbPart[];
  onChange: (acc: AccessoryItem[]) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const MAX = 5;
  const accessoryParts = allParts.filter(p => p.category === 'accessory');
  const selectedNames = new Set(accessories.map(a => a.name));
  const available = accessoryParts.filter(p => !selectedNames.has(p.name));

  function add(part: DbPart) {
    if (accessories.length >= MAX) return;
    onChange([...accessories, { name: part.name, color: '#3b82f6' }]);
    setAddOpen(false);
  }

  function remove(idx: number) {
    onChange(accessories.filter((_, i) => i !== idx));
  }

  function setColor(idx: number, color: string) {
    onChange(accessories.map((a, i) => i === idx ? { ...a, color } : a));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">
          Accessories <span className="text-muted-foreground font-normal text-sm">({accessories.length}/{MAX})</span>
        </Label>
        {accessories.length < MAX && (
          <div className="relative">
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"
              onClick={() => setAddOpen(o => !o)}>
              <Plus className="h-3 w-3" /> Add
            </Button>
            {addOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg min-w-36 py-1">
                {available.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">None available</p>}
                {available.map(p => (
                  <button key={p.id} onClick={() => add(p)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors">
                    {p.label}
                    {!p.isBuiltIn && <span className="ml-1 text-xs text-purple-500">✦</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {accessories.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No accessories selected. Click Add to choose one.</p>
      )}

      <div className="space-y-2">
        {accessories.map((acc, idx) => {
          const part = allParts.find(p => p.name === acc.name);
          const canColor = part?.allowColorOverride !== false && acc.name !== 'crown';
          return (
            <div key={`${acc.name}-${idx}`}
              className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/50">
              <span className="flex-1 text-sm font-medium capitalize">
                {part?.label ?? acc.name}
                {part && !part.isBuiltIn && <span className="ml-1 text-xs text-purple-500">✦</span>}
              </span>
              {canColor && (
                <ColorPicker
                  colors={ACCESSORY_COLORS} value={acc.color}
                  onChange={c => setColor(idx, c)} small />
              )}
              <button onClick={() => remove(idx)}
                className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Layer order editor ────────────────────────────────────────────────────────
function LayerOrderEditor({
  layerOrder, onChange,
}: {
  layerOrder: string[];
  onChange: (order: string[]) => void;
}) {
  const DEFAULT_ORDER = FACE_LAYERS.map(l => l.key);
  const resolved = (() => {
    const ordered = layerOrder.filter(k => (DEFAULT_ORDER as string[]).includes(k));
    const missing = DEFAULT_ORDER.filter(k => !ordered.includes(k));
    return [...ordered, ...missing];
  })();

  function move(idx: number, dir: -1 | 1) {
    const next = [...resolved];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange(next);
  }

  function reset() { onChange([]); }

  const isDefault = JSON.stringify(resolved) === JSON.stringify(DEFAULT_ORDER);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Face Layer Order</h3>
          <p className="text-xs text-muted-foreground">Bottom of list = renders behind. Top = renders in front.</p>
        </div>
        {!isDefault && (
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={reset}>Reset</Button>
        )}
      </div>
      <div className="space-y-1.5">
        {[...resolved].reverse().map((key, reversedIdx) => {
          const realIdx = resolved.length - 1 - reversedIdx;
          const layer = FACE_LAYERS.find(l => l.key === key);
          return (
            <div key={key}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card">
              <span className="flex-1 text-sm font-medium">{layer?.label ?? key}</span>
              <span className="text-xs text-muted-foreground px-1.5">
                {reversedIdx === 0 ? '▲ front' : reversedIdx === resolved.length - 1 ? '▼ behind' : ''}
              </span>
              <Button size="icon" variant="ghost" className="h-6 w-6"
                onClick={() => move(realIdx, -1)} disabled={realIdx === 0}>
                <ArrowDown className="h-3 w-3" />
              </Button>
              <Button size="icon" variant="ghost" className="h-6 w-6"
                onClick={() => move(realIdx, 1)} disabled={realIdx === resolved.length - 1}>
                <ArrowUp className="h-3 w-3" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Studio ───────────────────────────────────────────────────────────────
export default function Studio() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: userLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const { data: avatarData, isLoading: avatarLoading } = useGetMyAvatar({ query: { queryKey: getGetMyAvatarQueryKey(), enabled: !!user } });
  const { data: voicesData } = useGetVoices();
  const saveAvatar = useSaveAvatar();
  const { toast } = useToast();

  const [settings, setSettings] = useState({
    skinTone: "light", hairStyle: "short", hairColor: "brown",
    eyeStyle: "default", eyeColor: "#1e1b4b", eyeWidth: 1.0,
    mouthStyle: "smile", outfitStyle: "casual", outfitColor: "#2563eb",
    accessoryColor: "#3b82f6", voiceId: "Alloy",
  });
  const [accessories, setAccessories] = useState<AccessoryItem[]>([]);
  const [partPositions, setPartPositions] = useState<PartPositionsMap>({});
  const [layerOrder, setLayerOrder] = useState<string[]>([]);
  const [allParts, setAllParts] = useState<DbPart[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);
  const [testText, setTestText] = useState("Hello! This is how my voice sounds in your stream.");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => { if (!userLoading && !user) setLocation("/"); }, [user, userLoading, setLocation]);

  useEffect(() => {
    if (!avatarData) return;
    setSettings({
      skinTone: avatarData.skinTone, hairStyle: avatarData.hairStyle, hairColor: avatarData.hairColor,
      eyeStyle: avatarData.eyeStyle, eyeColor: avatarData.eyeColor ?? "#1e1b4b",
      eyeWidth: avatarData.eyeWidth ?? 1.0,
      mouthStyle: avatarData.mouthStyle, outfitStyle: avatarData.outfitStyle,
      outfitColor: avatarData.outfitColor ?? "#2563eb",
      accessoryColor: avatarData.accessoryColor ?? "#3b82f6",
      voiceId: avatarData.voiceId,
    });
    // Migrate single accessory → multi
    const loaded = avatarData.accessories?.length
      ? avatarData.accessories as AccessoryItem[]
      : (avatarData.accessory && avatarData.accessory !== 'none'
        ? [{ name: avatarData.accessory, color: avatarData.accessoryColor ?? '#3b82f6' }]
        : []);
    setAccessories(loaded);
    setPartPositions((avatarData.partPositions as PartPositionsMap) ?? {});
    setLayerOrder((avatarData.layerOrder as string[]) ?? []);
  }, [avatarData]);

  useEffect(() => {
    fetch("/api/parts").then(r => r.json())
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

  const update = (key: string, value: string | number) => setSettings(p => ({ ...p, [key]: value }));

  function handleTestVoice() {
    if (!window.speechSynthesis || !testText.trim()) return;
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const voices = (voicesData?.voices ?? []) as VoiceConfig[];
    const vc = voices.find(v => v.name.toLowerCase() === settings.voiceId.toLowerCase());
    const utt = new SpeechSynthesisUtterance(testText.trim());
    utt.pitch = vc?.pitch ?? 1.0; utt.rate = vc?.rate ?? 1.0;
    if (vc?.browserVoiceName) {
      const bv = browserVoices.find(v => v.name === vc.browserVoiceName);
      if (bv) utt.voice = bv;
    }
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = utt.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utt);
  }

  function handleSave() {
    const cleanPos: PartPositionsMap = {};
    for (const [k, v] of Object.entries(partPositions)) {
      if (v && (v.x !== 0 || v.y !== 0 || (v.scale ?? 1) !== 1)) {
        (cleanPos as Record<string, typeof v>)[k] = v;
      }
    }
    saveAvatar.mutate({
      data: {
        ...settings,
        accessories,
        accessory: accessories[0]?.name ?? null,
        layerOrder,
        partPositions: cleanPos,
      },
    }, {
      onSuccess: () => toast({ title: "Avatar saved!", description: "Your profile has been updated." }),
      onError: () => toast({ title: "Error", description: "Failed to save.", variant: "destructive" }),
    });
  }

  const customPartImages: Record<string, string> = {};
  allParts.forEach(p => { if (p.imageUrl) customPartImages[p.name] = p.imageUrl; });

  function partOptions(category: string) {
    return allParts.filter(p => p.category === category).map(p => ({
      value: p.name, label: p.label, isBuiltIn: p.isBuiltIn,
    }));
  }
  const hairOpts   = partOptions("hair_style");
  const eyeOpts    = partOptions("eye_style");
  const mouthOpts  = partOptions("mouth_style");
  const outfitOpts = partOptions("outfit_style");

  const voices = (voicesData?.voices ?? []) as VoiceConfig[];

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
            <AvatarPreview {...settings} accessories={accessories}
              customPartImages={customPartImages} partPositions={partPositions} layerOrder={layerOrder} />
            <div className="mt-6 space-y-2">
              <div className="flex gap-3">
                <Button onClick={handleSave} className="flex-1" disabled={saveAvatar.isPending}>
                  {saveAvatar.isPending ? "Saving…" : "Save Avatar"}
                </Button>
                <Button asChild variant="outline"><Link href="/profile">Profile</Link></Button>
              </div>
              <Button asChild variant="ghost" className="w-full text-xs h-8">
                <Link href="/cosmetics">✦ Request a Custom Cosmetic</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 bg-card border border-border rounded-3xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-6 border-b border-border bg-muted/30">
            <h1 className="text-2xl font-bold font-mono">Customization Studio</h1>
            <p className="text-muted-foreground text-sm">Design your avatar. Click Save when done.</p>
          </div>
          <ScrollArea className="flex-1 p-6">
            <Tabs defaultValue="appearance">
              <TabsList className="grid w-full grid-cols-3 mb-8 h-12">
                <TabsTrigger value="appearance" className="text-sm h-full">Appearance</TabsTrigger>
                <TabsTrigger value="layers" className="text-sm h-full">Layers & Scale</TabsTrigger>
                <TabsTrigger value="voice" className="text-sm h-full">Voice</TabsTrigger>
              </TabsList>

              {/* ── Appearance tab ─────────────────────────────── */}
              <TabsContent value="appearance" className="space-y-8">
                {/* Skin */}
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
                {partsLoading ? <p className="text-sm text-muted-foreground">Loading options…</p> : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { key: 'hairStyle',   label: 'Hair Style',  partKey: 'hair'   as const, opts: hairOpts },
                      { key: 'eyeStyle',    label: 'Eye Style',   partKey: 'eyes'   as const, opts: eyeOpts  },
                      { key: 'mouthStyle',  label: 'Mouth Style', partKey: 'mouth'  as const, opts: mouthOpts},
                      { key: 'outfitStyle', label: 'Outfit',      partKey: 'outfit' as const, opts: outfitOpts},
                    ].map(({ key, label, partKey, opts }) => (
                      <div key={key} className="space-y-1">
                        <Label>{label}</Label>
                        <Select value={settings[key as keyof typeof settings] as string} onValueChange={v => update(key, v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {opts.map(o => (
                              <SelectItem key={o.value} value={o.value}>
                                {o.label}{!o.isBuiltIn && <span className="ml-2 text-xs text-purple-500">✦</span>}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <PositionControl partKey={partKey} positions={partPositions}
                          onChange={(p, v) => setPartPositions(prev => ({ ...prev, [p]: v }))} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Eye width */}
                <div className="space-y-2">
                  <Label className="text-sm flex justify-between">
                    Eye Width <span className="text-muted-foreground font-normal">{settings.eyeWidth.toFixed(2)}×</span>
                  </Label>
                  <input type="range" min="0.4" max="2.0" step="0.05" value={settings.eyeWidth}
                    onChange={e => update('eyeWidth', Number(e.target.value))}
                    className="w-full accent-primary h-1.5" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Narrow (0.4×)</span><span>Wide (2.0×)</span>
                  </div>
                </div>

                {/* Accessories */}
                <AccessoriesEditor accessories={accessories} allParts={allParts} onChange={setAccessories} />
                {/* Accessory group position */}
                {accessories.length > 0 && (
                  <div className="pl-2 border-l-2 border-primary/20">
                    <Label className="text-xs text-muted-foreground">Accessory group offset & scale</Label>
                    <PositionControl partKey="accessory" positions={partPositions}
                      onChange={(p, v) => setPartPositions(prev => ({ ...prev, [p]: v }))} />
                  </div>
                )}

                {/* Colours */}
                <div className="space-y-5 pt-3 border-t border-border">
                  <Label className="text-base font-semibold block pt-2">Colours</Label>
                  <ColorPicker label="Eye Colour" colors={EYE_COLORS} value={settings.eyeColor} onChange={v => update('eyeColor', v)} />
                  <ColorPicker label="Outfit Colour" colors={OUTFIT_COLORS} value={settings.outfitColor} onChange={v => update('outfitColor', v)} />
                </div>
              </TabsContent>

              {/* ── Layers & Scale tab ─────────────────────────── */}
              <TabsContent value="layers" className="space-y-8 pt-4">
                <LayerOrderEditor layerOrder={layerOrder} onChange={setLayerOrder} />
              </TabsContent>

              {/* ── Voice tab ──────────────────────────────────── */}
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
                        {voices.map(v => (
                          <SelectItem key={v.id} value={v.name}>
                            <span className="font-medium">{v.name}</span>
                            {v.description && <span className="ml-3 text-muted-foreground text-xs">{v.description}</span>}
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
                  <Button onClick={handleTestVoice} variant={isSpeaking ? "destructive" : "outline"}
                    className="gap-2" disabled={!testText.trim()}>
                    {isSpeaking ? <><Square className="h-4 w-4" /> Stop</> : <><Play className="h-4 w-4" /> Play</>}
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
