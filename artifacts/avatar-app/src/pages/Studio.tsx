import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { AvatarPreview } from "@/components/AvatarPreview";
import { useGetMe, useGetMyAvatar, useSaveAvatar, getGetMeQueryKey, getGetMyAvatarQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SKIN_TONES, HAIR_COLORS, HAIR_STYLES, EYE_STYLES, MOUTH_STYLES, OUTFIT_STYLES, ACCESSORIES, VOICES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

export default function Studio() {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading: userLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const { data: avatarSettings, isLoading: avatarLoading } = useGetMyAvatar({ query: { queryKey: getGetMyAvatarQueryKey(), enabled: !!user } });
  const saveAvatar = useSaveAvatar();
  const { toast } = useToast();

  const [settings, setSettings] = useState({
    skinTone: "light",
    hairStyle: "short",
    hairColor: "brown",
    eyeStyle: "default",
    mouthStyle: "smile",
    outfitStyle: "casual",
    accessory: "none",
    voiceId: "alloy",
  });

  useEffect(() => {
    if (!userLoading && !user) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation]);

  useEffect(() => {
    if (avatarSettings) {
      setSettings({
        skinTone: avatarSettings.skinTone,
        hairStyle: avatarSettings.hairStyle,
        hairColor: avatarSettings.hairColor,
        eyeStyle: avatarSettings.eyeStyle,
        mouthStyle: avatarSettings.mouthStyle,
        outfitStyle: avatarSettings.outfitStyle,
        accessory: avatarSettings.accessory || "none",
        voiceId: avatarSettings.voiceId,
      });
    }
  }, [avatarSettings]);

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    saveAvatar.mutate({
      data: {
        ...settings,
        accessory: settings.accessory === "none" ? null : settings.accessory,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Avatar saved!", description: "Your profile has been updated." });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to save avatar.", variant: "destructive" });
      }
    });
  };

  if (userLoading || avatarLoading) return <Layout><div className="flex-1 flex items-center justify-center">Loading studio...</div></Layout>;
  if (!user) return null;

  return (
    <Layout>
      <div className="container max-w-7xl mx-auto p-4 flex-1 flex flex-col md:flex-row gap-8">
        {/* Preview Panel */}
        <div className="w-full md:w-[400px] flex-shrink-0 flex flex-col gap-4">
          <div className="bg-card border border-border rounded-3xl p-6 shadow-xl sticky top-24">
            <h2 className="text-xl font-bold font-mono mb-4 text-center">Live Preview</h2>
            <AvatarPreview {...settings} />
            <div className="mt-6 flex gap-3">
              <Button onClick={handleSave} className="flex-1" disabled={saveAvatar.isPending}>
                {saveAvatar.isPending ? "Saving..." : "Save Avatar"}
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link href="/profile">View Profile</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="flex-1 bg-card border border-border rounded-3xl overflow-hidden shadow-xl flex flex-col">
          <div className="p-6 border-b border-border bg-muted/30">
            <h1 className="text-2xl font-bold font-mono">Customization Studio</h1>
            <p className="text-muted-foreground text-sm">Tweak your avatar and select your TTS voice.</p>
          </div>
          
          <ScrollArea className="flex-1 p-6">
            <Tabs defaultValue="appearance" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
                <TabsTrigger value="appearance" className="text-base h-full">Appearance</TabsTrigger>
                <TabsTrigger value="voice" className="text-base h-full">Voice & TTS</TabsTrigger>
              </TabsList>
              
              <TabsContent value="appearance" className="space-y-8">
                <div className="space-y-4">
                  <Label className="text-base font-semibold">Skin Tone</Label>
                  <div className="flex flex-wrap gap-3">
                    {SKIN_TONES.map(tone => (
                      <button
                        key={tone.id}
                        onClick={() => updateSetting('skinTone', tone.id)}
                        className={`w-12 h-12 rounded-full border-2 transition-all hover:scale-110 ${settings.skinTone === tone.id ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-border'}`}
                        style={{ backgroundColor: tone.hex }}
                        title={tone.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">Hair Color</Label>
                  <div className="flex flex-wrap gap-3">
                    {HAIR_COLORS.map(color => (
                      <button
                        key={color.id}
                        onClick={() => updateSetting('hairColor', color.id)}
                        className={`w-12 h-12 rounded-full border-2 transition-all hover:scale-110 ${settings.hairColor === color.id ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-border'}`}
                        style={{ backgroundColor: color.hex }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Hair Style</Label>
                    <Select value={settings.hairStyle} onValueChange={(val) => updateSetting('hairStyle', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        {HAIR_STYLES.map(style => (
                          <SelectItem key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Eye Style</Label>
                    <Select value={settings.eyeStyle} onValueChange={(val) => updateSetting('eyeStyle', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        {EYE_STYLES.map(style => (
                          <SelectItem key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Mouth Style</Label>
                    <Select value={settings.mouthStyle} onValueChange={(val) => updateSetting('mouthStyle', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select style" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOUTH_STYLES.map(style => (
                          <SelectItem key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Outfit Style</Label>
                    <Select value={settings.outfitStyle} onValueChange={(val) => updateSetting('outfitStyle', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outfit" />
                      </SelectTrigger>
                      <SelectContent>
                        {OUTFIT_STYLES.map(style => (
                          <SelectItem key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Accessory</Label>
                    <Select value={settings.accessory} onValueChange={(val) => updateSetting('accessory', val)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select accessory" />
                      </SelectTrigger>
                      <SelectContent>
                        {ACCESSORIES.map(style => (
                          <SelectItem key={style} value={style}>{style.charAt(0).toUpperCase() + style.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="voice" className="space-y-6 pt-4">
                 <div className="space-y-4 max-w-md">
                    <Label className="text-lg">Text-to-Speech Voice</Label>
                    <p className="text-sm text-muted-foreground mb-4">Select the voice that your stream bot will use when reading alerts or chat messages.</p>
                    <Select value={settings.voiceId} onValueChange={(val) => updateSetting('voiceId', val)}>
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {VOICES.map(voice => (
                          <SelectItem key={voice.id} value={voice.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{voice.name}</span>
                              <span className="text-muted-foreground text-sm ml-4">{voice.description}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                 </div>
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </div>
      </div>
    </Layout>
  );
}
