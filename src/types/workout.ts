export interface SetData {
  weight: number;
  reps: number;
}

export interface WorkoutLog {
  id: string;
  userId: string;
  exercise: string;
  sets: SetData[];
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
