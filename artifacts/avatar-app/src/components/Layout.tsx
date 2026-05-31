import { Link, useLocation } from "wouter";
import { useGetMe, useLogout, getGetMeQueryKey } from "@workspace/api-client-react";
import { Button } from "./ui/button";
import { LogOut, User as UserIcon, Paintbrush } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export function Layout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey(), retry: false } });
  const logout = useLogout();
  const queryClient = useQueryClient();
  const [location] = useLocation();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
      }
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-7xl mx-auto h-16 flex items-center justify-between px-4">
          <Link href="/" className="font-mono font-bold text-xl tracking-tight text-primary flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">A</span>
            Avatar Studio
          </Link>

          <div className="flex items-center gap-4">
            {!isLoading && user ? (
              <>
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium mr-4">
                  <Link href="/studio" className={`transition-colors hover:text-primary ${location === '/studio' ? 'text-primary' : 'text-muted-foreground'}`}>
                    Studio
                  </Link>
                  <Link href="/chat" className={`transition-colors hover:text-primary ${location === '/chat' ? 'text-primary' : 'text-muted-foreground'}`}>
                    Chat
                  </Link>
                  <Link href="/profile" className={`transition-colors hover:text-primary ${location === '/profile' ? 'text-primary' : 'text-muted-foreground'}`}>
                    Profile
                  </Link>
                </nav>
                <div className="flex items-center gap-3 border-l border-border pl-4">
                  {user.profileImageUrl && (
                    <img src={user.profileImageUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-border" />
                  )}
                  <span className="text-sm font-medium hidden sm:inline-block">{user.displayName}</span>
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : !isLoading ? (
              <Button asChild variant="default" className="bg-[#9146FF] hover:bg-[#772CE8] text-white">
                <a href="/api/auth/twitch">Login with Twitch</a>
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}
