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

  it("opens on an effect selection page and enters the text workspace", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "选择视觉效果" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: /文字区域填充/ }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: /镂空图像转换/ }))
      .toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /文字区域填充/ }));

    expect(screen.getByLabelText("视觉文字效果编辑器")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "返回效果选择" }));
    expect(screen.getByRole("heading", { name: "选择视觉效果" }))
      .toBeInTheDocument();
  });

  it("enters the stencil workspace from the selection page", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /镂空图像转换/ }));

    expect(screen.getByRole("heading", { name: "镂空图像转换" }))
      .toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回效果选择" }))
      .toBeInTheDocument();
  });

  it("switches tools and changes solid canvas dimensions without a global contour toggle", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /文字区域填充/ }));

    await user.click(screen.getByRole("button", { name: "选择" }));
    expect(screen.getByRole("button", { name: "选择" }))
      .toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "绘制区域" }));
    expect(screen.getByRole("button", { name: "绘制区域" }))
      .toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "隐藏轮廓" }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "显示轮廓" }))
      .not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("画布宽度"), {
      target: { value: "640" },
    });
    await user.clear(screen.getByLabelText("画布高度"));
    await user.type(screen.getByLabelText("画布高度"), "960");

    expect(screen.getByText("640 × 960 px")).toBeInTheDocument();
  });

  it("uses neutral text labels while exposing presets and custom text", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /文字区域填充/ }));

    expect(screen.getByRole("option", { name: "静夜思 · 李白" }))
      .toBeInTheDocument();
    expect(screen.queryByText("Verseform")).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "文本" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "预设文本" }))
      .toBeInTheDocument();
    expect(screen.queryByText(/诗歌/)).not.toBeInTheDocument();
    const textInput = screen.getByLabelText("填充文本内容");
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
    await userEvent.click(await screen.findByRole("button", { name: /文字区域填充/ }));

    expect(await screen.findByText("640 × 960 px")).toBeInTheDocument();
  });

  it("undoes document edits from the top bar", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /文字区域填充/ }));

    fireEvent.change(screen.getByLabelText("画布宽度"), {
      target: { value: "640" },
    });
    await user.click(screen.getByRole("button", { name: "撤销" }));

    expect(screen.getByText("1200 × 1200 px")).toBeInTheDocument();
  });

  it("enables region typography controls after drawing a usable shape", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /文字区域填充/ }));
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

    await user.click(screen.getByRole("button", { name: /文字区域填充/ }));
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
