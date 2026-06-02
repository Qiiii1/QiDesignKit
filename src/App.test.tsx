import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { createDefaultDocument } from "./domain/defaults";
import {
  deleteDatabase,
  saveProject,
} from "./storage/projectStore";

describe("App editor workflow", () => {
  beforeEach(async () => deleteDatabase());

  it("switches tools, toggles contours, and changes solid canvas dimensions", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "选择" }));
    expect(screen.getByRole("button", { name: "选择" }))
      .toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "绘制区域" }));
    expect(screen.getByRole("button", { name: "绘制区域" }))
      .toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "隐藏轮廓" }));
    expect(screen.getByRole("button", { name: "显示轮廓" }))
      .toBeInTheDocument();
    await user.clear(screen.getByLabelText("画布宽度"));
    await user.type(screen.getByLabelText("画布宽度"), "640");
    await user.clear(screen.getByLabelText("画布高度"));
    await user.type(screen.getByLabelText("画布高度"), "960");

    expect(screen.getByText("640 × 960 px")).toBeInTheDocument();
  });

  it("exposes included poems and custom text", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("option", { name: "静夜思 · 李白" }))
      .toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "自定义文本" }));

    expect(screen.getByLabelText("诗歌文本")).toBeInTheDocument();
  });

  it("restores the locally saved document after initialization", async () => {
    await saveProject({
      document: {
        ...createDefaultDocument(),
        background: {
          kind: "solid",
          width: 640,
          height: 960,
          color: "#fff",
        },
      },
      history: [],
    });

    render(<App />);

    expect(await screen.findByText("640 × 960 px")).toBeInTheDocument();
  });

  it("undoes document edits from the top bar", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "隐藏轮廓" }));
    await user.click(screen.getByRole("button", { name: "撤销" }));

    expect(screen.getByRole("button", { name: "隐藏轮廓" }))
      .toBeInTheDocument();
  });

  it("enables region typography controls after drawing a usable shape", async () => {
    const user = userEvent.setup();
    render(<App />);
    const canvas = screen.getByLabelText("创作画布");

    fireEvent.mouseDown(canvas, { clientX: 10, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 210, clientY: 10 });
    fireEvent.mouseMove(canvas, { clientX: 210, clientY: 210 });
    fireEvent.mouseMove(canvas, { clientX: 10, clientY: 210 });
    fireEvent.mouseUp(canvas);
    await user.click(screen.getByRole("tab", { name: "区域" }));

    expect(screen.getByLabelText("字号")).toBeEnabled();
    expect(screen.getByLabelText("字距")).toHaveValue(-2);
  });
});
