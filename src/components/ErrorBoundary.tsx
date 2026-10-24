import React from "react";
import { Button } from "@/components/ui/button";

interface State {
  error: Error | null;
}

/** Voorkomt een leeg scherm als er iets onverwachts misgaat: toont de fout en een knop om opnieuw te laden. */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Onverwachte fout in de app", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-sm w-full p-6 rounded-2xl border border-border space-y-3" role="alert">
          <h1 className="text-lg font-semibold text-foreground">Er ging iets mis</h1>
          <p className="text-sm text-muted-foreground">
            De app kon niet verder. Je opgeslagen workouts zijn niet verwijderd. Laad de pagina opnieuw; lukt dat niet,
            stuur dan onderstaande melding door.
          </p>
          <pre className="text-xs whitespace-pre-wrap break-words rounded bg-muted p-2 text-muted-foreground">
            {this.state.error.message}
          </pre>
          <Button type="button" className="w-full" onClick={() => window.location.reload()}>
            Opnieuw laden
          </Button>
        </div>
      </div>
    );
  }
}
