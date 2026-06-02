import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";
import { createDefaultDocument, createDefaultRegion } from "./domain/defaults";
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
    const textInput = screen.getByLabelText("诗歌文本");
    await user.clear(textInput);
    await user.type(textInput, "海风吹过自己的句子");

    expect(textInput).toHaveValue("海风吹过自己的句子");
    expect(screen.getByRole("button", { name: "自定义文本" }))
      .toHaveAttribute("aria-pressed", "true");
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
    await user.click(screen.getByRole("button", { name: "雾粉底色" }));

    expect(screen.getByLabelText("字号")).toBeEnabled();
    expect(screen.getByLabelText("字距")).toHaveValue(-4);
    expect(screen.getByRole("button", { name: "雾粉底色" }))
      .toHaveAttribute("aria-pressed", "true");
  });

  it("switches inspector regions and keeps typography, color, and contours independent", async () => {
    const first = createDefaultRegion([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 0, y: 200 },
    ]);
    const second = createDefaultRegion([
      { x: 240, y: 0 },
      { x: 440, y: 0 },
      { x: 240, y: 200 },
    ]);
    await saveProject({
      document: { ...createDefaultDocument(), regions: [first, second] },
      history: [],
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole("button", { name: "选择区域 1" }));
    await user.click(screen.getByRole("tab", { name: "区域" }));
    await user.selectOptions(screen.getByLabelText("字体"), '"Georgia", "Noto Serif SC", serif');
    fireEvent.change(screen.getByLabelText("字体颜色"), {
      target: { value: "#ff0000" },
    });
    await user.click(screen.getByRole("checkbox", { name: "显示当前区域轮廓" }));

    await user.click(screen.getByRole("button", { name: "选择区域 2" }));
    expect(screen.getByLabelText("字体")).toHaveValue('"Arial", "Noto Sans SC", sans-serif');
    expect(screen.getByLabelText("字体颜色")).toHaveValue("#111111");
    expect(screen.getByRole("checkbox", { name: "显示当前区域轮廓" })).toBeChecked();

    await user.selectOptions(screen.getByLabelText("字体"), '"Courier New", "Noto Sans SC", monospace');
    fireEvent.change(screen.getByLabelText("字体颜色"), {
      target: { value: "#0000ff" },
    });
    await user.click(screen.getByRole("button", { name: "选择区域 1" }));

    expect(screen.getByLabelText("字体")).toHaveValue('"Georgia", "Noto Serif SC", serif');
    expect(screen.getByLabelText("字体颜色")).toHaveValue("#ff0000");
    expect(screen.getByRole("checkbox", { name: "显示当前区域轮廓" })).not.toBeChecked();
  });
});
