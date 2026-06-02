import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("App", () => {
  it("shows the Verseform editor shell", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "Verseform" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出 PNG" })).toBeInTheDocument();
  });
});
