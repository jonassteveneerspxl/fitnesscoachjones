import { TrainingType } from "@/types/workout";
import { PeriodPreset } from "@/utils/statistics";

export interface FilterState {
  preset: PeriodPreset;
  customFrom: string;
  customTo: string;
  types: TrainingType[];
  exerciseKey: string | null;
}

export const DEFAULT_FILTERS: FilterState = {
  preset: "all",
  customFrom: "",
  customTo: "",
  types: [],
  exerciseKey: null,
};
