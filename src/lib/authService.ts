/**
 * Inloggen via Firebase Authentication, achter een kleine interface. De UI en de tests kennen alleen
 * `AuthService`; alleen `createFirebaseAuthService` weet van Firebase.
 */
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface AuthService {
  /** Meldt de huidige gebruiker (of `null`) en elke wijziging daarna. Geeft een functie om te stoppen. */
  onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  signInWithEmail(email: string, password: string): Promise<void>;
  signUpWithEmail(email: string, password: string): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  signOut(): Promise<void>;
}

/** Fout met een Nederlandse melding die direct aan de gebruiker getoond kan worden. */
export class AuthError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

const MESSAGES: Record<string, string> = {
  "auth/invalid-email": "Dit e-mailadres is niet geldig.",
  "auth/missing-email": "Vul je e-mailadres in.",
  "auth/missing-password": "Vul je wachtwoord in.",
  "auth/user-disabled": "Dit account is uitgeschakeld.",
  // Firebase geeft bij een fout wachtwoord én bij een onbekend adres dezelfde code (om te voorkomen dat je
  // kunt achterhalen welke adressen een account hebben). Daarom één melding voor beide.
  "auth/invalid-credential": "E-mailadres of wachtwoord klopt niet.",
  "auth/wrong-password": "E-mailadres of wachtwoord klopt niet.",
  "auth/user-not-found": "E-mailadres of wachtwoord klopt niet.",
  "auth/invalid-login-credentials": "E-mailadres of wachtwoord klopt niet.",
  "auth/email-already-in-use": "Er bestaat al een account met dit e-mailadres. Log in, of kies 'Wachtwoord vergeten'.",
  "auth/weak-password": "Kies een sterker wachtwoord (minstens 6 tekens).",
  "auth/too-many-requests": "Te veel pogingen. Wacht even en probeer het later opnieuw.",
  "auth/network-request-failed": "Geen verbinding. Controleer je internet en probeer opnieuw.",
  "auth/popup-blocked": "Je browser blokkeerde het inlogvenster. Sta pop-ups toe voor deze site en probeer opnieuw.",
  "auth/account-exists-with-different-credential":
    "Er bestaat al een account met dit e-mailadres via een andere inlogmethode.",
  "auth/operation-not-allowed": "Deze inlogmethode staat nog niet aan in Firebase.",
  "auth/unauthorized-domain":
    "Dit adres is nog niet toegestaan voor inloggen. Voeg het toe bij 'Authorized domains' in Firebase Authentication.",
};

export function describeAuthError(code: string): string {
  return MESSAGES[code] ?? "Inloggen is mislukt. Probeer het opnieuw.";
}

/** Het sluiten van het Google-venster door de gebruiker is geen fout. */
const SILENT_CODES = new Set(["auth/popup-closed-by-user", "auth/cancelled-popup-request"]);

function codeOf(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error && typeof (error as { code: unknown }).code === "string") {
    return (error as { code: string }).code;
  }
  return "unknown";
}

async function wrap(action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (error) {
    const code = codeOf(error);
    if (SILENT_CODES.has(code)) return;
    throw new AuthError(code, describeAuthError(code));
  }
}

export function createFirebaseAuthService(): AuthService {
  return {
    onAuthStateChanged(listener) {
      return onAuthStateChanged(getFirebaseAuth(), (user) =>
        listener(user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null)
      );
    },
    signInWithGoogle: () =>
      wrap(() => signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider())),
    signInWithEmail: (email, password) =>
      wrap(() => signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password)),
    signUpWithEmail: (email, password) =>
      wrap(() => createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password)),
    sendPasswordReset: (email) => wrap(() => sendPasswordResetEmail(getFirebaseAuth(), email.trim())),
    signOut: () => wrap(() => firebaseSignOut(getFirebaseAuth())),
  };
}
