import { useState, useEffect, useRef, useCallback } from "react";
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
import { Input } from "@/components/ui/input";
import { Play, Square, SlidersHorizontal, ChevronUp, ChevronDown, Plus, X, ArrowUp, ArrowDown, BookmarkPlus, Bookmark, Trash2 } from "lucide-react";
import { HEAD_SHAPES, LAYER_LABELS, BASE_LAYERS, resolveColorHex } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
interface DbPart { id: number; category: string; name: string; label: string; imageUrl: string; isActive: boolean; isBuiltIn: boolean; allowColorOverride: boolean; sortOrder: number; }
interface VoiceConfig { id: number; name: string; description: string; pitch: number; rate: number; browserVoiceName?: string | null; }
interface SavedPreset { id: number; name: string; data: Record<string, unknown>; createdAt: string; }

// ── Native colour input ───────────────────────────────────────────────────────
function ColorInput({ label, value, onChange, className = "" }: {
  label?: string; value: string; onChange: (v: string) => void; className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const hex = value.startsWith('#') ? value : '#D6A371';
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && <Label className="text-sm">{label}</Label>}
      <button type="button" onClick={() => ref.current?.click()}
        className="w-full flex items-center gap-3 h-10 px-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-accent/50 transition-colors text-left">
        <span className="w-7 h-7 rounded-md border border-border/80 flex-shrink-0 shadow-sm" style={{ backgroundColor: hex }} />
        <span className="text-sm font-mono uppercase text-muted-foreground flex-1">{hex}</span>
        <span className="text-xs text-muted-foreground opacity-60">click</span>
      </button>
      <input ref={ref} type="color" value={hex} onChange={e => onChange(e.target.value)} className="sr-only" />
    </div>
  );
}

// ── Position, Scale, and optional extra sliders ───────────────────────────────
interface ExtraSlider { key: string; label: string; value: number; min: number; max: number; step: number; format?: (v: number) => string; onChange: (v: number) => void; }

