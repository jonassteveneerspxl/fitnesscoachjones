import { CoachResponse } from "@/types/workout";
import { Trophy, TrendingUp, Flame, Zap } from "lucide-react";

interface CoachFeedbackProps {
  response: CoachResponse | null;
}

export function CoachFeedback({ response }: CoachFeedbackProps) {
  if (!response) return null;

  return (
    <div
      className={`rounded-xl p-6 ${
        response.newPR
          ? "gradient-primary glow-primary animate-celebrate"
          : "gradient-card border border-border"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-full ${
            response.newPR ? "bg-white/20" : "bg-primary/20"
          }`}
        >
          {response.newPR ? (
            <Trophy className="w-6 h-6 text-white" />
          ) : (
            <Flame className="w-6 h-6 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <p
            className={`text-lg font-semibold mb-4 ${
              response.newPR ? "text-white" : "text-foreground"
            }`}
          >
            {response.message}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div
              className={`p-4 rounded-lg ${
                response.newPR ? "bg-white/10" : "bg-muted"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp
                  className={`w-4 h-4 ${
                    response.newPR ? "text-white/70" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-xs uppercase tracking-wide ${
                    response.newPR ? "text-white/70" : "text-muted-foreground"
                  }`}
                >
                  Volume
                </span>
              </div>
              <p
                className={`text-2xl font-bold ${
                  response.newPR ? "text-white" : "text-foreground"
                }`}
              >
                {response.volume.toLocaleString()} kg
              </p>
            </div>

            <div
              className={`p-4 rounded-lg ${
                response.newPR ? "bg-white/10" : "bg-muted"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap
                  className={`w-4 h-4 ${
                    response.newPR ? "text-white/70" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-xs uppercase tracking-wide ${
                    response.newPR ? "text-white/70" : "text-muted-foreground"
                  }`}
                >
                  Est. 1RM
                </span>
              </div>
              <p
                className={`text-2xl font-bold ${
                  response.newPR ? "text-white" : "text-foreground"
                }`}
              >
                {response.estimated1RM} kg
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
