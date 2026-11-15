import { useState } from "react";
import { LogOut, Settings, User } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useOptionalAuth } from "@/context/AuthContext";
import { useOptionalRepository } from "@/context/RepositoryContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function UserMenu() {
  const auth = useOptionalAuth();
  const repository = useOptionalRepository();
  const [busy, setBusy] = useState(false);
  const [confirmUnsynced, setConfirmUnsynced] = useState(false);

  if (!auth?.user) return null;
  const { service, user } = auth;

  const doSignOut = async () => {
    setBusy(true);
    try {
      await service.signOut();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Uitloggen mislukt.");
    } finally {
      setBusy(false);
    }
  };

  // Wijzigingen die nog niet door de server bevestigd zijn, worden na uitloggen geweigerd. Eerst even wachten.
  const requestSignOut = async () => {
    setBusy(true);
    const synced = repository ? await repository.flushPending(5000) : true;
    setBusy(false);
    if (synced) await doSignOut();
    else setConfirmUnsynced(true);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" aria-label="Account" disabled={busy}>
            <User className="w-5 h-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          <DropdownMenuLabel className="font-normal text-xs text-muted-foreground truncate max-w-[14rem]">
            {user.email ?? user.displayName}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/instellingen">
              <Settings className="w-4 h-4 mr-2" />
              Instellingen
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => void requestSignOut()}>
            <LogOut className="w-4 h-4 mr-2" />
            Uitloggen
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmUnsynced} onOpenChange={setConfirmUnsynced}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nog niet alles is opgeslagen</AlertDialogTitle>
            <AlertDialogDescription>
              Sommige recente wijzigingen zijn nog niet bevestigd door de server, bijvoorbeeld omdat je geen
              verbinding hebt. Als je nu uitlogt kunnen die verloren gaan. Wacht tot je weer online bent, of log toch uit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Blijven</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doSignOut()}>Toch uitloggen</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
