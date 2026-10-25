import { BarChart3, Dumbbell } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { UserMenu } from "@/components/UserMenu";

interface AppHeaderProps {
  /** Breedte van de inhoud, zodat de header aansluit bij de pagina eronder. */
  containerClassName?: string;
}

const tabClass =
  "flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors";
const activeClass = "bg-primary/15 text-primary hover:text-primary";

export function AppHeader({ containerClassName = "max-w-2xl" }: AppHeaderProps) {
  return (
    <>
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className={cn("container py-3", containerClassName)}>
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg gradient-primary">
              <Dumbbell className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="flex-1 min-w-0 text-lg font-bold text-foreground">Fitness Coach</h1>
            <UserMenu />
          </div>
        </div>
      </header>
      {/* Onderaan het scherm: makkelijk te bereiken met je duim. De pagina's laten hier ruimte voor. */}
      <nav
        className="fixed bottom-0 inset-x-0 z-10 border-t border-border bg-card/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
        aria-label="Hoofdnavigatie"
      >
        <div className={cn("container flex gap-2 py-2", containerClassName)}>
          <NavLink to="/" end className={tabClass} activeClassName={activeClass}>
            <Dumbbell className="w-5 h-5" />
            Training
          </NavLink>
          <NavLink to="/statistieken" className={tabClass} activeClassName={activeClass}>
            <BarChart3 className="w-5 h-5" />
            Statistieken
          </NavLink>
        </div>
      </nav>
    </>
  );
}
