export interface WorkoutLog {
  id: string;
  userId: string;
  exercise: string;
  weight: number;
  reps: number;
  sets: number;
  date: string;
  notes?: string;
  volume: number;
  estimated1RM: number;
}

export interface CoachResponse {
  message: string;
  volume: number;
  estimated1RM: number;
  newPR: boolean;
}
