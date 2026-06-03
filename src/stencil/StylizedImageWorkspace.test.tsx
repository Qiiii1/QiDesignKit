import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StylizedImageWorkspace } from "./StylizedImageWorkspace";

const exportMocks = vi.hoisted(() => {
  class MockStencilMp4UnsupportedError extends Error {}
  return {
    exportStencilPng: vi.fn(),
    exportStencilMp4: vi.fn(),
    StencilMp4UnsupportedError: MockStencilMp4UnsupportedError,
  };
});

vi.mock("./exportPng", () => ({
  exportStencilPng: exportMocks.exportStencilPng,
}));

vi.mock("./exportMp4", () => ({
  exportStencilMp4: exportMocks.exportStencilMp4,
  StencilMp4UnsupportedError: exportMocks.StencilMp4UnsupportedError,
}));

function makeImageFile(): File {
  return new File(["image"], "sample.png", { type: "image/png" });
}

describe("StylizedImageWorkspace", () => {
  beforeEach(() => {
    exportMocks.exportStencilPng.mockResolvedValue(undefined);
    exportMocks.exportStencilMp4.mockResolvedValue(undefined);
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({
      width: 4,
      height: 2,
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts with upload empty state and disabled exports", () => {
    render(<StylizedImageWorkspace onBack={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "镂空图像转换" }))
      .toBeInTheDocument();
    expect(screen.getByText("上传一张图片开始转换")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出 PNG" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "导出 MP4" })).toBeDisabled();
  });

  it("uploads a browser-decodable image and enables exports", async () => {
    const user = userEvent.setup();
    render(<StylizedImageWorkspace onBack={vi.fn()} />);

    await user.upload(screen.getByLabelText("选择图片文件"), makeImageFile());

    expect(await screen.findByLabelText("镂空图像预览")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出 PNG" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "导出 MP4" })).toBeEnabled();
  });

  it("updates visual controls independently", async () => {
    const user = userEvent.setup();
    render(<StylizedImageWorkspace onBack={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("前景色"), {
      target: { value: "#ff0000" },
    });
    await user.selectOptions(screen.getByLabelText("背景模式"), "custom");
    fireEvent.change(screen.getByLabelText("背景色"), {
      target: { value: "#123456" },
    });
    fireEvent.change(screen.getByLabelText("阈值"), {
      target: { value: "180" },
    });
    await user.selectOptions(screen.getByLabelText("纹理类型"), "lines");

    expect(screen.getByLabelText("前景色")).toHaveValue("#ff0000");
    expect(screen.getByLabelText("背景模式")).toHaveValue("custom");
    expect(screen.getByLabelText("背景色")).toHaveValue("#123456");
    expect(screen.getByLabelText("阈值")).toHaveValue("180");
    expect(screen.getByLabelText("纹理类型")).toHaveValue("lines");
  });

  it("shows unsupported MP4 notice without leaving the workspace", async () => {
    const user = userEvent.setup();
    exportMocks.exportStencilMp4.mockRejectedValue(
      new exportMocks.StencilMp4UnsupportedError("当前浏览器不支持本地 MP4 编码。"),
    );
    render(<StylizedImageWorkspace onBack={vi.fn()} />);

    await user.upload(screen.getByLabelText("选择图片文件"), makeImageFile());
    await user.click(await screen.findByRole("button", { name: "导出 MP4" }));

    expect(await screen.findByText("当前浏览器不支持本地 MP4 编码。"))
      .toBeInTheDocument();
    expect(screen.getByLabelText("镂空图像参数")).toBeInTheDocument();
  });

  it("shows MP4 progress while a supported export is running", async () => {
    const user = userEvent.setup();
    let finishExport = () => {};
    exportMocks.exportStencilMp4.mockImplementation(async (_source, _settings, options) => {
      options.onProgress(0.5);
      await new Promise<void>((resolve) => {
        finishExport = resolve;
      });
      options.onProgress(1);
    });
    render(<StylizedImageWorkspace onBack={vi.fn()} />);

    await user.upload(screen.getByLabelText("选择图片文件"), makeImageFile());
    await user.click(await screen.findByRole("button", { name: "导出 MP4" }));

    expect(await screen.findByText("MP4 生成中 50%")).toBeInTheDocument();
    finishExport();
    await waitFor(() => expect(screen.queryByText(/MP4 生成中/))
      .not.toBeInTheDocument());
  });

  it("returns to the effect selection page", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    render(<StylizedImageWorkspace onBack={onBack} />);

    await user.click(screen.getByRole("button", { name: "返回效果选择" }));

    expect(onBack).toHaveBeenCalledOnce();
  });
});
