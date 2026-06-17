import { Link } from "@tanstack/react-router";
import { Home, Newspaper, LineChart, User } from "lucide-react";

const items: Array<{ to: string; label: string; Icon: typeof Home; exact?: boolean }> = [
  { to: "/", label: "Home", Icon: Home, exact: true },
  { to: "/news", label: "News", Icon: Newspaper },
  { to: "/market", label: "Market", Icon: LineChart },
  { to: "/profile", label: "Profile", Icon: User },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
      <div className="mx-auto flex max-w-md items-center justify-around rounded-2xl glass-strong px-2 py-2 shadow-2xl">
        {items.map(({ to, label, Icon, exact }) => (
          <Link
            key={to}
            to={to as never}
            activeOptions={{ exact: !!exact }}
            className="group flex flex-1 flex-col items-center gap-1 rounded-xl px-3 py-2 text-muted-foreground transition-colors data-[status=active]:text-foreground"
          >
            <Icon className="h-5 w-5 transition-transform group-hover:scale-110 group-data-[status=active]:text-violet" />
            <span className="text-[10px] font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}