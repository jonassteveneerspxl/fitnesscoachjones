/**
 * Lazy initialisatie van Firebase. Er wordt pas iets opgestart als een onderdeel het echt nodig heeft, zodat
 * tests en pagina's zonder Firebase niets initialiseren.
 */
import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import {
  Firestore,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { firebaseConfig } from "@/lib/firebaseConfig";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!app) app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!auth) auth = getAuth(getFirebaseApp());
  return auth;
}

/**
 * Firestore met een lokale cache in de browser (IndexedDB): wijzigingen worden eerst lokaal toegepast en
 * synchroniseren zodra er weer bereik is. Dat is wat een training in een sportzaal zonder bereik laat werken.
 * Is IndexedDB niet beschikbaar (bv. sommige privévensters), dan valt het terug op een geheugencache.
 */
export function getFirebaseDb(): Firestore {
  if (db) return db;
  const firebaseApp = getFirebaseApp();
  try {
    db = initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      ignoreUndefinedProperties: true,
    });
  } catch {
    try {
      db = initializeFirestore(firebaseApp, {
        localCache: memoryLocalCache(),
        ignoreUndefinedProperties: true,
      });
    } catch {
      // Al eerder geïnitialiseerd (bv. door hot reload): hergebruik die instantie.
      db = getFirestore(firebaseApp);
    }
  }
  return db;
}
