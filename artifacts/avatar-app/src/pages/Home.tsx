import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { useEffect } from "react";
import { Sparkles, Palette, Mic2, Tv } from "lucide-react";

export default function Home() {
  const { data: user, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const [_, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/studio");
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) return <Layout><div className="flex-1 flex items-center justify-center">Loading...</div></Layout>;

  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20">
          <Sparkles className="w-4 h-4" /> Create your on-stream persona
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-3xl font-mono">
          Your Stream, <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Your Avatar.</span>
        </h1>
        
        <p className="text-xl text-muted-foreground mb-10 max-w-2xl">
          A playful studio for Twitch streamers. Craft your visual avatar and pick a custom TTS voice for your stream bots.
        </p>

        <Button asChild size="lg" className="bg-[#9146FF] hover:bg-[#772CE8] text-white h-14 px-8 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all">
          <a href="/api/auth/twitch">
            Login with Twitch to Start
          </a>
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-4xl w-full text-left">
          <div className="p-6 rounded-2xl bg-card border border-border">
            <Palette className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-semibold text-lg mb-2">Visual Avatar</h3>
            <p className="text-muted-foreground text-sm">Customize hair, eyes, outfits, and accessories to match your style.</p>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border">
            <Mic2 className="w-8 h-8 text-accent mb-4" />
            <h3 className="font-semibold text-lg mb-2">Custom TTS Voice</h3>
            <p className="text-muted-foreground text-sm">Choose from a variety of expressive text-to-speech voices for your bot.</p>
          </div>
          <div className="p-6 rounded-2xl bg-card border border-border">
            <Tv className="w-8 h-8 text-emerald-500 mb-4" />
            <h3 className="font-semibold text-lg mb-2">Public API</h3>
            <p className="text-muted-foreground text-sm">Easily integrate your saved avatar and voice into your favorite stream bot.</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
