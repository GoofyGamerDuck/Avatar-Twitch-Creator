import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Clock, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = [
  { value: "hair_style",   label: "Hair Style" },
  { value: "eye_style",    label: "Eye Style" },
  { value: "mouth_style",  label: "Mouth Style" },
  { value: "outfit_style", label: "Outfit Style" },
  { value: "accessory",    label: "Accessory" },
];

interface CosmeticRequest {
  id: number; category: string; name: string; label: string;
  imageUrl: string; status: string; adminNote: string | null; createdAt: string;
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending:  <Clock className="h-3.5 w-3.5" />,
  approved: <CheckCircle className="h-3.5 w-3.5" />,
  rejected: <XCircle className="h-3.5 w-3.5" />,
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending:  "secondary",
  approved: "default",
  rejected: "destructive",
};

export default function Cosmetics() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: userLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [requests, setRequests] = useState<CosmeticRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [form, setForm] = useState({ category: "accessory", label: "", name: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!userLoading && !user) setLocation("/"); }, [user, userLoading, setLocation]);

  async function loadRequests() {
    try {
      const res = await fetch("/api/cosmetics/my-requests");
      if (res.ok) {
        const d = await res.json() as { requests: CosmeticRequest[] };
        setRequests(d.requests ?? []);
      }
    } catch { /* ignore */ }
    finally { setLoadingRequests(false); }
  }

  useEffect(() => { if (user) loadRequests(); }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || !form.label || !form.name) {
      toast({ title: "Fill in all fields and choose an image.", variant: "destructive" }); return;
    }
    setSubmitting(true);
    try {
      // 1. Get upload URL
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedFile.name, size: selectedFile.size, contentType: selectedFile.type }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json() as { uploadURL: string; objectPath: string };

      // 2. Upload to storage
      const putRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": selectedFile.type }, body: selectedFile });
      if (!putRes.ok) throw new Error("Storage upload failed");
      const imageUrl = `/api/storage/objects/${objectPath.replace(/^\/objects\//, "")}`;

      // 3. Submit request
      const subRes = await fetch("/api/cosmetics/request", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, imageUrl }),
      });
      if (!subRes.ok) throw new Error("Failed to submit request");

      toast({ title: "Request submitted!", description: "An admin will review it soon." });
      setForm({ category: "accessory", label: "", name: "" });
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadRequests();
    } catch (err) {
      toast({ title: String(err instanceof Error ? err.message : "Error"), variant: "destructive" });
    } finally { setSubmitting(false); }
  }

  if (userLoading) return <Layout><div className="flex-1 flex items-center justify-center">Loading…</div></Layout>;
  if (!user) return null;

  return (
    <Layout>
      <div className="container max-w-3xl mx-auto p-4 py-12 space-y-10">
        <div>
          <h1 className="text-3xl font-bold font-mono mb-2">Request a Cosmetic</h1>
          <p className="text-muted-foreground">
            Upload your own image and submit it for review. If approved by an admin it will become available for everyone in the studio.
          </p>
        </div>

        {/* Upload form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Internal name <span className="text-muted-foreground font-normal">(no spaces)</span></Label>
                  <Input placeholder="e.g. my_cool_hat"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_') }))} />
                </div>
                <div className="space-y-1">
                  <Label>Display label</Label>
                  <Input placeholder="e.g. My Cool Hat"
                    value={form.label}
                    onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Image file <span className="text-muted-foreground font-normal">(PNG/SVG recommended)</span></Label>
                  <Input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="gap-2">
                <Upload className="h-4 w-4" />
                {submitting ? "Submitting…" : "Submit Request"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Existing requests */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Requests</h2>
          {loadingRequests && <p className="text-muted-foreground text-sm">Loading…</p>}
          {!loadingRequests && requests.length === 0 && (
            <p className="text-muted-foreground text-sm italic">You haven't submitted any requests yet.</p>
          )}
          <div className="space-y-3">
            {requests.map(r => (
              <Card key={r.id}>
                <CardContent className="p-4 flex gap-4 items-start">
                  <img src={r.imageUrl} alt={r.label}
                    className="w-16 h-16 rounded-lg object-contain bg-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold">{r.label}</span>
                      <Badge variant={STATUS_VARIANTS[r.status] ?? "outline"}
                        className="gap-1 text-xs capitalize">
                        {STATUS_ICONS[r.status]}
                        {r.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {CATEGORIES.find(c => c.value === r.category)?.label ?? r.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{r.name}</p>
                    {r.adminNote && (
                      <p className="mt-1 text-sm text-muted-foreground italic">Admin: "{r.adminNote}"</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
