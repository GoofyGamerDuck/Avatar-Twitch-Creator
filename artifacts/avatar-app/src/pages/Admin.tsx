import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Upload, Eye, EyeOff, ShieldAlert, Plus, X, Check, Palette, CheckCircle, XCircle } from "lucide-react";
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
  browserVoiceName: string | null; isActive: boolean; isBuiltIn: boolean; sortOrder: number;
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
  const [loading, setLoading] = useState(false);
  const [newLabel, setNewLabel] = useState(""); const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("hair_style");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function loadParts() {
    setLoading(true);
    try { const d = await fetch("/api/admin/parts", { headers: { "x-admin-password": pw } }).then(r => r.json()) as { parts: AvatarPart[] }; setParts(d.parts ?? []); }
    catch { toast({ title: "Failed to load parts", variant: "destructive" }); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadParts(); }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || !newLabel || !newName) { toast({ title: "Fill in all fields", variant: "destructive" }); return; }
    setUploading(true);
    try {
      const { uploadURL, objectPath } = await fetch("/api/storage/uploads/request-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedFile.name, size: selectedFile.size, contentType: selectedFile.type }),
      }).then(r => r.json()) as { uploadURL: string; objectPath: string };
      await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": selectedFile.type }, body: selectedFile });
      const imageUrl = `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
      await fetch("/api/admin/parts", {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({ category: newCategory, name: newName, label: newLabel, imageUrl }),
      });
      toast({ title: "Part uploaded!" });
      setNewLabel(""); setNewName(""); setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadParts();
    } catch (err) { toast({ title: String(err instanceof Error ? err.message : err), variant: "destructive" }); }
    finally { setUploading(false); }
  }

  async function patchPart(id: number, patch: object) {
    await fetch(`/api/admin/parts/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-password": pw }, body: JSON.stringify(patch) });
    await loadParts();
  }
  async function deletePart(id: number) {
    if (!confirm("Delete permanently?")) return;
    await fetch(`/api/admin/parts/${id}`, { method: "DELETE", headers: { "x-admin-password": pw } });
    await loadParts();
  }

  const filtered = parts.filter(p => p.category === activeCategory);
  const builtins = filtered.filter(p => p.isBuiltIn);
  const customs = filtered.filter(p => !p.isBuiltIn);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Upload Custom Part</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Internal name</Label>
              <Input placeholder="e.g. curly_custom" value={newName} onChange={e => setNewName(e.target.value.toLowerCase().replace(/\s+/g, "_"))} />
            </div>
            <div className="space-y-1"><Label>Display label</Label><Input placeholder="e.g. Curly Custom" value={newLabel} onChange={e => setNewLabel(e.target.value)} /></div>
            <div className="space-y-1"><Label>Image file</Label>
              <Input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="md:col-span-2"><Button type="submit" disabled={uploading}><Upload className="h-4 w-4 mr-2" />{uploading ? "Uploading…" : "Upload Part"}</Button></div>
          </form>
        </CardContent>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <Button key={c.value} variant={activeCategory === c.value ? "default" : "outline"} size="sm" onClick={() => setActiveCategory(c.value)}>
            {c.label}<Badge variant="secondary" className="ml-2">{parts.filter(p => p.category === c.value).length}</Badge>
          </Button>
        ))}
      </div>
      {loading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {builtins.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Built-in (SVG)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {builtins.map(part => (
              <div key={part.id} className={`flex items-center justify-between p-2.5 rounded-lg border text-sm gap-2 ${!part.isActive ? 'opacity-50 bg-muted' : 'bg-card'}`}>
                <span className="font-medium truncate flex-1">{part.label}</span>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => patchPart(part.id, { allowColorOverride: !part.allowColorOverride })} title={part.allowColorOverride ? "Colour override on" : "off"} className={`p-1 rounded ${part.allowColorOverride ? 'text-primary' : 'text-muted-foreground'}`}><Palette className="h-3.5 w-3.5" /></button>
                  <button onClick={() => patchPart(part.id, { isActive: !part.isActive })} className="p-1 rounded text-muted-foreground hover:text-foreground">{part.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">🎨 = colour override enabled for this part.</p>
        </div>
      )}
      {customs.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Custom (uploaded)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {customs.map(part => (
              <Card key={part.id} className={!part.isActive ? "opacity-50" : ""}>
                <CardContent className="p-3 space-y-2">
                  <img src={part.imageUrl} alt={part.label} className="w-full aspect-square object-contain rounded bg-muted" />
                  <p className="font-medium text-sm truncate">{part.label}</p>
                  <div className="flex gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7" title={part.allowColorOverride ? "Colour override on" : "off"} onClick={() => patchPart(part.id, { allowColorOverride: !part.allowColorOverride })}><Palette className={`h-3 w-3 ${part.allowColorOverride ? 'text-primary' : 'text-muted-foreground'}`} /></Button>
                    <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => patchPart(part.id, { isActive: !part.isActive })}>{part.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}</Button>
                    <Button size="icon" variant="outline" className="h-7 w-7 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => deletePart(part.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
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
  const emptyForm = { name: "", description: "", pitch: 1.0, rate: 1.0, browserVoiceName: "" };
  const [form, setForm] = useState(emptyForm);

  async function loadVoices() {
    setLoading(true);
    try { const d = await fetch("/api/admin/voices", { headers: { "x-admin-password": pw } }).then(r => r.json()) as { voices: Voice[] }; setVoices(d.voices ?? []); }
    catch { toast({ title: "Failed to load voices", variant: "destructive" }); }
    finally { setLoading(false); }
  }
  useEffect(() => { loadVoices(); }, []);

  function startEdit(v: Voice) { setEditingId(v.id); setForm({ name: v.name, description: v.description, pitch: v.pitch, rate: v.rate, browserVoiceName: v.browserVoiceName ?? "" }); setShowAdd(false); }
  async function handleSave() {
    const body = { name: form.name, description: form.description, pitch: form.pitch, rate: form.rate, browserVoiceName: form.browserVoiceName || null };
    if (editingId) { await fetch(`/api/admin/voices/${editingId}`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-password": pw }, body: JSON.stringify(body) }); setEditingId(null); }
    else { await fetch("/api/admin/voices", { method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": pw }, body: JSON.stringify(body) }); setShowAdd(false); }
    setForm(emptyForm); await loadVoices(); toast({ title: editingId ? "Voice updated!" : "Voice created!" });
  }
  async function toggleActive(v: Voice) { await fetch(`/api/admin/voices/${v.id}`, { method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ isActive: !v.isActive }) }); await loadVoices(); }
  async function deleteVoice(id: number) { if (!confirm("Delete this custom voice?")) return; await fetch(`/api/admin/voices/${id}`, { method: "DELETE", headers: { "x-admin-password": pw } }); await loadVoices(); }
  function previewVoice(v: Voice) {
    if (!window.speechSynthesis) return; window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(`Hi, I'm ${v.name}. ${v.description}.`);
    utt.pitch = v.pitch; utt.rate = v.rate;
    if (v.browserVoiceName) { const bv = window.speechSynthesis.getVoices().find(vv => vv.name === v.browserVoiceName); if (bv) utt.voice = bv; }
    window.speechSynthesis.speak(utt);
  }

  const VoiceForm = () => (
    <Card className="border-primary/50"><CardContent className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Deep Voice" /></div>
        <div className="space-y-1"><Label>Description</Label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Very deep tone" /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[{ k: 'pitch', label: 'Pitch', min: 0.1, max: 2.5 }, { k: 'rate', label: 'Rate', min: 0.1, max: 2.0 }].map(s => (
          <div key={s.k} className="space-y-2"><Label className="flex justify-between">{s.label} <span className="text-muted-foreground font-normal">{(form[s.k as 'pitch' | 'rate']).toFixed(2)}</span></Label>
            <input type="range" min={s.min} max={s.max} step="0.05" value={form[s.k as 'pitch' | 'rate']} onChange={e => setForm(f => ({ ...f, [s.k]: Number(e.target.value) }))} className="w-full accent-primary" /></div>
        ))}
      </div>
      <div className="space-y-1"><Label>Browser Voice Name <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label><Input value={form.browserVoiceName} onChange={e => setForm(f => ({ ...f, browserVoiceName: e.target.value }))} placeholder="e.g. Google US English" /></div>
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={!form.name}><Check className="h-4 w-4 mr-1" />{editingId ? "Update" : "Create"}</Button>
        <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setEditingId(null); setForm(emptyForm); }}><X className="h-4 w-4 mr-1" /> Cancel</Button>
      </div>
    </CardContent></Card>
  );

  return (
    <div className="space-y-4">
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
                    <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold">{voice.name}</span>{voice.isBuiltIn && <Badge variant="secondary" className="text-xs">Built-in</Badge>}{!voice.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Hidden</Badge>}</div>
                    <p className="text-sm text-muted-foreground mt-0.5">{voice.description}</p>
                    <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground"><span>Pitch: {voice.pitch.toFixed(2)}</span><span>Rate: {voice.rate.toFixed(2)}</span>{voice.browserVoiceName && <span>Voice: {voice.browserVoiceName}</span>}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="outline" className="h-8 px-2 text-xs" onClick={() => previewVoice(voice)}>▶ Test</Button>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => startEdit(voice)}>✎</Button>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => toggleActive(voice)}>{voice.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}</Button>
                    {!voice.isBuiltIn && <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => deleteVoice(voice.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}
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

  const filterBtns = ['pending', 'approved', 'rejected'];
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {filterBtns.map(s => (
          <Button key={s} size="sm" variant={filter === s ? "default" : "outline"} className="capitalize"
            onClick={() => setFilter(s)}>{s}</Button>
        ))}
        <Button size="sm" variant="ghost" onClick={load}>↺ Refresh</Button>
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {!loading && requests.length === 0 && <p className="text-muted-foreground text-sm italic">No {filter} requests.</p>}

      <div className="space-y-4">
        {requests.map(r => (
          <Card key={r.id}>
            <CardContent className="p-5 space-y-4">
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
                {/* Live preview */}
                <div className="w-24 h-24 flex-shrink-0">
                  <AvatarPreview
                    skinTone="medium"
                    hairColor="brown"
                    hairStyle={r.category === 'hair_style' ? r.name : 'short'}
                    eyeStyle={r.category === 'eye_style' ? r.name : 'default'}
                    mouthStyle={r.category === 'mouth_style' ? r.name : 'smile'}
                    outfitStyle={r.category === 'outfit_style' ? r.name : 'casual'}
                    accessories={r.category === 'accessory' ? [{ name: r.name, color: '#3b82f6' }] as AccessoryItem[] : []}
                    customPartImages={{ [r.name]: r.imageUrl }}
                  />
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
            </CardContent>
          </Card>
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
