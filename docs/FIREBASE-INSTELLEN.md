# Firebase instellen (eenmalig, door de projecteigenaar)

Project: `fitnesscoach-e865f` · Site: https://fitnesscoachjones.vercel.app/

De code staat klaar, maar de app werkt pas met inloggen nadat je onderstaande stappen in de Firebase-console hebt gedaan.
Zolang de regels niet zijn gepubliceerd, weigert Firestore alle lees- en schrijfacties (veilige standaard).

## 1. Inloggen aanzetten
Firebase console → **Build → Authentication → Sign-in method**:
- **Google**: inschakelen, kies een support-e-mailadres, opslaan.
- **E-mail/wachtwoord**: inschakelen (de "e-maillink"-optie hoeft niet).

## 2. Je domein toestaan
Authentication → **Settings → Authorized domains** → voeg toe: `fitnesscoachjones.vercel.app`
(`localhost` staat er standaard al). Zonder dit geeft Google-login de melding "Dit adres is nog niet toegestaan".
Preview-deploys van Vercel (`…-git-<branch>-….vercel.app`) moet je los toevoegen als je daar wilt inloggen.

## 3. Database en regels
Build → **Firestore Database** → database aanmaken (productiemodus, regio `eur3` of `europe-west1`).
Daarna tabblad **Rules** → plak de inhoud van `firestore.rules` → **Publish**.

Test in de **Rules Playground** (die kan ik vanuit mijn omgeving niet uitvoeren):
- Lezen van `/users/ABC/workouts/x` ingelogd als `ABC` → toegestaan.
- Zelfde pad ingelogd als een andere uid, of niet ingelogd → geweigerd.
- Verwijderen (delete) → altijd geweigerd.

## 4. Controle op je telefoon
1. Open de site, registreer of log in met Google.
2. Log een workout, sluit de browser helemaal, open opnieuw → de workout staat er nog.
3. Log in op een tweede toestel/account: je ziet alleen je eigen workouts.
4. Vliegtuigmodus aan, workout opslaan, vliegtuigmodus uit → hij verschijnt op het andere toestel.
5. Staan er oude workouts in de browser? Onder "Gegevens" verschijnt "Kopieer naar mijn account" (alleen kopiëren, niets wordt verwijderd).

## 5. Optioneel: API-sleutel beperken
Google Cloud console → APIs & Services → Credentials → de Browser key van dit project → **Websites** beperken tot
`https://fitnesscoachjones.vercel.app/*` en `http://localhost:*`. De sleutel in de code is geen geheim; de regels beschermen de data.

## Bekende afwegingen
- De workout in uitvoering (concept) blijft bewust alleen op het toestel (werkt ook zonder bereik in de gym), per account gescheiden.
- Verwijderen is "zacht" (`deletedAt`); de regels staan geen definitief verwijderen toe.
- Na uitloggen blijft de offline cache van Firestore in de browser staan; op een gedeeld toestel kun je de site-gegevens wissen.
- `vercel.json` forceert `npm ci` omdat `bun.lockb` niet meer bij `package.json` past.
