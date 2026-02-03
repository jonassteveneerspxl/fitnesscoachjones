import { CoachResponse } from "@/types/workout";
import { Trophy, TrendingUp, Flame, Zap } from "lucide-react";

interface CoachFeedbackProps {
  response: CoachResponse | null;
}

export function CoachFeedback({ response }: CoachFeedbackProps) {
  if (!response) return null;

  const hasPR = response.exercises.some((e) => e.newPR);
  const prExercises = response.exercises.filter((e) => e.newPR);

  return (
    <div
      className={`rounded-xl p-6 ${
        hasPR
          ? "gradient-primary glow-primary animate-celebrate"
          : "gradient-card border border-border"
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-3 rounded-full ${
            hasPR ? "bg-white/20" : "bg-primary/20"
          }`}
        >
          {hasPR ? (
            <Trophy className="w-6 h-6 text-white" />
          ) : (
            <Flame className="w-6 h-6 text-primary" />
          )}
        </div>
        <div className="flex-1">
          <p
            className={`text-lg font-semibold mb-4 ${
              hasPR ? "text-white" : "text-foreground"
            }`}
          >
            {response.message}
          </p>

          {/* PR Badges */}
          {prExercises.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {prExercises.map((ex, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full bg-white/20 text-white text-sm font-medium"
                >
                  🏆 {ex.exercise}: {ex.estimated1RM}kg
                </span>
              ))}
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div
              className={`p-4 rounded-lg ${hasPR ? "bg-white/10" : "bg-muted"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp
                  className={`w-4 h-4 ${
                    hasPR ? "text-white/70" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-xs uppercase tracking-wide ${
                    hasPR ? "text-white/70" : "text-muted-foreground"
                  }`}
                >
                  Totaal Volume
                </span>
              </div>
              <p
                className={`text-2xl font-bold ${
                  hasPR ? "text-white" : "text-foreground"
                }`}
              >
                {response.totalVolume.toLocaleString()} kg
              </p>
            </div>

            <div
              className={`p-4 rounded-lg ${hasPR ? "bg-white/10" : "bg-muted"}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Zap
                  className={`w-4 h-4 ${
                    hasPR ? "text-white/70" : "text-muted-foreground"
                  }`}
                />
                <span
                  className={`text-xs uppercase tracking-wide ${
                    hasPR ? "text-white/70" : "text-muted-foreground"
                  }`}
                >
                  Oefeningen
                </span>
              </div>
              <p
                className={`text-2xl font-bold ${
                  hasPR ? "text-white" : "text-foreground"
                }`}
              >
                {response.exercises.length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
