import { FormEvent, useState } from "react";
import { Dumbbell } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Mode = "signIn" | "signUp";

const errorText = (e: unknown) => (e instanceof Error ? e.message : "Er ging iets mis. Probeer het opnieuw.");

export function LoginPage() {
  const { service } = useAuth();
  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await action();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void run(() => (mode === "signIn" ? service.signInWithEmail(email, password) : service.signUpWithEmail(email, password)));
  };

  const forgot = () => {
    if (!email.trim()) {
      setError("Vul eerst je e-mailadres in.");
      return;
    }
    void run(async () => {
      await service.sendPasswordReset(email);
      setInfo("Als er een account bestaat met dit adres, is er een e-mail gestuurd om je wachtwoord te herstellen.");
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm p-6 rounded-2xl gradient-card border border-border space-y-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl gradient-primary">
            <Dumbbell className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Fitness Coach</h1>
            <p className="text-sm text-muted-foreground">
              {mode === "signIn" ? "Log in om je workouts te zien" : "Maak een account aan"}
            </p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {info && (
          <Alert>
            <AlertDescription>{info}</AlertDescription>
          </Alert>
        )}

        <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void run(() => service.signInWithGoogle())}>
          Doorgaan met Google
        </Button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> of met e-mail <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">E-mailadres</Label>
            <Input id="login-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password">Wachtwoord</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete={mode === "signIn" ? "current-password" : "new-password"}
              required
              minLength={mode === "signUp" ? 6 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy}>
            {mode === "signIn" ? "Inloggen" : "Account aanmaken"}
          </Button>
        </form>

        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
          <Button type="button" variant="link" className="h-auto p-0" disabled={busy} onClick={() => { setMode(mode === "signIn" ? "signUp" : "signIn"); setError(null); setInfo(null); }}>
            {mode === "signIn" ? "Nog geen account? Registreren" : "Al een account? Inloggen"}
          </Button>
          {mode === "signIn" && (
            <Button type="button" variant="link" className="h-auto p-0" disabled={busy} onClick={forgot}>
              Wachtwoord vergeten
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
