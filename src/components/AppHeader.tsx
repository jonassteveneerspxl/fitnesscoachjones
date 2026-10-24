import { Dumbbell } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/UserMenu";

interface AppHeaderProps {
  /** Breedte van de inhoud, zodat de header aansluit bij de pagina eronder. */
  containerClassName?: string;
}

const linkClass =
  "px-3 py-1.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors";
const activeClass = "bg-primary/15 text-primary hover:text-primary";

export function AppHeader({ containerClassName = "max-w-2xl" }: AppHeaderProps) {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className={cn("container py-4", containerClassName)}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl gradient-primary">
            <Dumbbell className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-foreground">Fitness Coach</h1>
            <p className="text-sm text-muted-foreground">Track je gains, breek records</p>
          </div>
          <UserMenu />
        </div>
        <nav className="mt-3 flex gap-1" aria-label="Hoofdnavigatie">
          <NavLink to="/" end className={linkClass} activeClassName={activeClass}>
            Training
          </NavLink>
          <NavLink to="/statistieken" className={linkClass} activeClassName={activeClass}>
            Statistieken
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
