import { AppHeader } from "@/components/AppHeader";
import { DataManager } from "@/components/DataManager";
import { LocalDataTransfer } from "@/components/LocalDataTransfer";
import { useOptionalAuth } from "@/context/AuthContext";
import { useWorkoutLogs } from "@/hooks/useWorkoutLogs";
import { Database, ShieldCheck } from "lucide-react";

const Settings = () => {
  const auth = useOptionalAuth();
  const { workouts, storageInfo, importWorkouts } = useWorkoutLogs();

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="container max-w-2xl pt-6 pb-24 space-y-8">
        <h2 className="text-xl font-semibold text-foreground">Instellingen</h2>

        <section className="p-6 rounded-2xl gradient-card border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Je gegevens</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            {auth?.user
              ? "Je trainingen staan in je account en zijn op elk toestel beschikbaar waar je inlogt. Een back-up downloaden kan nog steeds."
              : "Je trainingen staan alleen in deze browser. Download ze regelmatig als back-up of om ze naar een ander toestel mee te nemen."}
          </p>
          {auth?.user && <LocalDataTransfer onImport={importWorkouts} disabled={storageInfo.readOnly} />}
          <DataManager workouts={workouts} onImport={importWorkouts} disabled={storageInfo.readOnly} />
        </section>

        <section className="p-6 rounded-2xl gradient-card border border-border">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Privacy</h3>
          </div>
          <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1.5">
            <li>Je trainingen en eigen oefeningen worden bewaard in jouw account bij Google Firebase.</li>
            <li>Alleen jij kunt ze zien. Andere gebruikers van de app hebben geen toegang tot jouw gegevens.</li>
            <li>We bewaren je e-mailadres of Google-naam enkel om je te kunnen inloggen.</li>
            <li>Je gegevens worden niet verkocht of voor reclame gebruikt.</li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default Settings;
