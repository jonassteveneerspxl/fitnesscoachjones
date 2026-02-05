export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  category: "Push" | "Pull" | "Legs" | "Upper" | "Lower" | "Full Body" | "Custom";
  exercises: {
    exercise: string;
    suggestedSets: number;
  }[];
}

export const workoutTemplates: WorkoutTemplate[] = [
  // Push Day Templates
  {
    id: "push-beginner",
    name: "Push Day - Beginner",
    description: "Basis push workout voor beginners",
    category: "Push",
    exercises: [
      { exercise: "Bench Press", suggestedSets: 3 },
      { exercise: "Incline Dumbbell Press", suggestedSets: 3 },
      { exercise: "Overhead Press", suggestedSets: 3 },
      { exercise: "Tricep Pushdown", suggestedSets: 3 },
      { exercise: "Lateral Raise", suggestedSets: 3 },
    ],
  },
  {
    id: "push-advanced",
    name: "Push Day - Advanced",
    description: "Intensieve push workout met meer volume",
    category: "Push",
    exercises: [
      { exercise: "Bench Press", suggestedSets: 4 },
      { exercise: "Incline Bench Press", suggestedSets: 4 },
      { exercise: "Overhead Press", suggestedSets: 4 },
      { exercise: "Dumbbell Flyes", suggestedSets: 3 },
      { exercise: "Tricep Dips", suggestedSets: 3 },
      { exercise: "Skull Crushers", suggestedSets: 3 },
      { exercise: "Lateral Raise", suggestedSets: 4 },
      { exercise: "Front Raise", suggestedSets: 3 },
    ],
  },
  {
    id: "chest-focus",
    name: "Chest Focus",
    description: "Complete borst workout",
    category: "Push",
    exercises: [
      { exercise: "Bench Press", suggestedSets: 4 },
      { exercise: "Incline Bench Press", suggestedSets: 4 },
      { exercise: "Decline Bench Press", suggestedSets: 3 },
      { exercise: "Dumbbell Flyes", suggestedSets: 3 },
      { exercise: "Cable Crossover", suggestedSets: 3 },
      { exercise: "Push-Ups", suggestedSets: 3 },
    ],
  },

  // Pull Day Templates
  {
    id: "pull-beginner",
    name: "Pull Day - Beginner",
    description: "Basis pull workout voor beginners",
    category: "Pull",
    exercises: [
      { exercise: "Lat Pulldown", suggestedSets: 3 },
      { exercise: "Seated Cable Row", suggestedSets: 3 },
      { exercise: "Face Pull", suggestedSets: 3 },
      { exercise: "Barbell Curl", suggestedSets: 3 },
      { exercise: "Hammer Curl", suggestedSets: 3 },
    ],
  },
  {
    id: "pull-advanced",
    name: "Pull Day - Advanced",
    description: "Intensieve pull workout met meer volume",
    category: "Pull",
    exercises: [
      { exercise: "Deadlift", suggestedSets: 4 },
      { exercise: "Pull-Ups", suggestedSets: 4 },
      { exercise: "Barbell Row", suggestedSets: 4 },
      { exercise: "T-Bar Row", suggestedSets: 3 },
      { exercise: "Face Pull", suggestedSets: 3 },
      { exercise: "Barbell Curl", suggestedSets: 3 },
      { exercise: "Preacher Curl", suggestedSets: 3 },
      { exercise: "Reverse Curl", suggestedSets: 3 },
    ],
  },
  {
    id: "back-focus",
    name: "Back Focus",
    description: "Complete rug workout",
    category: "Pull",
    exercises: [
      { exercise: "Deadlift", suggestedSets: 4 },
      { exercise: "Pull-Ups", suggestedSets: 4 },
      { exercise: "Barbell Row", suggestedSets: 4 },
      { exercise: "Lat Pulldown", suggestedSets: 3 },
      { exercise: "Seated Cable Row", suggestedSets: 3 },
      { exercise: "Straight Arm Pulldown", suggestedSets: 3 },
    ],
  },

  // Leg Day Templates
  {
    id: "legs-beginner",
    name: "Leg Day - Beginner",
    description: "Basis been workout voor beginners",
    category: "Legs",
    exercises: [
      { exercise: "Squat", suggestedSets: 3 },
      { exercise: "Leg Press", suggestedSets: 3 },
      { exercise: "Romanian Deadlift", suggestedSets: 3 },
      { exercise: "Leg Curl", suggestedSets: 3 },
      { exercise: "Calf Raise", suggestedSets: 3 },
    ],
  },
  {
    id: "legs-advanced",
    name: "Leg Day - Advanced",
    description: "Intensieve been workout met meer volume",
    category: "Legs",
    exercises: [
      { exercise: "Squat", suggestedSets: 5 },
      { exercise: "Front Squat", suggestedSets: 4 },
      { exercise: "Romanian Deadlift", suggestedSets: 4 },
      { exercise: "Leg Press", suggestedSets: 4 },
      { exercise: "Walking Lunge", suggestedSets: 3 },
      { exercise: "Leg Curl", suggestedSets: 3 },
      { exercise: "Leg Extension", suggestedSets: 3 },
      { exercise: "Calf Raise", suggestedSets: 4 },
    ],
  },
  {
    id: "glutes-focus",
    name: "Glutes Focus",
    description: "Bilspieren focus workout",
    category: "Legs",
    exercises: [
      { exercise: "Hip Thrust", suggestedSets: 4 },
      { exercise: "Romanian Deadlift", suggestedSets: 4 },
      { exercise: "Bulgarian Split Squat", suggestedSets: 3 },
      { exercise: "Cable Kickback", suggestedSets: 3 },
      { exercise: "Glute Bridge", suggestedSets: 3 },
      { exercise: "Sumo Deadlift", suggestedSets: 3 },
    ],
  },

  // Upper Body Templates
  {
    id: "upper-body",
    name: "Upper Body",
    description: "Complete bovenlichaam workout",
    category: "Upper",
    exercises: [
      { exercise: "Bench Press", suggestedSets: 4 },
      { exercise: "Barbell Row", suggestedSets: 4 },
      { exercise: "Overhead Press", suggestedSets: 3 },
      { exercise: "Lat Pulldown", suggestedSets: 3 },
      { exercise: "Dumbbell Curl", suggestedSets: 3 },
      { exercise: "Tricep Pushdown", suggestedSets: 3 },
    ],
  },
  {
    id: "shoulders-arms",
    name: "Shoulders & Arms",
    description: "Focus op schouders en armen",
    category: "Upper",
    exercises: [
      { exercise: "Overhead Press", suggestedSets: 4 },
      { exercise: "Lateral Raise", suggestedSets: 4 },
      { exercise: "Face Pull", suggestedSets: 3 },
      { exercise: "Barbell Curl", suggestedSets: 3 },
      { exercise: "Hammer Curl", suggestedSets: 3 },
      { exercise: "Tricep Dips", suggestedSets: 3 },
      { exercise: "Skull Crushers", suggestedSets: 3 },
    ],
  },

  // Lower Body Templates
  {
    id: "lower-body",
    name: "Lower Body",
    description: "Complete onderlichaam workout",
    category: "Lower",
    exercises: [
      { exercise: "Squat", suggestedSets: 4 },
      { exercise: "Romanian Deadlift", suggestedSets: 4 },
      { exercise: "Leg Press", suggestedSets: 3 },
      { exercise: "Walking Lunge", suggestedSets: 3 },
      { exercise: "Leg Curl", suggestedSets: 3 },
      { exercise: "Calf Raise", suggestedSets: 4 },
    ],
  },

  // Full Body Templates
  {
    id: "full-body-beginner",
    name: "Full Body - Beginner",
    description: "Complete workout voor het hele lichaam",
    category: "Full Body",
    exercises: [
      { exercise: "Squat", suggestedSets: 3 },
      { exercise: "Bench Press", suggestedSets: 3 },
      { exercise: "Barbell Row", suggestedSets: 3 },
      { exercise: "Overhead Press", suggestedSets: 3 },
      { exercise: "Romanian Deadlift", suggestedSets: 3 },
    ],
  },
  {
    id: "full-body-strength",
    name: "Full Body - Strength",
    description: "Kracht-georiënteerde full body",
    category: "Full Body",
    exercises: [
      { exercise: "Squat", suggestedSets: 5 },
      { exercise: "Bench Press", suggestedSets: 5 },
      { exercise: "Deadlift", suggestedSets: 3 },
      { exercise: "Overhead Press", suggestedSets: 4 },
      { exercise: "Barbell Row", suggestedSets: 4 },
    ],
  },
  {
    id: "compound-only",
    name: "Compound Only",
    description: "Alleen samengestelde oefeningen",
    category: "Full Body",
    exercises: [
      { exercise: "Squat", suggestedSets: 4 },
      { exercise: "Deadlift", suggestedSets: 4 },
      { exercise: "Bench Press", suggestedSets: 4 },
      { exercise: "Overhead Press", suggestedSets: 4 },
      { exercise: "Pull-Ups", suggestedSets: 4 },
      { exercise: "Barbell Row", suggestedSets: 4 },
    ],
  },
];

export const getTemplatesByCategory = (category: WorkoutTemplate["category"]) => {
  return workoutTemplates.filter((t) => t.category === category);
};

export const getAllCategories = (): WorkoutTemplate["category"][] => {
  return ["Push", "Pull", "Legs", "Upper", "Lower", "Full Body"];
};
