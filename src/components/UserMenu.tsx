import { useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { useOptionalAuth } from "@/context/AuthContext";
import { useOptionalRepository } from "@/context/RepositoryContext";
import { Button } from "@/components/ui/button";
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
      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:inline text-xs text-muted-foreground max-w-[10rem] truncate">
          {user.email ?? user.displayName}
        </span>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void requestSignOut()}>
          <LogOut className="w-4 h-4 mr-1" />
          Uitloggen
        </Button>
      </div>
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
