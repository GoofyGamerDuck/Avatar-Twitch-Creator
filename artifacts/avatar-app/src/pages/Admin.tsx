import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Upload, Eye, EyeOff, ShieldAlert, Plus, X, Check, CheckCircle, XCircle, Mic, FileAudio } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AvatarPreview, type AccessoryItem } from "@/components/AvatarPreview";

const CATEGORIES = [
  { value: "hair_style", label: "Hair Style" },
  { value: "eye_style", label: "Eye Style" },
  { value: "mouth_style", label: "Mouth Style" },
  { value: "outfit_style", label: "Outfit Style" },
  { value: "accessory", label: "Accessory" },
];

interface AvatarPart {
  id: number; category: string; name: string; label: string;
  imageUrl: string; isActive: boolean; isBuiltIn: boolean;
  allowColorOverride: boolean; sortOrder: number;
}
interface Voice {
  id: number; name: string; description: string; pitch: number; rate: number;
  browserVoiceName: string | null; elevenLabsVoiceId?: string | null;
  modelPath: string | null; modelConfigPath: string | null;
  isActive: boolean; isBuiltIn: boolean; sortOrder: number;
}
interface CosmeticRequest {
  id: number; category: string; name: string; label: string; imageUrl: string;
  status: string; adminNote: string | null; createdAt: string;
  twitchUsername: string; displayName: string;
}

