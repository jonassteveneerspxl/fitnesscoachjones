import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WelcomeCard } from "@/components/WelcomeCard";
import { trainingTypeLabel } from "@/utils/trainingTypeLabel";

describe("welkomstkaart", () => {
  beforeEach(() => localStorage.clear());

  it("toont de uitleg en onthoudt dat je ze sloot", () => {
    const { unmount } = render(<WelcomeCard />);
    expect(screen.getByText(/tik na elke set op het rondje/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /uitleg sluiten/i }));
    expect(screen.queryByText(/welkom/i)).toBeNull();
    unmount();
    render(<WelcomeCard />);
    expect(screen.queryByText(/welkom/i)).toBeNull();
  });
});

describe("trainingTypeLabel", () => {
  it("vertaalt alleen de weergave, niet de opgeslagen waarde", () => {
    expect(trainingTypeLabel("Custom")).toBe("Eigen training");
    expect(trainingTypeLabel("Push")).toBe("Push");
  });
});
