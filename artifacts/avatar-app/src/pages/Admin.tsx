import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Upload, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "hair_style", label: "Hair Style" },
  { value: "eye_style", label: "Eye Style" },
  { value: "mouth_style", label: "Mouth Style" },
  { value: "outfit_style", label: "Outfit Style" },
  { value: "accessory", label: "Accessory" },
];

interface AvatarPart {
  id: number;
  category: string;
  name: string;
  label: string;
  imageUrl: string;
  isActive: boolean;
  sortOrder: number;
}

export default function Admin() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [password, setPassword] = useState(() => sessionStorage.getItem("adminPw") ?? "");
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(false);

  const [parts, setParts] = useState<AvatarPart[]>([]);
  const [activeCategory, setActiveCategory] = useState("hair_style");
  const [loading, setLoading] = useState(false);

  const [newLabel, setNewLabel] = useState("");
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("hair_style");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthChecking(true);
    try {
      const res = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "x-admin-password": password },
      });
      const data = await res.json() as { ok: boolean };
      if (data.ok) {
        sessionStorage.setItem("adminPw", password);
        setAuthenticated(true);
      } else {
        toast({ title: "Wrong password", variant: "destructive" });
      }
    } catch {
      toast({ title: "Connection error", variant: "destructive" });
    } finally {
      setAuthChecking(false);
    }
  }

  async function loadParts() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/parts", {
        headers: { "x-admin-password": password },
      });
      const data = await res.json() as { parts: AvatarPart[] };
      setParts(data.parts ?? []);
    } catch {
      toast({ title: "Failed to load parts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authenticated) loadParts();
  }, [authenticated]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || !newLabel || !newName) {
      toast({ title: "Fill in all fields and choose an image", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selectedFile.name,
          size: selectedFile.size,
          contentType: selectedFile.type,
        }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };

      const putRes = await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");

      const serveUrl = `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;

      const saveRes = await fetch("/api/admin/parts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-password": password,
        },
        body: JSON.stringify({
          category: newCategory,
          name: newName,
          label: newLabel,
          imageUrl: serveUrl,
        }),
      });
      if (!saveRes.ok) throw new Error("Failed to save part");

      toast({ title: "Part uploaded successfully!" });
      setNewLabel("");
      setNewName("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadParts();
    } catch (err) {
      toast({ title: String(err instanceof Error ? err.message : err), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function toggleActive(part: AvatarPart) {
    await fetch(`/api/admin/parts/${part.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-password": password,
      },
      body: JSON.stringify({ isActive: !part.isActive }),
    });
    await loadParts();
  }

  async function deletePart(id: number) {
    if (!confirm("Delete this part permanently?")) return;
    await fetch(`/api/admin/parts/${id}`, {
      method: "DELETE",
      headers: { "x-admin-password": password },
    });
    await loadParts();
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <ShieldAlert className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <CardTitle>Admin Access</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={authChecking}>
                {authChecking ? "Checking..." : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredParts = parts.filter((p) => p.category === activeCategory);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Avatar Parts Admin</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            sessionStorage.removeItem("adminPw");
            setAuthenticated(false);
          }}
        >
          Sign Out
        </Button>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload New Part</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Internal Name (unique identifier)</Label>
                <Input
                  placeholder="e.g. curly_custom"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value.toLowerCase().replace(/\s+/g, "_"))}
                />
              </div>
              <div className="space-y-1">
                <Label>Display Label</Label>
                <Input
                  placeholder="e.g. Curly Custom"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Image File</Label>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={uploading}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Part"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div>
          <div className="flex gap-2 mb-4 flex-wrap">
            {CATEGORIES.map((c) => (
              <Button
                key={c.value}
                variant={activeCategory === c.value ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveCategory(c.value)}
              >
                {c.label}
                <Badge variant="secondary" className="ml-2">
                  {parts.filter((p) => p.category === c.value).length}
                </Badge>
              </Button>
            ))}
          </div>

          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : filteredParts.length === 0 ? (
            <p className="text-muted-foreground text-sm">No parts in this category yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredParts.map((part) => (
                <Card key={part.id} className={!part.isActive ? "opacity-50" : ""}>
                  <CardContent className="p-3 space-y-2">
                    <img
                      src={part.imageUrl}
                      alt={part.label}
                      className="w-full aspect-square object-contain rounded bg-muted"
                    />
                    <p className="font-medium text-sm truncate">{part.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{part.name}</p>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => toggleActive(part)}
                        title={part.isActive ? "Hide" : "Show"}
                      >
                        {part.isActive ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => deletePart(part.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
