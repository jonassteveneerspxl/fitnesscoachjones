import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AuthGate } from "@/components/AuthGate";
import { UserMenu } from "@/components/UserMenu";
import { AuthError, type AuthService, type AuthUser } from "@/lib/authService";
import { useWorkoutLogs } from "@/hooks/useWorkoutLogs";
import { FakeBackend } from "./fakeBackend";
import { makeWorkout } from "./factories";

class FakeAuth implements AuthService {
  user: AuthUser | null = null;
  listener: ((u: AuthUser | null) => void) | null = null;
  emailCalls: string[][] = [];
  failWith: string | null = null;
  onAuthStateChanged(l: (u: AuthUser | null) => void) {
    this.listener = l;
    queueMicrotask(() => l(this.user));
    return () => { this.listener = null; };
  }
  private login(email: string) {
    this.user = { uid: "u1", email, displayName: null };
    this.listener?.(this.user);
  }
  async signInWithGoogle() { this.login("g@x.be"); }
  async signInWithEmail(e: string, p: string) {
    this.emailCalls.push([e, p]);
    if (this.failWith) throw new AuthError("auth/invalid-credential", this.failWith);
    this.login(e);
  }
  async signUpWithEmail(e: string, p: string) { this.emailCalls.push(["up", e, p]); this.login(e); }
  async sendPasswordReset() {}
  async signOut() { this.user = null; this.listener?.(null); }
}

function Probe() {
  const { workouts, isLoading } = useWorkoutLogs();
  return <div>{isLoading ? "laden" : `aantal:${workouts.length}`}<UserMenu /></div>;
}

function setup(auth: FakeAuth, backends: Record<string, FakeBackend>) {
  return render(
    <MemoryRouter>
      <AuthProvider service={auth}>
        <AuthGate createBackend={(uid) => (backends[uid] ??= new FakeBackend())}>
          <Probe />
        </AuthGate>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("inloggen en eigen gegevens", () => {
  beforeEach(() => localStorage.clear());

  it("toont de loginpagina als je niet bent ingelogd en de app na inloggen", async () => {
    const auth = new FakeAuth();
    const backends = { u1: new FakeBackend() };
    backends.u1.seed("w1", makeWorkout({ id: "w1" }) as never);
    setup(auth, backends);
    expect(await screen.findByRole("button", { name: /doorgaan met google/i })).toBeTruthy();
    fireEvent.change(screen.getByLabelText("E-mailadres"), { target: { value: "a@b.be" } });
    fireEvent.change(screen.getByLabelText("Wachtwoord"), { target: { value: "geheim12" } });
    fireEvent.click(screen.getByRole("button", { name: "Inloggen" }));
    expect(await screen.findByText("aantal:1")).toBeTruthy();
    expect(auth.emailCalls[0]).toEqual(["a@b.be", "geheim12"]);
  });

  it("toont een Nederlandse foutmelding bij verkeerde gegevens en blijft op de loginpagina", async () => {
    const auth = new FakeAuth();
    auth.failWith = "E-mailadres of wachtwoord klopt niet.";
    setup(auth, {});
    fireEvent.change(await screen.findByLabelText("E-mailadres"), { target: { value: "a@b.be" } });
    fireEvent.change(screen.getByLabelText("Wachtwoord"), { target: { value: "fout" } });
    fireEvent.click(screen.getByRole("button", { name: "Inloggen" }));
    expect((await screen.findByRole("alert")).textContent).toContain("klopt niet");
    expect(screen.queryByText(/aantal:/)).toBeNull();
  });

  it("uitloggen stopt de verbinding en toont weer de loginpagina", async () => {
    const auth = new FakeAuth();
    auth.user = { uid: "u1", email: "a@b.be", displayName: null };
    const backends = { u1: new FakeBackend() };
    setup(auth, backends);
    await screen.findByText("aantal:0");
    fireEvent.click(screen.getByRole("button", { name: /uitloggen/i }));
    expect(await screen.findByRole("button", { name: /doorgaan met google/i })).toBeTruthy();
    expect(backends.u1.stopped).toBeGreaterThan(0);
    expect(backends.u1.flushCalls.length).toBe(1);
  });

  it("vraagt bevestiging bij uitloggen als niet alles gesynchroniseerd is, en logt niet uit bij 'Blijven'", async () => {
    const auth = new FakeAuth();
    auth.user = { uid: "u1", email: "a@b.be", displayName: null };
    const backend = new FakeBackend();
    backend.flushResult = false;
    setup(auth, { u1: backend });
    await screen.findByText("aantal:0");
    fireEvent.click(screen.getByRole("button", { name: /uitloggen/i }));
    expect(await screen.findByText("Nog niet alles is opgeslagen")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Blijven" }));
    await waitFor(() => expect(screen.queryByText("Nog niet alles is opgeslagen")).toBeNull());
    expect(auth.user).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /uitloggen/i }));
    fireEvent.click(await screen.findByRole("button", { name: "Toch uitloggen" }));
    expect(await screen.findByRole("button", { name: /doorgaan met google/i })).toBeTruthy();
  });

  it("gebruikers zien alleen hun eigen workouts", async () => {
    const auth = new FakeAuth();
    auth.user = { uid: "u2", email: "b@b.be", displayName: null };
    const backends = { u1: new FakeBackend(), u2: new FakeBackend() };
    backends.u1.seed("w1", makeWorkout({ id: "w1" }) as never);
    setup(auth, backends);
    expect(await screen.findByText("aantal:0")).toBeTruthy();
  });
});
