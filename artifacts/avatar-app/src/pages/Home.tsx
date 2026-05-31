import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Sparkles, Palette, Mic2, Tv, Copy, Check, AlertTriangle } from "lucide-react";

export default function Home() {
  const { data: user, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const [_, setLocation] = useLocation();
  const [redirectUri, setRedirectUri] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Check for OAuth error in URL
  const params = new URLSearchParams(window.location.search);
  const oauthError = params.get("error");
  const oauthDesc = params.get("desc");

  useEffect(() => {
    if (!isLoading && user) {
      setLocation("/studio");
    }
  }, [user, isLoading, setLocation]);

  useEffect(() => {
    fetch("/api/auth/redirect-uri")
      .then((r) => r.json())
      .then((d: { redirectUri: string }) => setRedirectUri(d.redirectUri))
      .catch(() => {});
  }, []);

  const handleCopy = () => {
    if (!redirectUri) return;
    navigator.clipboard.writeText(redirectUri).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

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

        {oauthError && (
          <div className="mb-6 flex items-start gap-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3 text-sm max-w-lg text-left" data-testid="oauth-error">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Twitch login failed: {oauthError}</p>
              {oauthDesc && <p className="text-xs mt-1 opacity-80">{oauthDesc}</p>}
              {oauthError === "redirect_mismatch" && (
                <p className="text-xs mt-1 opacity-80">The redirect URL below must be registered in your Twitch Developer app.</p>
              )}
            </div>
          </div>
        )}

        <Button asChild size="lg" className="bg-[#9146FF] hover:bg-[#772CE8] text-white h-14 px-8 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all" data-testid="button-login-twitch">
          <a href="/api/auth/twitch">
            Login with Twitch to Start
          </a>
        </Button>

        {redirectUri && (
          <div className="mt-8 max-w-xl w-full text-left" data-testid="redirect-uri-section">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
              Required: Add this URL to your Twitch Developer app's OAuth Redirect URLs
            </p>
            <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-3 py-2">
              <code className="text-xs flex-1 break-all text-foreground" data-testid="text-redirect-uri">{redirectUri}</code>
              <button
                onClick={handleCopy}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                title="Copy"
                data-testid="button-copy-redirect-uri"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Go to <a href="https://dev.twitch.tv/console/apps" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">dev.twitch.tv/console/apps</a> → your app → add this as an OAuth Redirect URL.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl w-full text-left">
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
