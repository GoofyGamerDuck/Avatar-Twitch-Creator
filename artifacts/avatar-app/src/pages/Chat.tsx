import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Wifi, WifiOff } from "lucide-react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import AvatarPreview from "@/components/AvatarPreview";
import { Layout } from "@/components/Layout";

interface AvatarData {
  skinTone: string;
  hairStyle: string;
  hairColor: string;
  headShape: string;
  eyeStyle: string;
  eyeColor: string;
  eyeWidth: number;
  eyeSpacing: number;
  mouthStyle: string;
  mouthColor: string;
  outfitStyle: string;
  outfitColor: string;
  accessory: string | null;
  accessoryColor: string;
  accessories: { name: string; color: string; position?: { x: number; y: number; scale: number } }[];
  layerOrder: string[];
  backgroundColor: string;
  partPositions: Record<string, { x: number; y: number; scale?: number }>;
  voiceId: string;
}

interface ChatMessage {
  id: string;
  username: string;
  displayName: string;
  message: string;
  color: string | null;
  avatar: AvatarData | null;
  profileImageUrl: string | null;
}

export default function Chat() {
  const [, setLocation] = useLocation();
  const { data: me, isLoading: meLoading } = useGetMe();
  const [channel, setChannel] = useState("");
  const [inputChannel, setInputChannel] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!meLoading && !me) setLocation("/");
  }, [me, meLoading, setLocation]);

  useEffect(() => {
    if (me?.twitchUsername && !channel) {
      const ch = me.twitchUsername;
      setChannel(ch);
      setInputChannel(ch);
    }
  }, [me]);

  useEffect(() => {
    if (!channel) return;
    connectToChannel(channel);
    return () => {
      eventSourceRef.current?.close();
    };
  }, [channel]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  function connectToChannel(ch: string) {
    eventSourceRef.current?.close();
    setConnecting(true);
    setConnected(false);
    setMessages([]);

    const es = new EventSource(`/api/chat/stream?channel=${encodeURIComponent(ch)}`);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setConnecting(false);
    };

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as ChatMessage;
        setMessages((prev) => [...prev.slice(-199), msg]);
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      setConnecting(false);
    };

    es.addEventListener("error", () => {
      setConnected(false);
    });
  }

  function handleChannelSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ch = inputChannel.trim().toLowerCase().replace(/^#/, "");
    if (ch) setChannel(ch);
  }

  if (meLoading) return null;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5" />
          <h1 className="text-xl font-semibold">Live Chat Viewer</h1>
          <div className="ml-auto flex items-center gap-2 text-sm">
            {connecting && <span className="text-muted-foreground">Connecting...</span>}
            {connected && (
              <Badge variant="outline" className="gap-1 text-green-600 border-green-600">
                <Wifi className="h-3 w-3" />
                Live
              </Badge>
            )}
            {!connected && !connecting && channel && (
              <Badge variant="outline" className="gap-1 text-red-500 border-red-500">
                <WifiOff className="h-3 w-3" />
                Disconnected
              </Badge>
            )}
          </div>
        </div>

        <form onSubmit={handleChannelSubmit} className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="channel" className="sr-only">Channel</Label>
            <Input
              id="channel"
              placeholder="Channel name (e.g. pokimane)"
              value={inputChannel}
              onChange={(e) => setInputChannel(e.target.value)}
            />
          </div>
          <Button type="submit">Watch</Button>
        </form>

        <Card>
          <CardContent className="p-0">
            <div
              ref={scrollRef}
              className="h-[60vh] overflow-y-auto p-3 space-y-2"
            >
              {messages.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-8">
                  {channel ? "Waiting for messages..." : "Enter a channel name above to start watching."}
                </p>
              )}
              {messages.map((msg) => (
                <MessageRow key={msg.id} msg={msg} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function MessageRow({ msg }: { msg: ChatMessage }) {
  const nameColor = msg.color ?? "#9B59B6";
  return (
    <div className="flex items-start gap-2 group">
      <div className="flex-shrink-0 w-8 h-8">
        {msg.avatar ? (
          <AvatarPreview
            skinTone={msg.avatar.skinTone}
            hairStyle={msg.avatar.hairStyle}
            hairColor={msg.avatar.hairColor}
            headShape={msg.avatar.headShape}
            eyeStyle={msg.avatar.eyeStyle}
            eyeColor={msg.avatar.eyeColor}
            eyeWidth={msg.avatar.eyeWidth}
            eyeSpacing={msg.avatar.eyeSpacing}
            mouthStyle={msg.avatar.mouthStyle}
            mouthColor={msg.avatar.mouthColor}
            outfitStyle={msg.avatar.outfitStyle}
            outfitColor={msg.avatar.outfitColor}
            accessory={msg.avatar.accessory}
            accessoryColor={msg.avatar.accessoryColor}
            accessories={msg.avatar.accessories}
            layerOrder={msg.avatar.layerOrder}
            backgroundColor={msg.avatar.backgroundColor}
            partPositions={msg.avatar.partPositions}
          />
        ) : msg.profileImageUrl ? (
          <img
            src={msg.profileImageUrl}
            alt={msg.displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
            {msg.displayName[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-sm" style={{ color: nameColor }}>
          {msg.displayName}
        </span>
        <span className="text-muted-foreground text-sm">: </span>
        <span className="text-sm break-words">{msg.message}</span>
      </div>
    </div>
  );
}
