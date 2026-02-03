export interface SetData {
  weight: number;
  reps: number;
}

export interface ExerciseLog {
  exercise: string;
  sets: SetData[];
  notes?: string;
  volume: number;
  estimated1RM: number;
}

export interface Workout {
  id: string;
  userId: string;
  date: string;
  exercises: ExerciseLog[];
  totalVolume: number;
}

// Legacy type for backward compatibility
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
  exercises: {
    exercise: string;
    volume: number;
    estimated1RM: number;
    newPR: boolean;
  }[];
  totalVolume: number;
}