function PositionControl({ partKey, positions, onChange, extra = [] }: {
  partKey: keyof PartPositionsMap; positions: PartPositionsMap;
  onChange: (part: keyof PartPositionsMap, pos: { x: number; y: number; scale: number }) => void;
  extra?: ExtraSlider[];
}) {
  const [open, setOpen] = useState(false);
  const p = positions[partKey] ?? { x: 0, y: 0, scale: 1 };
  const scale = p.scale ?? 1;
  const isSet = p.x !== 0 || p.y !== 0 || scale !== 1 || extra.some(s => s.value !== 1 && s.value !== 0);
  function set(patch: Partial<{ x: number; y: number; scale: number }>) {
    onChange(partKey, { x: p.x, y: p.y, scale, ...patch });
  }
  return (
    <div className="mt-1">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${isSet ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}>
        <SlidersHorizontal className="h-3 w-3" />
        <span>Position & Scale</span>
        {open ? <ChevronUp className="h-3 w-3 ml-0.5" /> : <ChevronDown className="h-3 w-3 ml-0.5" />}
      </button>
      {open && (
        <div className="mt-1.5 p-3 bg-muted/60 rounded-lg space-y-2 border border-border/40">
          {[
            { label: 'X', min: -90, max: 90, step: 1, value: p.x, fmt: (v: number) => v > 0 ? `+${v}` : String(v), onCh: (v: number) => set({ x: v }) },
            { label: 'Y', min: -90, max: 90, step: 1, value: p.y, fmt: (v: number) => v > 0 ? `+${v}` : String(v), onCh: (v: number) => set({ y: v }) },
            { label: 'Scale', min: 0.1, max: 3.0, step: 0.05, value: scale, fmt: (v: number) => `${v.toFixed(2)}×`, onCh: (v: number) => set({ scale: v }) },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-9">{s.label}</span>
              <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                onChange={e => s.onCh(Number(e.target.value))} className="flex-1 h-1.5 accent-primary" />
              <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">{s.fmt(s.value)}</span>
            </div>
          ))}
          {extra.map(s => (
            <div key={s.key} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-9">{s.label}</span>
              <input type="range" min={s.min} max={s.max} step={s.step} value={s.value}
                onChange={e => s.onChange(Number(e.target.value))} className="flex-1 h-1.5 accent-primary" />
              <span className="text-xs text-muted-foreground w-12 text-right tabular-nums">
                {s.format ? s.format(s.value) : s.value.toFixed(2)}
              </span>
            </div>
          ))}
          {isSet && (
            <button type="button" className="text-xs text-destructive hover:underline mt-0.5"
              onClick={() => { set({ x: 0, y: 0, scale: 1 }); extra.forEach(s => s.onChange(1.0)); }}>
              Reset all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Accessories multi-select ──────────────────────────────────────────────────
function AccessoriesEditor({ accessories, allParts, onChange }: {
  accessories: AccessoryItem[]; allParts: DbPart[]; onChange: (acc: AccessoryItem[]) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const MAX = 5;
  const accParts = allParts.filter(p => p.category === 'accessory');
  const selectedNames = new Set(accessories.map(a => a.name));
  const available = accParts.filter(p => !selectedNames.has(p.name));
  function add(part: DbPart) {
    if (accessories.length >= MAX) return;
    onChange([...accessories, { name: part.name, color: '#3b82f6' }]);
    setAddOpen(false);
  }
  function remove(i: number) { onChange(accessories.filter((_, idx) => idx !== i)); }
  function setColor(i: number, color: string) { onChange(accessories.map((a, idx) => idx === i ? { ...a, color } : a)); }
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">
          Accessories <span className="text-muted-foreground font-normal text-sm">({accessories.length}/{MAX})</span>
        </Label>
        {accessories.length < MAX && (
          <div className="relative">
            <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setAddOpen(o => !o)}>
              <Plus className="h-3 w-3" /> Add
            </Button>
            {addOpen && (
              <div className="absolute right-0 top-full mt-1 z-50 bg-popover border border-border rounded-lg shadow-lg min-w-36 py-1">
                {available.length === 0 && <p className="px-3 py-2 text-xs text-muted-foreground">None available</p>}
                {available.map(p => (
                  <button key={p.id} onClick={() => add(p)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors">
                    {p.label}{!p.isBuiltIn && <span className="ml-1 text-xs text-purple-500">✦</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {accessories.length === 0 && <p className="text-sm text-muted-foreground italic">No accessories. Click Add to choose one.</p>}
      <div className="space-y-2">
        {accessories.map((acc, idx) => {
          const part = allParts.find(p => p.name === acc.name);
          const canColor = part?.allowColorOverride !== false && acc.name !== 'crown';
          return (
            <div key={`${acc.name}-${idx}`} className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 border border-border/50">
              <span className="flex-1 text-sm font-medium capitalize">
                {part?.label ?? acc.name}
                {part && !part.isBuiltIn && <span className="ml-1 text-xs text-purple-500">✦</span>}
              </span>
              {canColor && (
                <div className="w-32">
                  <ColorInput value={acc.color} onChange={c => setColor(idx, c)} />
                </div>
              )}
              <button onClick={() => remove(idx)} className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Full layer order editor ───────────────────────────────────────────────────
function LayerOrderEditor({ layerOrder, accessories, onChange }: {
  layerOrder: string[]; accessories: AccessoryItem[]; onChange: (order: string[]) => void;
}) {
  const accKeys = accessories.map((_, i) => `acc_${i}`);
  const ALL = [...BASE_LAYERS, ...accKeys];
  const resolved = (() => {
    const ordered = layerOrder.filter(k => ALL.includes(k));
    const missing = ALL.filter(k => !ordered.includes(k));
    return [...ordered, ...missing];
  })();
  // Display is reversed (front at top)
  const display = [...resolved].reverse();

  function getLabel(key: string): string {
    if (LAYER_LABELS[key]) return LAYER_LABELS[key];
    if (key.startsWith('acc_')) {
      const idx = parseInt(key.slice(4), 10);
      const acc = accessories[idx];
      return `Accessory ${idx + 1}${acc ? ` — ${acc.name}` : ''}`;
    }
    return key;
  }

  function move(displayIdx: number, dir: -1 | 1) {
    // dir=-1 means move UP in display = move toward front = higher resolve index
    const resolvedIdx = resolved.length - 1 - displayIdx;
    const targetIdx = resolvedIdx + (-dir);
    if (targetIdx < 0 || targetIdx >= resolved.length) return;
    const next = [...resolved];
    [next[resolvedIdx], next[targetIdx]] = [next[targetIdx], next[resolvedIdx]];
    onChange(next);
  }

  const isDefault = JSON.stringify(resolved) === JSON.stringify(ALL);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-base">Layer Order</h3>
          <p className="text-xs text-muted-foreground">Top of list = renders in front. Bottom = behind everything.</p>
        </div>
        {!isDefault && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => onChange([])}>Reset</Button>}
      </div>
      <div className="space-y-1.5">
        {display.map((key, displayIdx) => (
          <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm">
            <span className="flex-1 font-medium">{getLabel(key)}</span>
            <span className="text-xs text-muted-foreground opacity-60 w-12 text-right">
              {displayIdx === 0 ? '▲ front' : displayIdx === display.length - 1 ? '▼ behind' : ''}
            </span>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(displayIdx, -1)} disabled={displayIdx === 0}>
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(displayIdx, 1)} disabled={displayIdx === display.length - 1}>
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Presets panel ─────────────────────────────────────────────────────────────
function PresetsPanel({ currentSettings, currentAccessories, currentPositions, currentLayerOrder, onLoad }: {
  currentSettings: Record<string, unknown>;
  currentAccessories: AccessoryItem[];
  currentPositions: PartPositionsMap;
  currentLayerOrder: string[];
  onLoad: (data: Record<string, unknown>) => void;
}) {
  const [presets, setPresets] = useState<SavedPreset[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const { toast } = useToast();
  const MAX = 5;

  async function loadPresets() {
    const d = await fetch('/api/presets').then(r => r.json()) as { presets: SavedPreset[] };
    setPresets(d.presets ?? []);
  }
  useEffect(() => { if (open) loadPresets(); }, [open]);

  async function savePreset() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/presets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          data: { settings: currentSettings, accessories: currentAccessories, partPositions: currentPositions, layerOrder: currentLayerOrder },
        }),
      });
      if (!res.ok) { const e = await res.json() as { error: string }; throw new Error(e.error); }
      toast({ title: `Preset "${newName.trim()}" saved!` });
      setNewName(""); await loadPresets();
    } catch (e) { toast({ title: String(e instanceof Error ? e.message : e), variant: "destructive" }); }
    finally { setSaving(false); }
  }

  async function deletePreset(id: number) {
    await fetch(`/api/presets/${id}`, { method: 'DELETE' });
    await loadPresets();
    toast({ title: "Preset deleted" });
  }

  return (
    <div className="border-t border-border pt-4">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <Bookmark className="h-4 w-4" />
        <span>Presets {open && presets.length > 0 ? `(${presets.length}/${MAX})` : ''}</span>
        {open ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          {presets.length < MAX && (
            <div className="flex gap-2">
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Preset name…" className="h-8 text-sm flex-1" onKeyDown={e => e.key === 'Enter' && savePreset()} />
              <Button size="sm" variant="outline" className="h-8 px-2 gap-1" onClick={savePreset} disabled={!newName.trim() || saving}>
                <BookmarkPlus className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          {presets.length === 0 && <p className="text-xs text-muted-foreground italic">No saved presets yet.</p>}
          <div className="space-y-2">
            {presets.map(p => {
              const ps = (p.data.settings ?? {}) as Record<string, string | number>;
              const pa = (p.data.accessories ?? []) as AccessoryItem[];
              const pp = (p.data.partPositions ?? {}) as PartPositionsMap;
              const pl = (p.data.layerOrder ?? []) as string[];
              return (
                <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-muted/30">
                  <div className="w-11 h-11 flex-shrink-0">
                    <AvatarPreview
                      skinTone={String(ps.skinTone ?? '#D6A371')}
                      hairStyle={String(ps.hairStyle ?? 'short')}
                      hairColor={String(ps.hairColor ?? '#4A2F1D')}
                      headShape={String(ps.headShape ?? 'circle')}
                      eyeStyle={String(ps.eyeStyle ?? 'default')}
                      eyeColor={String(ps.eyeColor ?? '#1e1b4b')}
                      eyeWidth={Number(ps.eyeWidth ?? 1)}
                      eyeSpacing={Number(ps.eyeSpacing ?? 1)}
                      mouthStyle={String(ps.mouthStyle ?? 'smile')}
                      outfitStyle={String(ps.outfitStyle ?? 'casual')}
                      outfitColor={String(ps.outfitColor ?? '#2563eb')}
                      accessories={pa}
                      backgroundColor={String(ps.backgroundColor ?? '#1e1b4b')}
                      partPositions={pp}
                      layerOrder={pl}
                    />
                  </div>
                  <span className="flex-1 text-sm font-medium truncate">{p.name}</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => onLoad(p.data)}>Load</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deletePreset(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Part selector row ─────────────────────────────────────────────────────────
function PartRow({ label, stateKey, partKey, opts, value, onValueChange, positions, onPositionChange, extra = [] }: {
  label: string; stateKey: string; partKey: keyof PartPositionsMap;
  opts: { value: string; label: string; isBuiltIn: boolean }[];
  value: string; onValueChange: (v: string) => void;
  positions: PartPositionsMap;
  onPositionChange: (part: keyof PartPositionsMap, pos: { x: number; y: number; scale: number }) => void;
  extra?: ExtraSlider[];
}) {
  const withNone = [{ value: 'none', label: 'None', isBuiltIn: true }, ...opts];
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {withNone.map(o => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}{!o.isBuiltIn && <span className="ml-2 text-xs text-purple-500">✦</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <PositionControl partKey={partKey} positions={positions} onChange={onPositionChange} extra={extra} />
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

  type Settings = {
    skinTone: string; hairStyle: string; hairColor: string; headShape: string;
    eyeStyle: string; eyeColor: string; eyeWidth: number; eyeSpacing: number;
    mouthStyle: string; outfitStyle: string; outfitColor: string;
    accessoryColor: string; backgroundColor: string; voiceId: string;
  };

  const [settings, setSettings] = useState<Settings>({
    skinTone: "#D6A371", hairStyle: "short", hairColor: "#4A2F1D", headShape: "circle",
    eyeStyle: "default", eyeColor: "#1e1b4b", eyeWidth: 1.0, eyeSpacing: 1.0,
    mouthStyle: "smile", outfitStyle: "casual", outfitColor: "#2563eb",
    accessoryColor: "#3b82f6", backgroundColor: "#1e1b4b", voiceId: "Alloy",
  });
  const [accessories, setAccessories] = useState<AccessoryItem[]>([]);
  const [partPositions, setPartPositions] = useState<PartPositionsMap>({});
  const [layerOrder, setLayerOrder] = useState<string[]>([]);
  const [allParts, setAllParts] = useState<DbPart[]>([]);
  const [partsLoading, setPartsLoading] = useState(true);
  const [testText, setTestText] = useState("Hello! This is how I sound on your stream.");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => { if (!userLoading && !user) setLocation("/"); }, [user, userLoading, setLocation]);

  useEffect(() => {
    if (!avatarData) return;
    setSettings({
      skinTone:   resolveColorHex(avatarData.skinTone, 'skin'),
      hairStyle:  avatarData.hairStyle,
      hairColor:  resolveColorHex(avatarData.hairColor, 'hair'),
      headShape:  avatarData.headShape ?? 'circle',
      eyeStyle:   avatarData.eyeStyle,
      eyeColor:   avatarData.eyeColor ?? "#1e1b4b",
      eyeWidth:   avatarData.eyeWidth ?? 1.0,
      eyeSpacing: (avatarData as unknown as Record<string, unknown>).eyeSpacing as number ?? 1.0,
      mouthStyle: avatarData.mouthStyle,
      outfitStyle: avatarData.outfitStyle,
      outfitColor: avatarData.outfitColor ?? "#2563eb",
      accessoryColor: avatarData.accessoryColor ?? "#3b82f6",
      backgroundColor: (avatarData as unknown as Record<string, unknown>).backgroundColor as string ?? "#1e1b4b",
      voiceId: avatarData.voiceId,
    });
    const loadedAcc = avatarData.accessories?.length
      ? avatarData.accessories as AccessoryItem[]
      : (avatarData.accessory && avatarData.accessory !== 'none'
        ? [{ name: avatarData.accessory, color: avatarData.accessoryColor ?? '#3b82f6' }] : []);
    setAccessories(loadedAcc);
    setPartPositions((avatarData.partPositions as PartPositionsMap) ?? {});
    setLayerOrder((avatarData.layerOrder as string[]) ?? []);
  }, [avatarData]);

  // Sync layer order when accessories change
  const accessoriesKey = accessories.map(a => a.name).join(',');
  useEffect(() => {
    setLayerOrder(prev => {
      if (prev.length === 0) return []; // will be populated by avatarData load
      const withoutAcc = prev.filter(k => !k.startsWith('acc_'));
      const newAccKeys = accessories.map((_, i) => `acc_${i}`);
      return [...withoutAcc, ...newAccKeys];
    });
  }, [accessoriesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch("/api/parts").then(r => r.json())
      .then((d: { parts: DbPart[] }) => setAllParts(d.parts ?? []))
      .catch(() => {}).finally(() => setPartsLoading(false));
  }, []);

  useEffect(() => {
    if (!window.speechSynthesis) return;
    const load = () => setBrowserVoices([...window.speechSynthesis.getVoices()]);
    load(); window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  const update = useCallback((key: keyof Settings, value: string | number) =>
    setSettings(p => ({ ...p, [key]: value })), []);
  const updatePos = useCallback((part: keyof PartPositionsMap, v: { x: number; y: number; scale: number }) =>
    setPartPositions(prev => ({ ...prev, [part]: v })), []);

  function loadPreset(data: Record<string, unknown>) {
    const ps = (data.settings ?? {}) as Partial<Settings>;
    setSettings(s => ({ ...s, ...ps }));
    setAccessories((data.accessories as AccessoryItem[]) ?? []);
    setPartPositions((data.partPositions as PartPositionsMap) ?? {});
    setLayerOrder((data.layerOrder as string[]) ?? []);
    toast({ title: "Preset loaded! Click Save Avatar to apply." });
  }

  function handleSave() {
    const cleanPos: PartPositionsMap = {};
    for (const [k, v] of Object.entries(partPositions)) {
      if (v && (v.x !== 0 || v.y !== 0 || (v.scale ?? 1) !== 1))
        (cleanPos as Record<string, typeof v>)[k] = v;
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
      onSuccess: () => toast({ title: "Avatar saved!" }),
      onError: () => toast({ title: "Save failed", variant: "destructive" }),
    });
  }

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

  const customPartImages: Record<string, string> = {};
  allParts.forEach(p => { if (p.imageUrl) customPartImages[p.name] = p.imageUrl; });
  const parts = (cat: string) => allParts.filter(p => p.category === cat).map(p => ({ value: p.name, label: p.label, isBuiltIn: p.isBuiltIn }));

  const voices = (voicesData?.voices ?? []) as VoiceConfig[];

  const eyeExtras: ExtraSlider[] = [
    { key: 'eyeSpacing', label: 'Spacing', value: settings.eyeSpacing, min: 0.2, max: 2.5, step: 0.05, format: v => `${v.toFixed(2)}×`, onChange: v => update('eyeSpacing', v) },
    { key: 'eyeSize',    label: 'Size',    value: settings.eyeWidth,   min: 0.3, max: 3.0, step: 0.05, format: v => `${v.toFixed(2)}×`, onChange: v => update('eyeWidth', v) },
  ];

  if (userLoading || avatarLoading)
    return <Layout><div className="flex-1 flex items-center justify-center">Loading studio…</div></Layout>;
  if (!user) return null;

  return (
    <Layout>
      <div className="container max-w-7xl mx-auto p-4 flex-1 flex flex-col md:flex-row gap-8">
        {/* ── Preview sidebar ────────────────────────────── */}
        <div className="w-full md:w-[360px] flex-shrink-0">
          <div className="bg-card border border-border rounded-3xl p-5 shadow-xl sticky top-24 space-y-4">
            <h2 className="text-xl font-bold font-mono text-center">Live Preview</h2>
            <AvatarPreview {...settings} accessories={accessories}
              customPartImages={customPartImages} partPositions={partPositions} layerOrder={layerOrder} />
            <div className="flex gap-3">
              <Button onClick={handleSave} className="flex-1" disabled={saveAvatar.isPending}>
                {saveAvatar.isPending ? "Saving…" : "Save Avatar"}
              </Button>
              <Button asChild variant="outline"><Link href="/profile">Profile</Link></Button>
            </div>
            <Button asChild variant="ghost" className="w-full text-xs h-8">
              <Link href="/cosmetics">✦ Request a Custom Cosmetic</Link>
            </Button>
            <PresetsPanel
              currentSettings={settings as unknown as Record<string, unknown>}
              currentAccessories={accessories}
              currentPositions={partPositions}
              currentLayerOrder={layerOrder}
              onLoad={loadPreset}
            />
          </div>
        </div>

        {/* ── Controls area ─────────────────────────────── */}
        <div className="flex-1 bg-card border border-border rounded-3xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-5 border-b border-border bg-muted/30">
            <h1 className="text-2xl font-bold font-mono">Customization Studio</h1>
            <p className="text-muted-foreground text-sm">Design your avatar then click Save.</p>
          </div>
          <ScrollArea className="flex-1 p-5">
            <Tabs defaultValue="appearance">
              <TabsList className="grid w-full grid-cols-3 mb-6 h-11">
                <TabsTrigger value="appearance">Appearance</TabsTrigger>
                <TabsTrigger value="layers">Layers</TabsTrigger>
                <TabsTrigger value="voice">Voice</TabsTrigger>
              </TabsList>

              {/* ── Appearance ──────────────────────────────── */}
              <TabsContent value="appearance" className="space-y-7">

                {/* Head & Skin */}
                <section className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Head & Skin</h3>
                  <ColorInput label="Skin Colour" value={settings.skinTone} onChange={v => update('skinTone', v)} />
                  <div className="space-y-1">
                    <Label className="text-sm">Head Shape</Label>
                    <Select value={settings.headShape} onValueChange={v => update('headShape', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {HEAD_SHAPES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <PositionControl partKey="head" positions={partPositions} onChange={updatePos} />
                  </div>
                </section>

                {/* Hair */}
                <section className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Hair</h3>
                  <ColorInput label="Hair Colour" value={settings.hairColor} onChange={v => update('hairColor', v)} />
                  {!partsLoading && (
                    <PartRow label="Hair Style" stateKey="hairStyle" partKey="hair" opts={parts("hair_style")}
                      value={settings.hairStyle} onValueChange={v => update('hairStyle', v)}
                      positions={partPositions} onPositionChange={updatePos} />
                  )}
                </section>

                {/* Eyes */}
                <section className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Eyes</h3>
                  <ColorInput label="Eye Colour" value={settings.eyeColor} onChange={v => update('eyeColor', v)} />
                  {!partsLoading && (
                    <PartRow label="Eye Style" stateKey="eyeStyle" partKey="eyes" opts={parts("eye_style")}
                      value={settings.eyeStyle} onValueChange={v => update('eyeStyle', v)}
                      positions={partPositions} onPositionChange={updatePos}
                      extra={eyeExtras} />
                  )}
                </section>

                {/* Mouth */}
                <section className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Mouth</h3>
                  {!partsLoading && (
                    <PartRow label="Mouth Style" stateKey="mouthStyle" partKey="mouth" opts={parts("mouth_style")}
                      value={settings.mouthStyle} onValueChange={v => update('mouthStyle', v)}
                      positions={partPositions} onPositionChange={updatePos} />
                  )}
                </section>

                {/* Outfit */}
                <section className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Outfit</h3>
                  <ColorInput label="Outfit Colour" value={settings.outfitColor} onChange={v => update('outfitColor', v)} />
                  {!partsLoading && (
                    <PartRow label="Outfit Style" stateKey="outfitStyle" partKey="outfit" opts={parts("outfit_style")}
                      value={settings.outfitStyle} onValueChange={v => update('outfitStyle', v)}
                      positions={partPositions} onPositionChange={updatePos} />
                  )}
                </section>

                {/* Accessories */}
                <section className="space-y-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Accessories</h3>
                  <AccessoriesEditor accessories={accessories} allParts={allParts} onChange={setAccessories} />
                  {accessories.length > 0 && (
                    <div className="pl-2 border-l-2 border-primary/20 space-y-1">
                      <Label className="text-xs text-muted-foreground">Group offset & scale</Label>
                      <PositionControl partKey="accessory" positions={partPositions} onChange={updatePos} />
                    </div>
                  )}
                </section>

                {/* Background */}
                <section className="space-y-4 pb-4 border-b border-border">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Background</h3>
                  <ColorInput label="Background Colour" value={settings.backgroundColor} onChange={v => update('backgroundColor', v)} />
                </section>
              </TabsContent>

              {/* ── Layers ──────────────────────────────────── */}
              <TabsContent value="layers" className="pt-2">
                <LayerOrderEditor layerOrder={layerOrder} accessories={accessories} onChange={setLayerOrder} />
              </TabsContent>

              {/* ── Voice ───────────────────────────────────── */}
              <TabsContent value="voice" className="space-y-8 pt-4">
                <div className="space-y-4 max-w-md">
                  <Label className="text-lg font-semibold">TTS Voice</Label>
                  {voices.length === 0 ? <p className="text-sm text-muted-foreground">Loading…</p> : (
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
                  <Label className="text-base font-semibold">Preview</Label>
                  <Textarea value={testText} onChange={e => setTestText(e.target.value)} className="resize-none" rows={3} />
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