// ── Auth gate ─────────────────────────────────────────────────────────────────
function AuthGate({ onAuth }: { onAuth: (pw: string) => void }) {
  const [pw, setPw] = useState(() => sessionStorage.getItem("adminPw") ?? "");
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setChecking(true);
    try {
      const res = await fetch("/api/admin/verify", { method: "POST", headers: { "x-admin-password": pw } });
      const d = await res.json() as { ok: boolean };
      if (d.ok) { sessionStorage.setItem("adminPw", pw); onAuth(pw); }
      else toast({ title: "Wrong password", variant: "destructive" });
    } catch { toast({ title: "Connection error", variant: "destructive" }); }
    finally { setChecking(false); }
  }
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
          <CardTitle>Admin Access</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" value={pw} onChange={e => setPw(e.target.value)}
                placeholder="Enter admin password" autoFocus autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={checking}>
              {checking ? "Checking…" : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Parts panel ───────────────────────────────────────────────────────────────
function PartsPanel({ pw }: { pw: string }) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [parts, setParts] = useState<AvatarPart[]>([]);
  const [activeCategory, setActiveCategory] = useState("hair_style");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", label: "", allowColorOverride: true, sortOrder: 0 });
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState("");

  async function loadParts() {
    const d = await fetch("/api/admin/parts", { headers: { "x-admin-password": pw } }).then(r => r.json()) as { parts: AvatarPart[] };
    setParts(d.parts ?? []);
  }
  useEffect(() => { loadParts(); }, []);

  async function handleFileUpload(file: File) {
    setUploading(true);
    try {
      const { uploadURL, objectPath } = await fetch("/api/storage/uploads/request-url", {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      }).then(r => r.json()) as { uploadURL: string; objectPath: string };
      await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      const servedUrl = `/api/storage/objects/${objectPath.replace(/^\/objects\//, '')}`;
      setUploadedUrl(servedUrl);
      toast({ title: "Image uploaded!" });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setUploading(false); setPendingFile(null); }
  }

  async function handleCreate() {
    if (!form.name || !uploadedUrl) return;
    await fetch("/api/admin/parts", {
      method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ ...form, category: activeCategory, imageUrl: uploadedUrl }),
    });
    setForm({ name: "", label: "", allowColorOverride: true, sortOrder: 0 });
    setUploadedUrl(""); setShowAdd(false); await loadParts();
    toast({ title: "Part created!" });
  }

  async function toggleActive(p: AvatarPart) {
    await fetch(`/api/admin/parts/${p.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ isActive: !p.isActive }),
    }); await loadParts();
  }
  async function deletePart(id: number) {
    if (!confirm("Delete this part?")) return;
    await fetch(`/api/admin/parts/${id}`, { method: "DELETE", headers: { "x-admin-password": pw } });
    await loadParts(); toast({ title: "Part deleted" });
  }

  const filtered = parts.filter(p => p.category === activeCategory);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <Button key={c.value} size="sm" variant={activeCategory === c.value ? "default" : "outline"}
            onClick={() => setActiveCategory(c.value)}>{c.label}</Button>
        ))}
      </div>
      {!showAdd && (
        <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" /> Add Part</Button>
      )}
      {showAdd && (
        <Card className="border-primary/50"><CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Internal Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. curly_pink" /></div>
            <div className="space-y-1"><Label>Display Label</Label><Input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Pink Curls" /></div>
          </div>
          <div className="space-y-2">
            <Label>Part Image</Label>
            {uploadedUrl ? (
              <div className="flex items-center gap-3">
                <img src={uploadedUrl} className="w-16 h-16 rounded-lg object-contain border border-border bg-muted" />
                <Button size="sm" variant="ghost" onClick={() => setUploadedUrl("")}><X className="h-4 w-4 mr-1" /> Change</Button>
              </div>
            ) : (
              <div>
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4 mr-2" />{uploading ? "Uploading…" : "Upload Image"}
                </Button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setPendingFile(f); handleFileUpload(f); } }} />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={!form.name || !uploadedUrl}><Check className="h-4 w-4 mr-1" /> Create</Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setUploadedUrl(""); }}><X className="h-4 w-4 mr-1" /> Cancel</Button>
          </div>
        </CardContent></Card>
      )}
      <div className="space-y-2">
        {filtered.length === 0 && <p className="text-muted-foreground text-sm italic">No parts in this category.</p>}
        {filtered.map(p => (
          <Card key={p.id} className={!p.isActive ? "opacity-60" : ""}><CardContent className="p-3 flex items-center gap-3">
            <img src={p.imageUrl} className="w-12 h-12 rounded-lg object-contain border border-border bg-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2"><span className="font-medium text-sm">{p.label}</span>
                {p.isBuiltIn && <Badge variant="secondary" className="text-xs">Built-in</Badge>}
                {!p.isActive && <Badge variant="outline" className="text-xs">Hidden</Badge>}
              </div>
              <span className="text-xs text-muted-foreground font-mono">{p.name}</span>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => toggleActive(p)}>
                {p.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </Button>
              <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => deletePart(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

// ── Voices panel ──────────────────────────────────────────────────────────────
function VoicesPanel({ pw }: { pw: string }) {
  const { toast } = useToast();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [browserVoices, setBrowserVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [uploadingModel, setUploadingModel] = useState(false);
  const modelRef = useRef<HTMLInputElement>(null);
  const configRef = useRef<HTMLInputElement>(null);

  const emptyForm = { name: "", description: "", pitch: 1.0, rate: 1.0, browserVoiceName: "", elevenLabsVoiceId: "", modelPath: "", modelConfigPath: "" };
  const [form, setForm] = useState(emptyForm);

  // Load browser's detected voices
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const load = () => setBrowserVoices([...window.speechSynthesis.getVoices()]);
    load(); window.speechSynthesis.onvoiceschanged = load;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  async function loadVoices() {
    setLoading(true);
    try {
      const d = await fetch("/api/admin/voices", { headers: { "x-admin-password": pw } }).then(r => r.json()) as { voices: Voice[] };
      setVoices(d.voices ?? []);
    } catch { toast({ title: "Failed to load voices", variant: "destructive" }); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadVoices(); }, []);

  async function uploadFile(file: File): Promise<string> {
    const { uploadURL, objectPath } = await fetch("/api/storage/uploads/request-url", {
      method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ name: file.name, size: file.size, contentType: "application/octet-stream" }),
    }).then(r => r.json()) as { uploadURL: string; objectPath: string };
    await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": "application/octet-stream" } });
    return objectPath;
  }

  async function handleModelUpload(file: File, type: "model" | "config") {
    setUploadingModel(true);
    try {
      const path = await uploadFile(file);
      if (type === "model") setForm(f => ({ ...f, modelPath: path }));
      else setForm(f => ({ ...f, modelConfigPath: path }));
      toast({ title: `${type === "model" ? "Model" : "Config"} file uploaded!` });
    } catch { toast({ title: "Upload failed", variant: "destructive" }); }
    finally { setUploadingModel(false); }
  }

  function startEdit(v: Voice) {
    setEditingId(v.id);
    setForm({ name: v.name, description: v.description, pitch: v.pitch, rate: v.rate,
      browserVoiceName: v.browserVoiceName ?? "", elevenLabsVoiceId: (v as unknown as { elevenLabsVoiceId?: string }).elevenLabsVoiceId ?? "",
      modelPath: v.modelPath ?? "", modelConfigPath: v.modelConfigPath ?? "" });
    setShowAdd(false);
  }

  async function handleSave() {
    const body = { name: form.name, description: form.description, pitch: form.pitch, rate: form.rate,
      browserVoiceName: form.browserVoiceName || null,
      elevenLabsVoiceId: form.elevenLabsVoiceId || null,
      modelPath: form.modelPath || null, modelConfigPath: form.modelConfigPath || null };
    if (editingId) {
      await fetch(`/api/admin/voices/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-password": pw }, body: JSON.stringify(body) });
      setEditingId(null);
    } else {
      await fetch("/api/admin/voices", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": pw }, body: JSON.stringify(body) });
      setShowAdd(false);
    }
    setForm(emptyForm); await loadVoices(); toast({ title: editingId ? "Voice updated!" : "Voice created!" });
  }

  async function toggleActive(v: Voice) {
    await fetch(`/api/admin/voices/${v.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ isActive: !v.isActive }) });
    await loadVoices();
  }
  async function deleteVoice(id: number) {
    if (!confirm("Delete this voice?")) return;
    await fetch(`/api/admin/voices/${id}`, { method: "DELETE", headers: { "x-admin-password": pw } });
    await loadVoices();
  }

  const adminAudioRef = useRef<HTMLAudioElement | null>(null);

  function stopAdminAudio() {
    if (adminAudioRef.current) { adminAudioRef.current.pause(); adminAudioRef.current = null; }
    window.speechSynthesis?.cancel();
  }

  function playServerTts(voiceName: string, text: string) {
    stopAdminAudio();
    const url = `/api/tts/synthesize?voiceId=${encodeURIComponent(voiceName)}&text=${encodeURIComponent(text)}`;
    const audio = new Audio(url);
    adminAudioRef.current = audio;
    audio.onerror = () => { adminAudioRef.current = null; };
    audio.onended = () => { adminAudioRef.current = null; };
    audio.play().catch(() => {});
  }

  function previewVoice(v: Voice) {
    if (v.modelPath || v.elevenLabsVoiceId) {
      playServerTts(v.name, `Hi, I'm ${v.name}. ${v.description}.`);
      return;
    }
    if (!window.speechSynthesis) return; window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(`Hi, I'm ${v.name}. ${v.description}.`);
    utt.pitch = v.pitch; utt.rate = v.rate;
    if (v.browserVoiceName) { const bv = window.speechSynthesis.getVoices().find(vv => vv.name === v.browserVoiceName); if (bv) utt.voice = bv; }
    window.speechSynthesis.speak(utt);
  }

  function previewCurrentForm() {
    const text = `Hi, I'm ${form.name || "a test voice"}.`;
    // Use server TTS if model or ElevenLabs ID is set and voice is already saved
    if ((form.modelPath || form.elevenLabsVoiceId) && editingId) {
      playServerTts(form.name, text);
      return;
    }
    if (!window.speechSynthesis) return; window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.pitch = form.pitch; utt.rate = form.rate;
    if (form.browserVoiceName) {
      const bv = window.speechSynthesis.getVoices().find(vv => vv.name === form.browserVoiceName);
      if (bv) utt.voice = bv;
    }
    window.speechSynthesis.speak(utt);
  }

  const VoiceForm = () => (
    <Card className="border-primary/40"><CardContent className="p-5 space-y-5">
      {/* Basic info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label>Voice Name</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Darth Vader" /></div>
        <div className="space-y-1.5"><Label>Description</Label>
          <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Deep, menacing" /></div>
      </div>

      {/* Pitch & Rate */}
      <div className="grid grid-cols-2 gap-4">
        {[{ k: 'pitch', label: 'Pitch', min: 0.1, max: 2.5 }, { k: 'rate', label: 'Rate', min: 0.1, max: 2.0 }].map(s => (
          <div key={s.k} className="space-y-2">
            <Label className="flex justify-between">{s.label}
              <span className="text-muted-foreground font-normal">{(form[s.k as 'pitch' | 'rate']).toFixed(2)}</span></Label>
            <input type="range" min={s.min} max={s.max} step="0.05" value={form[s.k as 'pitch' | 'rate']}
              onChange={e => setForm(f => ({ ...f, [s.k]: Number(e.target.value) }))} className="w-full accent-primary" />
          </div>
        ))}
      </div>

      {/* Browser voice picker */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5"><Mic className="h-3.5 w-3.5" /> System Voice
          <span className="text-muted-foreground font-normal text-xs">(for browser TTS)</span>
        </Label>
        {browserVoices.length > 0 ? (
          <Select value={form.browserVoiceName || "__none__"} onValueChange={v => setForm(f => ({ ...f, browserVoiceName: v === "__none__" ? "" : v }))}>
            <SelectTrigger><SelectValue placeholder="Pick a detected voice…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__"><span className="text-muted-foreground">— None (default browser voice) —</span></SelectItem>
              {browserVoices.map(v => (
                <SelectItem key={v.name} value={v.name}>{v.name} <span className="text-xs text-muted-foreground ml-2">{v.lang}</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input value={form.browserVoiceName} onChange={e => setForm(f => ({ ...f, browserVoiceName: e.target.value }))}
            placeholder="Type voice name if known (e.g. Google US English)" />
        )}
        <p className="text-xs text-muted-foreground">
          {browserVoices.length > 0
            ? `${browserVoices.length} system voices detected. To add custom voices, install them in your OS and restart the browser.`
            : "No system voices detected. Make sure your browser has TTS enabled."}
        </p>
      </div>

      {/* ElevenLabs Voice ID */}
      <div className="space-y-1.5">
        <Label className="flex items-center gap-1.5">
          🎙 ElevenLabs Voice ID
          <span className="text-muted-foreground font-normal text-xs">(optional — overrides browser TTS)</span>
        </Label>
        <Input value={form.elevenLabsVoiceId} onChange={e => setForm(f => ({ ...f, elevenLabsVoiceId: e.target.value }))}
          placeholder="e.g. 21m00Tcm4TlvDq8ikWAM" className="font-mono text-sm" />
        <p className="text-xs text-muted-foreground">
          Find voice IDs in the{" "}
          <a href="https://elevenlabs.io/app/voice-library" target="_blank" rel="noreferrer" className="underline text-primary">
            ElevenLabs Voice Library
          </a>
          {" "}— click a voice → Share → copy the ID from the URL. When set, the server synthesizes audio directly via the ElevenLabs API.
        </p>
      </div>

      {/* Piper model upload */}
      <div className="space-y-3 p-3 rounded-lg bg-muted/40 border border-border">
        <div className="flex items-center gap-2">
          <FileAudio className="h-4 w-4 text-muted-foreground" />
          <Label className="text-sm font-semibold">Custom Voice Model <span className="text-muted-foreground font-normal">(piper-tts)</span></Label>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Download a voice model from{" "}
          <a href="https://huggingface.co/rhasspy/piper-voices" target="_blank" rel="noreferrer" className="underline text-primary">
            huggingface.co/rhasspy/piper-voices
          </a>{" "}
          — you need the <code className="bg-muted px-1 rounded text-xs">.onnx</code> file and its{" "}
          <code className="bg-muted px-1 rounded text-xs">.onnx.json</code> config. Upload both below.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* Model file */}
          <div className="space-y-1.5">
            <Label className="text-xs">Model (.onnx)</Label>
            {form.modelPath ? (
              <div className="flex items-center gap-2 p-2 rounded bg-green-500/10 border border-green-500/30">
                <span className="text-xs text-green-600 flex-1 truncate">✓ uploaded</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, modelPath: "" }))} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="w-full text-xs" disabled={uploadingModel}
                onClick={() => modelRef.current?.click()}>
                <Upload className="h-3 w-3 mr-1" /> {uploadingModel ? "Uploading…" : "Upload .onnx"}
              </Button>
            )}
            <input ref={modelRef} type="file" accept=".onnx" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleModelUpload(f, "model"); }} />
          </div>
          {/* Config file */}
          <div className="space-y-1.5">
            <Label className="text-xs">Config (.onnx.json)</Label>
            {form.modelConfigPath ? (
              <div className="flex items-center gap-2 p-2 rounded bg-green-500/10 border border-green-500/30">
                <span className="text-xs text-green-600 flex-1 truncate">✓ uploaded</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, modelConfigPath: "" }))} className="text-muted-foreground hover:text-destructive">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <Button size="sm" variant="outline" className="w-full text-xs" disabled={uploadingModel}
                onClick={() => configRef.current?.click()}>
                <Upload className="h-3 w-3 mr-1" /> {uploadingModel ? "Uploading…" : "Upload .onnx.json"}
              </Button>
            )}
            <input ref={configRef} type="file" accept=".json" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleModelUpload(f, "config"); }} />
          </div>
        </div>
        {form.modelPath && form.modelConfigPath && (
          <p className="text-xs text-green-600">✓ Both files uploaded. Voice model will be used for server-side TTS synthesis.</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={!form.name}><Check className="h-4 w-4 mr-1" />{editingId ? "Update" : "Create"}</Button>
        <Button size="sm" variant="outline" onClick={previewCurrentForm}><span className="mr-1">▶</span> Test</Button>
        <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setEditingId(null); setForm(emptyForm); }}><X className="h-4 w-4 mr-1" /> Cancel</Button>
      </div>
    </CardContent></Card>
  );

  return (
    <div className="space-y-5">
      {/* Info about custom voices */}
      <Card className="border-blue-500/20 bg-blue-500/5"><CardContent className="p-4">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2"><Mic className="h-4 w-4" /> Adding Custom Voices</h3>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li><strong>Browser voices:</strong> Install custom TTS voices in your OS (Windows SAPI, macOS System Preferences → Accessibility → Speech). They appear in the System Voice picker automatically.</li>
          <li><strong>AI voices (piper-tts):</strong> Download a model from Hugging Face and upload the .onnx + .onnx.json files. Server-side TTS synthesis will use it.</li>
          <li><strong>Pitch & Rate:</strong> Adjust sliders to match the character — low pitch + slow rate for deep voices, high pitch + fast rate for cartoon styles.</li>
        </ul>
      </CardContent></Card>

      {!showAdd && !editingId && <Button size="sm" onClick={() => { setShowAdd(true); setForm(emptyForm); }}><Plus className="h-4 w-4 mr-2" /> Add Custom Voice</Button>}
      {showAdd && <VoiceForm />}
      {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
      <div className="space-y-2">
        {voices.map(voice => (
          <div key={voice.id}>
            {editingId === voice.id ? <VoiceForm /> : (
              <Card className={!voice.isActive ? "opacity-60" : ""}><CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{voice.name}</span>
                      {voice.isBuiltIn && <Badge variant="secondary" className="text-xs">Built-in</Badge>}
                      {(voice as unknown as { elevenLabsVoiceId?: string }).elevenLabsVoiceId && <Badge variant="outline" className="text-xs text-purple-600 border-purple-500/40">🎙 ElevenLabs</Badge>}
                    {voice.modelPath && <Badge variant="outline" className="text-xs text-green-600 border-green-500/40">🎙 piper</Badge>}
                    {!voice.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Hidden</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{voice.description}</p>
                    <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                      <span>Pitch: {voice.pitch.toFixed(2)}</span>
                      <span>Rate: {voice.rate.toFixed(2)}</span>
                      {voice.browserVoiceName && <span>🔊 {voice.browserVoiceName}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => previewVoice(voice)}>▶ Test</Button>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => startEdit(voice)}>✎</Button>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => toggleActive(voice)}>{voice.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</Button>
                    <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => deleteVoice(voice.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardContent></Card>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Cosmetic Requests panel ───────────────────────────────────────────────────
function RequestsPanel({ pw }: { pw: string }) {
  const { toast } = useToast();
  const [requests, setRequests] = useState<CosmeticRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("pending");
  const [noteMap, setNoteMap] = useState<Record<number, string>>({});

  async function load() {
    setLoading(true);
    try {
      const d = await fetch(`/api/admin/cosmetic-requests?status=${filter}`, { headers: { "x-admin-password": pw } }).then(r => r.json()) as { requests: CosmeticRequest[] };
      setRequests(d.requests ?? []);
    } catch { toast({ title: "Failed to load requests", variant: "destructive" }); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [filter]);

  async function decide(id: number, status: 'approved' | 'rejected') {
    await fetch(`/api/admin/cosmetic-requests/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ status, adminNote: noteMap[id] || null }),
    });
    toast({ title: status === 'approved' ? "Approved! Part created." : "Rejected." });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {['pending', 'approved', 'rejected'].map(s => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} className="capitalize"
            onClick={() => setFilter(s)}>{s}</Button>
        ))}
        <Button size="sm" variant="ghost" onClick={load}>↺ Refresh</Button>
      </div>
      {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {!loading && requests.length === 0 && <p className="text-muted-foreground text-sm italic">No {filter} requests.</p>}
      <div className="space-y-4">
        {requests.map(r => (
          <Card key={r.id}><CardContent className="p-5 space-y-4">
            <div className="flex gap-4 items-start">
              <img src={r.imageUrl} alt={r.label} className="w-20 h-20 rounded-xl object-contain bg-muted flex-shrink-0 border border-border" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="font-semibold">{r.label}</span>
                  <Badge variant="outline" className="text-xs capitalize">
                    {CATEGORIES.find(c => c.value === r.category)?.label ?? r.category}
                  </Badge>
                  <Badge variant={filter === 'pending' ? 'secondary' : filter === 'approved' ? 'default' : 'destructive'} className="text-xs capitalize">{r.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono mb-1">{r.name}</p>
                <p className="text-sm text-muted-foreground">By <span className="text-foreground font-medium">{r.displayName}</span> @{r.twitchUsername}</p>
                {r.adminNote && <p className="text-sm italic text-muted-foreground mt-1">Note: {r.adminNote}</p>}
              </div>
              <div className="w-24 h-24 flex-shrink-0">
                <AvatarPreview
                  skinTone="#D6A371" hairColor="#4A2F1D" mouthColor="#2d1a0e"
                  hairStyle={r.category === 'hair_style' ? r.name : 'short'}
                  eyeStyle={r.category === 'eye_style' ? r.name : 'default'}
                  mouthStyle={r.category === 'mouth_style' ? r.name : 'smile'}
                  outfitStyle={r.category === 'outfit_style' ? r.name : 'casual'}
                  accessories={r.category === 'accessory' ? [{ name: r.name, color: '#3b82f6' }] as AccessoryItem[] : []}
                  customPartImages={{ [r.name]: r.imageUrl }} />
              </div>
            </div>
            {filter === 'pending' && (
              <div className="space-y-2">
                <Input placeholder="Optional note to user…" value={noteMap[r.id] ?? ""}
                  onChange={e => setNoteMap(m => ({ ...m, [r.id]: e.target.value }))} className="text-sm" />
                <div className="flex gap-2">
                  <Button size="sm" className="gap-1" onClick={() => decide(r.id, 'approved')}>
                    <CheckCircle className="h-3.5 w-3.5" /> Approve & Add Part
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1" onClick={() => decide(r.id, 'rejected')}>
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </div>
            )}
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Admin() {
  const [password, setPassword] = useState<string | null>(() => sessionStorage.getItem("adminPw") || null);
  if (!password) return <AuthGate onAuth={pw => setPassword(pw)} />;
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Avatar Studio Admin</h1>
        <Button variant="outline" size="sm" onClick={() => { sessionStorage.removeItem("adminPw"); setPassword(null); }}>Sign Out</Button>
      </header>
      <div className="max-w-5xl mx-auto p-6">
        <Tabs defaultValue="requests">
          <TabsList className="mb-6">
            <TabsTrigger value="requests">Cosmetic Requests</TabsTrigger>
            <TabsTrigger value="parts">Avatar Parts</TabsTrigger>
            <TabsTrigger value="voices">Voices</TabsTrigger>
          </TabsList>
          <TabsContent value="requests"><RequestsPanel pw={password} /></TabsContent>
          <TabsContent value="parts"><PartsPanel pw={password} /></TabsContent>
          <TabsContent value="voices"><VoicesPanel pw={password} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
