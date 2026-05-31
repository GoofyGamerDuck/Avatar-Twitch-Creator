import { Layout } from "@/components/Layout";
import { AvatarPreview, type AccessoryItem } from "@/components/AvatarPreview";
import { useGetMe, useGetMyAvatar, getGetMeQueryKey, getGetMyAvatarQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import type { PartPositionsMap } from "@/components/AvatarPreview";

interface DbPart { id: number; name: string; imageUrl: string; }

export default function Profile() {
  const [, setLocation] = useLocation();
  const { data: user, isLoading: userLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const { data: avatarSettings, isLoading: avatarLoading } = useGetMyAvatar({ query: { queryKey: getGetMyAvatarQueryKey(), enabled: !!user } });
  const [copied, setCopied] = useState(false);
  const [customPartImages, setCustomPartImages] = useState<Record<string, string>>({});

  useEffect(() => { if (!userLoading && !user) setLocation("/"); }, [user, userLoading, setLocation]);

  useEffect(() => {
    fetch("/api/parts").then(r => r.json())
      .then((d: { parts: DbPart[] }) => {
        const map: Record<string, string> = {};
        d.parts?.forEach(p => { if (p.imageUrl) map[p.name] = p.imageUrl; });
        setCustomPartImages(map);
      }).catch(() => {});
  }, []);

  if (userLoading || avatarLoading) return <Layout><div className="flex-1 flex items-center justify-center">Loading…</div></Layout>;
  if (!user || !avatarSettings) return null;

  const publicApiUrl = `${window.location.origin}/api/users/${user.twitchUsername}/avatar`;

  const resolvedAccessories: AccessoryItem[] =
    avatarSettings.accessories?.length
      ? avatarSettings.accessories as AccessoryItem[]
      : (avatarSettings.accessory && avatarSettings.accessory !== 'none'
        ? [{ name: avatarSettings.accessory, color: avatarSettings.accessoryColor ?? '#3b82f6' }]
        : []);

  return (
    <Layout>
      <div className="container max-w-4xl mx-auto p-4 py-12">
        <h1 className="text-3xl font-bold font-mono mb-8">Your Profile</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xl text-center">
              <div className="w-48 h-48 mx-auto mb-6">
                <AvatarPreview
                  skinTone={avatarSettings.skinTone}
                  hairStyle={avatarSettings.hairStyle}
                  hairColor={avatarSettings.hairColor}
                  eyeStyle={avatarSettings.eyeStyle}
                  eyeColor={avatarSettings.eyeColor ?? "#1e1b4b"}
                  eyeWidth={avatarSettings.eyeWidth ?? 1.0}
                  mouthStyle={avatarSettings.mouthStyle}
                  outfitStyle={avatarSettings.outfitStyle}
                  outfitColor={avatarSettings.outfitColor ?? "#2563eb"}
                  accessory={avatarSettings.accessory ?? null}
                  accessoryColor={avatarSettings.accessoryColor ?? "#3b82f6"}
                  accessories={resolvedAccessories}
                  customPartImages={customPartImages}
                  partPositions={avatarSettings.partPositions as PartPositionsMap}
                  layerOrder={avatarSettings.layerOrder as string[]}
                />
              </div>
              <h2 className="text-xl font-bold">{user.displayName}</h2>
              <p className="text-muted-foreground text-sm mb-4">@{user.twitchUsername}</p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/studio">Edit Avatar</Link>
              </Button>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xl">
              <h3 className="text-xl font-semibold mb-4">Integration Details</h3>
              <p className="text-muted-foreground mb-6">
                Share this URL with your stream bot or overlays to pull your latest avatar config automatically.
              </p>
              <div className="space-y-2 mb-6">
                <Label>Public API URL</Label>
                <div className="flex gap-2">
                  <Input readOnly value={publicApiUrl} className="font-mono text-xs bg-muted" />
                  <Button variant="secondary" onClick={() => { navigator.clipboard.writeText(publicApiUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-xl text-sm font-mono overflow-x-auto text-muted-foreground">
                <span className="text-primary">GET</span> {publicApiUrl}
              </div>
              <div className="mt-8 p-4 border border-primary/20 bg-primary/5 rounded-xl flex items-start gap-3">
                <ExternalLink className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-primary mb-1">Developer Note</h4>
                  <p className="text-sm text-muted-foreground">
                    Returns all avatar attributes including the <code>accessories</code> array and <code>voiceId</code> ("{avatarSettings.voiceId}"). No authentication required.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
