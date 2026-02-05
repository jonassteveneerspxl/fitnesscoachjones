export type MuscleGroup = 
  | "chest" 
  | "back" 
  | "shoulders" 
  | "biceps" 
  | "triceps" 
  | "forearms"
  | "quadriceps" 
  | "hamstrings" 
  | "glutes" 
  | "calves" 
  | "core";

export type PPLCategory = "push" | "pull" | "legs";

export interface Exercise {
  name: string;
  muscleGroup: MuscleGroup;
  pplCategory: PPLCategory;
  equipment?: string;
}

export const muscleGroupLabels: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  forearms: "Forearms",
  quadriceps: "Quadriceps",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
};

export const pplLabels: Record<PPLCategory, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
};

export const exercises: Exercise[] = [
  // === CHEST (Push) ===
  { name: "Bench Press", muscleGroup: "chest", pplCategory: "push", equipment: "Barbell" },
  { name: "Incline Bench Press", muscleGroup: "chest", pplCategory: "push", equipment: "Barbell" },
  { name: "Decline Bench Press", muscleGroup: "chest", pplCategory: "push", equipment: "Barbell" },
  { name: "Dumbbell Bench Press", muscleGroup: "chest", pplCategory: "push", equipment: "Dumbbells" },
  { name: "Incline Dumbbell Press", muscleGroup: "chest", pplCategory: "push", equipment: "Dumbbells" },
  { name: "Decline Dumbbell Press", muscleGroup: "chest", pplCategory: "push", equipment: "Dumbbells" },
  { name: "Dumbbell Flyes", muscleGroup: "chest", pplCategory: "push", equipment: "Dumbbells" },
  { name: "Incline Dumbbell Flyes", muscleGroup: "chest", pplCategory: "push", equipment: "Dumbbells" },
  { name: "Cable Flyes", muscleGroup: "chest", pplCategory: "push", equipment: "Cable" },
  { name: "Low Cable Flyes", muscleGroup: "chest", pplCategory: "push", equipment: "Cable" },
  { name: "High Cable Flyes", muscleGroup: "chest", pplCategory: "push", equipment: "Cable" },
  { name: "Chest Press Machine", muscleGroup: "chest", pplCategory: "push", equipment: "Machine" },
  { name: "Pec Deck", muscleGroup: "chest", pplCategory: "push", equipment: "Machine" },
  { name: "Push-Ups", muscleGroup: "chest", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Incline Push-Ups", muscleGroup: "chest", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Decline Push-Ups", muscleGroup: "chest", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Diamond Push-Ups", muscleGroup: "chest", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Dips (Chest)", muscleGroup: "chest", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Landmine Press", muscleGroup: "chest", pplCategory: "push", equipment: "Barbell" },
  { name: "Svend Press", muscleGroup: "chest", pplCategory: "push", equipment: "Plate" },

  // === SHOULDERS (Push) ===
  { name: "Overhead Press", muscleGroup: "shoulders", pplCategory: "push", equipment: "Barbell" },
  { name: "Seated Overhead Press", muscleGroup: "shoulders", pplCategory: "push", equipment: "Barbell" },
  { name: "Dumbbell Shoulder Press", muscleGroup: "shoulders", pplCategory: "push", equipment: "Dumbbells" },
  { name: "Arnold Press", muscleGroup: "shoulders", pplCategory: "push", equipment: "Dumbbells" },
  { name: "Lateral Raises", muscleGroup: "shoulders", pplCategory: "push", equipment: "Dumbbells" },
  { name: "Cable Lateral Raises", muscleGroup: "shoulders", pplCategory: "push", equipment: "Cable" },
  { name: "Front Raises", muscleGroup: "shoulders", pplCategory: "push", equipment: "Dumbbells" },
  { name: "Cable Front Raises", muscleGroup: "shoulders", pplCategory: "push", equipment: "Cable" },
  { name: "Rear Delt Flyes", muscleGroup: "shoulders", pplCategory: "pull", equipment: "Dumbbells" },
  { name: "Reverse Pec Deck", muscleGroup: "shoulders", pplCategory: "pull", equipment: "Machine" },
  { name: "Face Pulls", muscleGroup: "shoulders", pplCategory: "pull", equipment: "Cable" },
  { name: "Upright Rows", muscleGroup: "shoulders", pplCategory: "push", equipment: "Barbell" },
  { name: "Dumbbell Upright Rows", muscleGroup: "shoulders", pplCategory: "push", equipment: "Dumbbells" },
  { name: "Shrugs", muscleGroup: "shoulders", pplCategory: "pull", equipment: "Dumbbells" },
  { name: "Barbell Shrugs", muscleGroup: "shoulders", pplCategory: "pull", equipment: "Barbell" },
  { name: "Behind Neck Press", muscleGroup: "shoulders", pplCategory: "push", equipment: "Barbell" },
  { name: "Machine Shoulder Press", muscleGroup: "shoulders", pplCategory: "push", equipment: "Machine" },
  { name: "Landmine Lateral Raises", muscleGroup: "shoulders", pplCategory: "push", equipment: "Barbell" },
  { name: "Lu Raises", muscleGroup: "shoulders", pplCategory: "push", equipment: "Dumbbells" },
  { name: "Y Raises", muscleGroup: "shoulders", pplCategory: "push", equipment: "Dumbbells" },

  // === TRICEPS (Push) ===
  { name: "Tricep Pushdowns", muscleGroup: "triceps", pplCategory: "push", equipment: "Cable" },
  { name: "Rope Pushdowns", muscleGroup: "triceps", pplCategory: "push", equipment: "Cable" },
  { name: "Overhead Tricep Extension", muscleGroup: "triceps", pplCategory: "push", equipment: "Cable" },
  { name: "Skull Crushers", muscleGroup: "triceps", pplCategory: "push", equipment: "Barbell" },
  { name: "Dumbbell Skull Crushers", muscleGroup: "triceps", pplCategory: "push", equipment: "Dumbbells" },
  { name: "Close Grip Bench Press", muscleGroup: "triceps", pplCategory: "push", equipment: "Barbell" },
  { name: "Tricep Dips", muscleGroup: "triceps", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Bench Dips", muscleGroup: "triceps", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Tricep Kickbacks", muscleGroup: "triceps", pplCategory: "push", equipment: "Dumbbells" },
  { name: "Diamond Push-Ups", muscleGroup: "triceps", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Overhead Dumbbell Extension", muscleGroup: "triceps", pplCategory: "push", equipment: "Dumbbells" },
  { name: "Single Arm Pushdown", muscleGroup: "triceps", pplCategory: "push", equipment: "Cable" },
  { name: "JM Press", muscleGroup: "triceps", pplCategory: "push", equipment: "Barbell" },
  { name: "Tate Press", muscleGroup: "triceps", pplCategory: "push", equipment: "Dumbbells" },

  // === BACK (Pull) ===
  { name: "Deadlift", muscleGroup: "back", pplCategory: "pull", equipment: "Barbell" },
  { name: "Sumo Deadlift", muscleGroup: "back", pplCategory: "pull", equipment: "Barbell" },
  { name: "Romanian Deadlift", muscleGroup: "back", pplCategory: "pull", equipment: "Barbell" },
  { name: "Barbell Row", muscleGroup: "back", pplCategory: "pull", equipment: "Barbell" },
  { name: "Pendlay Row", muscleGroup: "back", pplCategory: "pull", equipment: "Barbell" },
  { name: "Dumbbell Row", muscleGroup: "back", pplCategory: "pull", equipment: "Dumbbells" },
  { name: "Chest Supported Row", muscleGroup: "back", pplCategory: "pull", equipment: "Dumbbells" },
  { name: "T-Bar Row", muscleGroup: "back", pplCategory: "pull", equipment: "Machine" },
  { name: "Seated Cable Row", muscleGroup: "back", pplCategory: "pull", equipment: "Cable" },
  { name: "Lat Pulldown", muscleGroup: "back", pplCategory: "pull", equipment: "Cable" },
  { name: "Close Grip Lat Pulldown", muscleGroup: "back", pplCategory: "pull", equipment: "Cable" },
  { name: "Wide Grip Lat Pulldown", muscleGroup: "back", pplCategory: "pull", equipment: "Cable" },
  { name: "Pull-Ups", muscleGroup: "back", pplCategory: "pull", equipment: "Bodyweight" },
  { name: "Chin-Ups", muscleGroup: "back", pplCategory: "pull", equipment: "Bodyweight" },
  { name: "Wide Grip Pull-Ups", muscleGroup: "back", pplCategory: "pull", equipment: "Bodyweight" },
  { name: "Neutral Grip Pull-Ups", muscleGroup: "back", pplCategory: "pull", equipment: "Bodyweight" },
  { name: "Inverted Rows", muscleGroup: "back", pplCategory: "pull", equipment: "Bodyweight" },
  { name: "Cable Pullover", muscleGroup: "back", pplCategory: "pull", equipment: "Cable" },
  { name: "Dumbbell Pullover", muscleGroup: "back", pplCategory: "pull", equipment: "Dumbbells" },
  { name: "Rack Pulls", muscleGroup: "back", pplCategory: "pull", equipment: "Barbell" },
  { name: "Meadows Row", muscleGroup: "back", pplCategory: "pull", equipment: "Barbell" },
  { name: "Seal Row", muscleGroup: "back", pplCategory: "pull", equipment: "Barbell" },
  { name: "Machine Row", muscleGroup: "back", pplCategory: "pull", equipment: "Machine" },
  { name: "Hyperextensions", muscleGroup: "back", pplCategory: "pull", equipment: "Bodyweight" },
  { name: "Reverse Hyperextensions", muscleGroup: "back", pplCategory: "pull", equipment: "Machine" },
  { name: "Good Mornings", muscleGroup: "back", pplCategory: "pull", equipment: "Barbell" },
  { name: "Straight Arm Pulldown", muscleGroup: "back", pplCategory: "pull", equipment: "Cable" },

  // === BICEPS (Pull) ===
  { name: "Barbell Curl", muscleGroup: "biceps", pplCategory: "pull", equipment: "Barbell" },
  { name: "EZ Bar Curl", muscleGroup: "biceps", pplCategory: "pull", equipment: "Barbell" },
  { name: "Dumbbell Curl", muscleGroup: "biceps", pplCategory: "pull", equipment: "Dumbbells" },
  { name: "Hammer Curls", muscleGroup: "biceps", pplCategory: "pull", equipment: "Dumbbells" },
  { name: "Incline Dumbbell Curl", muscleGroup: "biceps", pplCategory: "pull", equipment: "Dumbbells" },
  { name: "Preacher Curl", muscleGroup: "biceps", pplCategory: "pull", equipment: "Barbell" },
  { name: "Dumbbell Preacher Curl", muscleGroup: "biceps", pplCategory: "pull", equipment: "Dumbbells" },
  { name: "Concentration Curl", muscleGroup: "biceps", pplCategory: "pull", equipment: "Dumbbells" },
  { name: "Cable Curl", muscleGroup: "biceps", pplCategory: "pull", equipment: "Cable" },
  { name: "Rope Hammer Curl", muscleGroup: "biceps", pplCategory: "pull", equipment: "Cable" },
  { name: "Spider Curls", muscleGroup: "biceps", pplCategory: "pull", equipment: "Dumbbells" },
  { name: "Zottman Curls", muscleGroup: "biceps", pplCategory: "pull", equipment: "Dumbbells" },
  { name: "Drag Curls", muscleGroup: "biceps", pplCategory: "pull", equipment: "Barbell" },
  { name: "21s", muscleGroup: "biceps", pplCategory: "pull", equipment: "Barbell" },
  { name: "Machine Curl", muscleGroup: "biceps", pplCategory: "pull", equipment: "Machine" },
  { name: "Cross Body Hammer Curl", muscleGroup: "biceps", pplCategory: "pull", equipment: "Dumbbells" },

  // === FOREARMS (Pull) ===
  { name: "Wrist Curls", muscleGroup: "forearms", pplCategory: "pull", equipment: "Barbell" },
  { name: "Reverse Wrist Curls", muscleGroup: "forearms", pplCategory: "pull", equipment: "Barbell" },
  { name: "Reverse Curls", muscleGroup: "forearms", pplCategory: "pull", equipment: "Barbell" },
  { name: "Farmer's Walk", muscleGroup: "forearms", pplCategory: "pull", equipment: "Dumbbells" },
  { name: "Dead Hang", muscleGroup: "forearms", pplCategory: "pull", equipment: "Bodyweight" },
  { name: "Plate Pinch", muscleGroup: "forearms", pplCategory: "pull", equipment: "Plate" },
  { name: "Behind Back Wrist Curl", muscleGroup: "forearms", pplCategory: "pull", equipment: "Barbell" },

  // === QUADRICEPS (Legs) ===
  { name: "Squat", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Barbell" },
  { name: "Front Squat", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Barbell" },
  { name: "Goblet Squat", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Dumbbells" },
  { name: "Hack Squat", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Machine" },
  { name: "Leg Press", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Machine" },
  { name: "Leg Extension", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Machine" },
  { name: "Walking Lunges", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Dumbbells" },
  { name: "Reverse Lunges", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Dumbbells" },
  { name: "Bulgarian Split Squat", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Dumbbells" },
  { name: "Step-Ups", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Dumbbells" },
  { name: "Sissy Squat", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Bodyweight" },
  { name: "Box Squat", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Barbell" },
  { name: "Pause Squat", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Barbell" },
  { name: "Safety Bar Squat", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Barbell" },
  { name: "Smith Machine Squat", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Machine" },
  { name: "Pendulum Squat", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Machine" },
  { name: "Belt Squat", muscleGroup: "quadriceps", pplCategory: "legs", equipment: "Machine" },

  // === HAMSTRINGS (Legs) ===
  { name: "Romanian Deadlift", muscleGroup: "hamstrings", pplCategory: "legs", equipment: "Barbell" },
  { name: "Stiff Leg Deadlift", muscleGroup: "hamstrings", pplCategory: "legs", equipment: "Barbell" },
  { name: "Dumbbell RDL", muscleGroup: "hamstrings", pplCategory: "legs", equipment: "Dumbbells" },
  { name: "Single Leg RDL", muscleGroup: "hamstrings", pplCategory: "legs", equipment: "Dumbbells" },
  { name: "Lying Leg Curl", muscleGroup: "hamstrings", pplCategory: "legs", equipment: "Machine" },
  { name: "Seated Leg Curl", muscleGroup: "hamstrings", pplCategory: "legs", equipment: "Machine" },
  { name: "Nordic Curl", muscleGroup: "hamstrings", pplCategory: "legs", equipment: "Bodyweight" },
  { name: "Good Mornings", muscleGroup: "hamstrings", pplCategory: "legs", equipment: "Barbell" },
  { name: "Glute Ham Raise", muscleGroup: "hamstrings", pplCategory: "legs", equipment: "Machine" },
  { name: "Cable Pull-Through", muscleGroup: "hamstrings", pplCategory: "legs", equipment: "Cable" },
  { name: "Kettlebell Swing", muscleGroup: "hamstrings", pplCategory: "legs", equipment: "Kettlebell" },

  // === GLUTES (Legs) ===
  { name: "Hip Thrust", muscleGroup: "glutes", pplCategory: "legs", equipment: "Barbell" },
  { name: "Single Leg Hip Thrust", muscleGroup: "glutes", pplCategory: "legs", equipment: "Bodyweight" },
  { name: "Glute Bridge", muscleGroup: "glutes", pplCategory: "legs", equipment: "Bodyweight" },
  { name: "Cable Kickbacks", muscleGroup: "glutes", pplCategory: "legs", equipment: "Cable" },
  { name: "Donkey Kicks", muscleGroup: "glutes", pplCategory: "legs", equipment: "Bodyweight" },
  { name: "Fire Hydrants", muscleGroup: "glutes", pplCategory: "legs", equipment: "Bodyweight" },
  { name: "Hip Abduction Machine", muscleGroup: "glutes", pplCategory: "legs", equipment: "Machine" },
  { name: "Banded Walks", muscleGroup: "glutes", pplCategory: "legs", equipment: "Band" },
  { name: "Sumo Squat", muscleGroup: "glutes", pplCategory: "legs", equipment: "Dumbbells" },
  { name: "Frog Pumps", muscleGroup: "glutes", pplCategory: "legs", equipment: "Bodyweight" },
  { name: "Cable Pull-Through", muscleGroup: "glutes", pplCategory: "legs", equipment: "Cable" },

  // === CALVES (Legs) ===
  { name: "Standing Calf Raise", muscleGroup: "calves", pplCategory: "legs", equipment: "Machine" },
  { name: "Seated Calf Raise", muscleGroup: "calves", pplCategory: "legs", equipment: "Machine" },
  { name: "Leg Press Calf Raise", muscleGroup: "calves", pplCategory: "legs", equipment: "Machine" },
  { name: "Donkey Calf Raise", muscleGroup: "calves", pplCategory: "legs", equipment: "Machine" },
  { name: "Single Leg Calf Raise", muscleGroup: "calves", pplCategory: "legs", equipment: "Bodyweight" },
  { name: "Smith Machine Calf Raise", muscleGroup: "calves", pplCategory: "legs", equipment: "Machine" },
  { name: "Jump Rope", muscleGroup: "calves", pplCategory: "legs", equipment: "Bodyweight" },

  // === CORE ===
  { name: "Plank", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Side Plank", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Crunches", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Sit-Ups", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Leg Raises", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Hanging Leg Raises", muscleGroup: "core", pplCategory: "pull", equipment: "Bodyweight" },
  { name: "Hanging Knee Raises", muscleGroup: "core", pplCategory: "pull", equipment: "Bodyweight" },
  { name: "Ab Wheel Rollout", muscleGroup: "core", pplCategory: "push", equipment: "Ab Wheel" },
  { name: "Cable Crunches", muscleGroup: "core", pplCategory: "push", equipment: "Cable" },
  { name: "Russian Twists", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Bicycle Crunches", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Mountain Climbers", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Dead Bug", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Bird Dog", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Pallof Press", muscleGroup: "core", pplCategory: "push", equipment: "Cable" },
  { name: "Woodchops", muscleGroup: "core", pplCategory: "push", equipment: "Cable" },
  { name: "Decline Sit-Ups", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "V-Ups", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Toe Touches", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Flutter Kicks", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Hollow Body Hold", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "L-Sit", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
  { name: "Dragon Flag", muscleGroup: "core", pplCategory: "push", equipment: "Bodyweight" },
];

// Helper functions
export function getExercisesByMuscleGroup(muscleGroup: MuscleGroup): Exercise[] {
  return exercises.filter((e) => e.muscleGroup === muscleGroup);
}

export function getExercisesByPPL(category: PPLCategory): Exercise[] {
  return exercises.filter((e) => e.pplCategory === category);
}

export function searchExercises(query: string): Exercise[] {
  const lowerQuery = query.toLowerCase();
  return exercises.filter(
    (e) =>
      e.name.toLowerCase().includes(lowerQuery) ||
      e.muscleGroup.toLowerCase().includes(lowerQuery) ||
      e.equipment?.toLowerCase().includes(lowerQuery)
  );
}

export function getUniqueExerciseNames(): string[] {
  return [...new Set(exercises.map((e) => e.name))];
}
