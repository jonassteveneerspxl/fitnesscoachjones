import { useState } from "react";
import { WorkoutForm } from "@/components/WorkoutForm";
import { CoachFeedback } from "@/components/CoachFeedback";
import { WorkoutHistory } from "@/components/WorkoutHistory";
import { useWorkoutLogs } from "@/hooks/useWorkoutLogs";
import { generateCoachResponse, calculateVolumeFromSets, getBest1RMFromSets } from "@/utils/fitnessCalculations";
import { CoachResponse, WorkoutLog, SetData } from "@/types/workout";
import { Dumbbell, History, Sparkles } from "lucide-react";

const Index = () => {
  const { logs, addLog, getRecentLogs } = useWorkoutLogs();
  const [coachResponse, setCoachResponse] = useState<CoachResponse | null>(null);

  const handleWorkoutSubmit = (data: {
    exercise: string;
    sets: SetData[];
    notes?: string;
  }) => {
    const response = generateCoachResponse(data.exercise, data.sets, logs);

    setCoachResponse(response);

    const newLog: WorkoutLog = {
      id: crypto.randomUUID(),
      userId: "user-1",
      exercise: data.exercise,
      sets: data.sets,
      date: new Date().toISOString(),
      notes: data.notes,
      volume: response.volume,
      estimated1RM: response.estimated1RM,
    };

    addLog(newLog);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-2xl py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl gradient-primary">
              <Dumbbell className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Fitness Coach</h1>
              <p className="text-sm text-muted-foreground">Track je gains, breek records</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-2xl py-6 space-y-8">
        {/* Workout Form Card */}
        <section className="p-6 rounded-2xl gradient-card border border-border">
          <div className="flex items-center gap-2 mb-6">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Log Workout</h2>
          </div>
          <WorkoutForm onSubmit={handleWorkoutSubmit} />
        </section>

        {/* Coach Feedback */}
        {coachResponse && <CoachFeedback response={coachResponse} />}

        {/* Workout History */}
        <section className="p-6 rounded-2xl gradient-card border border-border">
          <div className="flex items-center gap-2 mb-6">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Recente Workouts</h2>
          </div>
          <WorkoutHistory logs={getRecentLogs(5)} />
        </section>
      </main>
    </div>
  );
};

export default Index;
