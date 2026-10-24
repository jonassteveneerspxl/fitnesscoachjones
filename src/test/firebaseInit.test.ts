import { describe, it, expect } from "vitest";
import { getFirebaseDb, getFirebaseAuth } from "@/lib/firebase";

// Regressie: met twee kopieën van @firebase/app registreert Firestore zich bij de verkeerde en crasht de app
// direct na het inloggen ("Component firestore has not been registered yet").
describe("Firebase-initialisatie", () => {
  it("start Firestore en Auth zonder fout", () => {
    expect(() => getFirebaseDb()).not.toThrow();
    expect(() => getFirebaseAuth()).not.toThrow();
  });
});
