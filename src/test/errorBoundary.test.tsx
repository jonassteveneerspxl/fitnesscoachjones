import { it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "@/components/ErrorBoundary";

it("toont de foutmelding in plaats van een leeg scherm", () => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  const Boom = () => {
    throw new Error("kapot");
  };
  render(<ErrorBoundary><Boom /></ErrorBoundary>);
  expect(screen.getByRole("alert").textContent).toContain("kapot");
});
