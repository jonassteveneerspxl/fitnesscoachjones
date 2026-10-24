import { describe, it, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  auth: { name: "fake-auth" },
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class GoogleAuthProvider {},
  signInWithPopup: mocks.signInWithPopup,
  signInWithEmailAndPassword: mocks.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: mocks.createUserWithEmailAndPassword,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  signOut: mocks.signOut,
  onAuthStateChanged: mocks.onAuthStateChanged,
}));
vi.mock("@/lib/firebase", () => ({ getFirebaseAuth: () => mocks.auth }));

import { AuthError, createFirebaseAuthService, describeAuthError } from "@/lib/authService";

const firebaseError = (code: string) => Object.assign(new Error(code), { code });

beforeEach(() => {
  Object.values(mocks).forEach((m) => typeof m === "function" && "mockReset" in m && (m as ReturnType<typeof vi.fn>).mockReset());
});

describe("describeAuthError", () => {
  it("vertaalt bekende codes naar het Nederlands", () => {
    expect(describeAuthError("auth/weak-password")).toMatch(/minstens 6 tekens/);
    expect(describeAuthError("auth/email-already-in-use")).toMatch(/bestaat al een account/);
    expect(describeAuthError("auth/network-request-failed")).toMatch(/Geen verbinding/);
  });

  it("geeft voor een fout wachtwoord en een onbekend adres dezelfde melding (geen account-opsporing)", () => {
    const a = describeAuthError("auth/wrong-password");
    expect(describeAuthError("auth/user-not-found")).toBe(a);
    expect(describeAuthError("auth/invalid-credential")).toBe(a);
  });

  it("valt terug op een algemene melding bij een onbekende code", () => {
    expect(describeAuthError("auth/iets-nieuws")).toMatch(/Inloggen is mislukt/);
  });
});

describe("createFirebaseAuthService", () => {
  it("meldt de gebruiker als eenvoudig object en stopt met luisteren via de teruggegeven functie", () => {
    const stop = vi.fn();
    mocks.onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb({ uid: "u1", email: "a@b.be", displayName: "Jonas", extra: "negeer" });
      cb(null);
      return stop;
    });
    const seen: unknown[] = [];
    const unsub = createFirebaseAuthService().onAuthStateChanged((u) => seen.push(u));
    expect(seen).toEqual([{ uid: "u1", email: "a@b.be", displayName: "Jonas" }, null]);
    unsub();
    expect(stop).toHaveBeenCalled();
  });

  it("e-mail inloggen en account maken knippen spaties van het adres, maar niet van het wachtwoord", async () => {
    mocks.signInWithEmailAndPassword.mockResolvedValue({});
    mocks.createUserWithEmailAndPassword.mockResolvedValue({});
    const service = createFirebaseAuthService();
    await service.signInWithEmail("  a@b.be ", " geheim ");
    await service.signUpWithEmail(" c@d.be  ", "x y z");
    expect(mocks.signInWithEmailAndPassword).toHaveBeenCalledWith(mocks.auth, "a@b.be", " geheim ");
    expect(mocks.createUserWithEmailAndPassword).toHaveBeenCalledWith(mocks.auth, "c@d.be", "x y z");
  });

  it("wachtwoord vergeten en uitloggen gaan naar Firebase", async () => {
    mocks.sendPasswordResetEmail.mockResolvedValue(undefined);
    mocks.signOut.mockResolvedValue(undefined);
    const service = createFirebaseAuthService();
    await service.sendPasswordReset(" a@b.be ");
    await service.signOut();
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(mocks.auth, "a@b.be");
    expect(mocks.signOut).toHaveBeenCalledWith(mocks.auth);
  });

  it("Google-login opent een popup", async () => {
    mocks.signInWithPopup.mockResolvedValue({});
    await createFirebaseAuthService().signInWithGoogle();
    expect(mocks.signInWithPopup).toHaveBeenCalledTimes(1);
  });

  it("zet Firebase-fouten om naar een AuthError met Nederlandse tekst en behoudt de code", async () => {
    mocks.signInWithEmailAndPassword.mockRejectedValue(firebaseError("auth/invalid-credential"));
    const err = await createFirebaseAuthService().signInWithEmail("a@b.be", "fout").catch((e) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect(err.code).toBe("auth/invalid-credential");
    expect(err.message).toBe("E-mailadres of wachtwoord klopt niet.");
  });

  it("een onbekende of niet-Firebase fout wordt ook een nette AuthError", async () => {
    mocks.signInWithEmailAndPassword.mockRejectedValue("kapot");
    const err = await createFirebaseAuthService().signInWithEmail("a@b.be", "x").catch((e) => e);
    expect(err).toBeInstanceOf(AuthError);
    expect(err.code).toBe("unknown");
  });

  it("het sluiten van het Google-venster is geen fout", async () => {
    mocks.signInWithPopup.mockRejectedValueOnce(firebaseError("auth/popup-closed-by-user"));
    await expect(createFirebaseAuthService().signInWithGoogle()).resolves.toBeUndefined();
    mocks.signInWithPopup.mockRejectedValueOnce(firebaseError("auth/cancelled-popup-request"));
    await expect(createFirebaseAuthService().signInWithGoogle()).resolves.toBeUndefined();
  });

  it("een geblokkeerde popup is wel een fout met uitleg", async () => {
    mocks.signInWithPopup.mockRejectedValue(firebaseError("auth/popup-blocked"));
    const err = await createFirebaseAuthService().signInWithGoogle().catch((e) => e);
    expect(err.message).toMatch(/pop-ups toe/);
  });
});
