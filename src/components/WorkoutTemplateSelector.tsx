import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, Dumbbell, ChevronRight } from "lucide-react";
import {
  workoutTemplates,
  WorkoutTemplate,
  getAllCategories,
  getTemplatesByCategory,
} from "@/data/workoutTemplates";

interface WorkoutTemplateSelectorProps {
  onSelectTemplate: (template: WorkoutTemplate) => void;
}

export function WorkoutTemplateSelector({
  onSelectTemplate,
}: WorkoutTemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const categories = getAllCategories();

  const handleSelectTemplate = (template: WorkoutTemplate) => {
    onSelectTemplate(template);
    setOpen(false);
  };

  const categoryColors: Record<string, string> = {
    Push: "bg-red-500/20 text-red-400 border-red-500/30",
    Pull: "bg-green-500/20 text-green-400 border-green-500/30",
    Legs: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    Upper: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Lower: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "Full Body": "bg-primary/20 text-primary border-primary/30",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full border-primary/30 hover:border-primary hover:bg-primary/10 text-primary"
        >
          <FileText className="w-4 h-4 mr-2" />
          Kies Workout Template
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] p-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-primary" />
            Workout Templates
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue={categories[0]} className="w-full">
          <div className="px-4">
            <TabsList className="w-full h-auto flex-wrap gap-1 bg-transparent p-0">
              {categories.map((category) => (
                <TabsTrigger
                  key={category}
                  value={category}
                  className="text-xs px-3 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {categories.map((category) => (
            <TabsContent key={category} value={category} className="mt-2">
              <ScrollArea className="h-[50vh] px-4 pb-4">
                <div className="space-y-2">
                  {getTemplatesByCategory(category).map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => handleSelectTemplate(template)}
                      className="w-full text-left p-4 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-foreground truncate">
                              {template.name}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-xs ${categoryColors[category]}`}
                            >
                              {template.exercises.length} oef.
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {template.description}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {template.exercises.slice(0, 3).map((ex, i) => (
                              <span
                                key={i}
                                className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                              >
                                {ex.exercise}
                              </span>
                            ))}
                            {template.exercises.length > 3 && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                +{template.exercises.length - 3} meer
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
