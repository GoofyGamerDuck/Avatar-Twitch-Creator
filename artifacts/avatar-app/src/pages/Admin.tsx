import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trash2, Upload, Eye, EyeOff, ShieldAlert, Plus, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "hair_style",   label: "Hair Style" },
  { value: "eye_style",    label: "Eye Style" },
  { value: "mouth_style",  label: "Mouth Style" },
  { value: "outfit_style", label: "Outfit Style" },
  { value: "accessory",    label: "Accessory" },
];

interface AvatarPart {
  id: number; category: string; name: string; label: string;
  imageUrl: string; isActive: boolean; isBuiltIn: boolean; sortOrder: number;
}

interface Voice {
  id: number; name: string; description: string; pitch: number; rate: number;
  browserVoiceName: string | null; isActive: boolean; isBuiltIn: boolean; sortOrder: number;
}

// ── Auth gate ─────────────────────────────────────────────────────────────────
function AuthGate({ onAuth }: { onAuth: (pw: string) => void }) {
  const [pw, setPw] = useState(() => sessionStorage.getItem("adminPw") ?? "");
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    try {
      const res = await fetch("/api/admin/verify", { method: "POST", headers: { "x-admin-password": pw } });
      const data = await res.json() as { ok: boolean };
      if (data.ok) { sessionStorage.setItem("adminPw", pw); onAuth(pw); }
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
                placeholder="Enter admin password" autoFocus />
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
  const [newLabel, setNewLabel] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("hair_style");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function loadParts() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/parts", { headers: { "x-admin-password": pw } });
      const data = await res.json() as { parts: AvatarPart[] };
      setParts(data.parts ?? []);
    } catch { toast({ title: "Failed to load parts", variant: "destructive" }); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadParts(); }, []);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || !newLabel || !newName) {
      toast({ title: "Fill in all fields and choose an image", variant: "destructive" }); return;
    }
    setUploading(true);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedFile.name, size: selectedFile.size, contentType: selectedFile.type }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };
      const putRes = await fetch(uploadURL, {
        method: "PUT", headers: { "Content-Type": selectedFile.type }, body: selectedFile,
      });
      if (!putRes.ok) throw new Error("Storage upload failed");
      const serveUrl = `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;
      const saveRes = await fetch("/api/admin/parts", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({ category: newCategory, name: newName, label: newLabel, imageUrl: serveUrl }),
      });
      if (!saveRes.ok) throw new Error("Failed to save part");
      toast({ title: "Part uploaded!" });
      setNewLabel(""); setNewName(""); setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadParts();
    } catch (err) {
      toast({ title: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally { setUploading(false); }
  }

  async function toggleActive(part: AvatarPart) {
    await fetch(`/api/admin/parts/${part.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ isActive: !part.isActive }),
    });
    await loadParts();
  }

  async function deletePart(id: number) {
    if (!confirm("Delete this custom part permanently?")) return;
    await fetch(`/api/admin/parts/${id}`, { method: "DELETE", headers: { "x-admin-password": pw } });
    await loadParts();
  }

  const filtered = parts.filter(p => p.category === activeCategory);
  const builtins = filtered.filter(p => p.isBuiltIn);
  const customs = filtered.filter(p => !p.isBuiltIn);

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <Card>
        <CardHeader><CardTitle className="text-base">Upload Custom Part</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Internal name</Label>
              <Input placeholder="e.g. curly_custom" value={newName}
                onChange={e => setNewName(e.target.value.toLowerCase().replace(/\s+/g, "_"))} />
            </div>
            <div className="space-y-1">
              <Label>Display label</Label>
              <Input placeholder="e.g. Curly Custom" value={newLabel}
                onChange={e => setNewLabel(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Image file</Label>
              <Input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={uploading}>
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Uploading…" : "Upload Part"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(c => (
          <Button key={c.value} variant={activeCategory === c.value ? "default" : "outline"} size="sm"
            onClick={() => setActiveCategory(c.value)}>
            {c.label}
            <Badge variant="secondary" className="ml-2">{parts.filter(p => p.category === c.value).length}</Badge>
          </Button>
        ))}
      </div>

      {loading && <p className="text-muted-foreground text-sm">Loading…</p>}

      {/* Built-in parts */}
      {builtins.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Built-in (SVG)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {builtins.map(part => (
              <div key={part.id}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-sm ${!part.isActive ? 'opacity-50 bg-muted' : 'bg-card'}`}>
                <span className="font-medium truncate">{part.label}</span>
                <button onClick={() => toggleActive(part)} className="ml-2 flex-shrink-0 text-muted-foreground hover:text-foreground">
                  {part.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom parts */}
      {customs.length > 0 && (
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-3">Custom (uploaded)</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {customs.map(part => (
              <Card key={part.id} className={!part.isActive ? "opacity-50" : ""}>
                <CardContent className="p-3 space-y-2">
                  <img src={part.imageUrl} alt={part.label}
                    className="w-full aspect-square object-contain rounded bg-muted" />
                  <p className="font-medium text-sm truncate">{part.label}</p>
                  <p className="text-xs text-muted-foreground truncate">{part.name}</p>
                  <div className="flex gap-1">
                    <Button size="icon" variant="outline" className="h-7 w-7"
                      onClick={() => toggleActive(part)}>
                      {part.isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                    </Button>
                    <Button size="icon" variant="outline"
                      className="h-7 w-7 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => deletePart(part.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <p className="text-muted-foreground text-sm">No parts in this category yet.</p>
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
    try {
      const res = await fetch("/api/admin/voices", { headers: { "x-admin-password": pw } });
      const data = await res.json() as { voices: Voice[] };
      setVoices(data.voices ?? []);
    } catch { toast({ title: "Failed to load voices", variant: "destructive" }); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadVoices(); }, []);

  function startEdit(voice: Voice) {
    setEditingId(voice.id);
    setForm({
      name: voice.name, description: voice.description,
      pitch: voice.pitch, rate: voice.rate,
      browserVoiceName: voice.browserVoiceName ?? "",
    });
    setShowAdd(false);
  }

  async function handleSave() {
    const body = {
      name: form.name, description: form.description,
      pitch: form.pitch, rate: form.rate,
      browserVoiceName: form.browserVoiceName || null,
    };
    if (editingId) {
      await fetch(`/api/admin/voices/${editingId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify(body),
      });
      setEditingId(null);
    } else {
      await fetch("/api/admin/voices", {
        method: "POST", headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify(body),
      });
      setShowAdd(false);
    }
    setForm(emptyForm);
    await loadVoices();
    toast({ title: editingId ? "Voice updated!" : "Voice created!" });
  }

  async function toggleActive(voice: Voice) {
    await fetch(`/api/admin/voices/${voice.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json", "x-admin-password": pw },
      body: JSON.stringify({ isActive: !voice.isActive }),
    });
    await loadVoices();
  }

  async function deleteVoice(id: number) {
    if (!confirm("Delete this custom voice?")) return;
    await fetch(`/api/admin/voices/${id}`, { method: "DELETE", headers: { "x-admin-password": pw } });
    await loadVoices();
  }

  function previewVoice(voice: Voice) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(`Hi, I'm ${voice.name}. ${voice.description}.`);
    utt.pitch = voice.pitch;
    utt.rate = voice.rate;
    if (voice.browserVoiceName) {
      const bv = window.speechSynthesis.getVoices().find(v => v.name === voice.browserVoiceName);
      if (bv) utt.voice = bv;
    }
    window.speechSynthesis.speak(utt);
  }

  const VoiceForm = () => (
    <Card className="border-primary/50">
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Deep Voice" />
          </div>
          <div className="space-y-1">
            <Label>Description</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Very deep tone" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex justify-between">
              Pitch <span className="text-muted-foreground font-normal">{form.pitch.toFixed(2)}</span>
            </Label>
            <input type="range" min="0.1" max="2.5" step="0.05" value={form.pitch}
              onChange={e => setForm(f => ({ ...f, pitch: Number(e.target.value) }))}
              className="w-full accent-primary" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.1 (deep)</span><span>2.5 (high)</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex justify-between">
              Rate <span className="text-muted-foreground font-normal">{form.rate.toFixed(2)}</span>
            </Label>
            <input type="range" min="0.1" max="2.0" step="0.05" value={form.rate}
              onChange={e => setForm(f => ({ ...f, rate: Number(e.target.value) }))}
              className="w-full accent-primary" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.1 (slow)</span><span>2.0 (fast)</span>
            </div>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Browser Voice Name <span className="text-muted-foreground font-normal text-xs">(optional — exact name from speechSynthesis.getVoices())</span></Label>
          <Input value={form.browserVoiceName} onChange={e => setForm(f => ({ ...f, browserVoiceName: e.target.value }))}
            placeholder="e.g. Google US English" />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={!form.name}>
            <Check className="h-4 w-4 mr-1" />
            {editingId ? "Update" : "Create"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setShowAdd(false); setEditingId(null); setForm(emptyForm); }}>
            <X className="h-4 w-4 mr-1" /> Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      {!showAdd && !editingId && (
        <Button size="sm" onClick={() => { setShowAdd(true); setForm(emptyForm); }}>
          <Plus className="h-4 w-4 mr-2" /> Add Custom Voice
        </Button>
      )}
      {showAdd && <VoiceForm />}

      {loading && <p className="text-muted-foreground text-sm">Loading…</p>}

      <div className="space-y-2">
        {voices.map(voice => (
          <div key={voice.id}>
            {editingId === voice.id ? (
              <VoiceForm />
            ) : (
              <Card className={!voice.isActive ? "opacity-60" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{voice.name}</span>
                        {voice.isBuiltIn && <Badge variant="secondary" className="text-xs">Built-in</Badge>}
                        {!voice.isActive && <Badge variant="outline" className="text-xs text-muted-foreground">Hidden</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{voice.description}</p>
                      <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                        <span>Pitch: {voice.pitch.toFixed(2)}</span>
                        <span>Rate: {voice.rate.toFixed(2)}</span>
                        {voice.browserVoiceName && <span>Voice: {voice.browserVoiceName}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="outline" className="h-8 px-2 text-xs"
                        onClick={() => previewVoice(voice)}>
                        ▶ Test
                      </Button>
                      <Button size="icon" variant="outline" className="h-8 w-8"
                        onClick={() => startEdit(voice)}>
                        ✎
                      </Button>
                      <Button size="icon" variant="outline" className="h-8 w-8"
                        onClick={() => toggleActive(voice)}>
                        {voice.isActive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      </Button>
                      {!voice.isBuiltIn && (
                        <Button size="icon" variant="outline"
                          className="h-8 w-8 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => deleteVoice(voice.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Admin page ────────────────────────────────────────────────────────────
export default function Admin() {
  const [password, setPassword] = useState<string | null>(() => {
    const pw = sessionStorage.getItem("adminPw");
    return pw || null;
  });

  if (!password) {
    return <AuthGate onAuth={pw => setPassword(pw)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Avatar Studio Admin</h1>
        <Button variant="outline" size="sm" onClick={() => {
          sessionStorage.removeItem("adminPw");
          setPassword(null);
        }}>
          Sign Out
        </Button>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <Tabs defaultValue="parts">
          <TabsList className="mb-6">
            <TabsTrigger value="parts">Avatar Parts</TabsTrigger>
            <TabsTrigger value="voices">Voices</TabsTrigger>
          </TabsList>
          <TabsContent value="parts">
            <PartsPanel pw={password} />
          </TabsContent>
          <TabsContent value="voices">
            <VoicesPanel pw={password} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
