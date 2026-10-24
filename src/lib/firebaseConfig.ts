/**
 * Webconfiguratie van het Firebase-project.
 *
 * Dit zijn openbare identificatiegegevens, geen geheimen: ze staan sowieso in elke gebouwde webapp. De
 * toegang tot data wordt beveiligd door de Firestore-regels (`firestore.rules`) en door de lijst met
 * toegestane domeinen in Firebase Authentication, niet door deze waarden geheim te houden.
 *
 * Met `VITE_FIREBASE_*`-omgevingsvariabelen (bv. in Vercel) kan een ander project gebruikt worden, zonder
 * code te wijzigen. Zonder die variabelen wordt het project hieronder gebruikt.
 */
export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const env = import.meta.env;

export const firebaseConfig: FirebaseWebConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? "AIzaSyBlWgLknQBzkbbnH6X7Zlv-AqdmeK0yLLs",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? "fitnesscoach-e865f.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? "fitnesscoach-e865f",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? "fitnesscoach-e865f.firebasestorage.app",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "782395999427",
  appId: env.VITE_FIREBASE_APP_ID ?? "1:782395999427:web:5b55178676b46869158e76",
};
