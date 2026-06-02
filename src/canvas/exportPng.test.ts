import { describe, expect, it, vi } from "vitest";
import { createDefaultDocument } from "../domain/defaults";
import { exportDocumentPng } from "./exportPng";

describe("exportDocumentPng", () => {
  it("renders using the document's original dimensions", async () => {
    const canvas = document.createElement("canvas");
    canvas.toBlob = (callback) => callback(
      new Blob(["png"], { type: "image/png" }),
    );
    const createCanvas = vi.fn(() => canvas);
    const download = vi.fn();

    await exportDocumentPng({
      ...createDefaultDocument(),
      background: {
        kind: "solid",
        width: 640,
        height: 960,
        color: "#fff",
      },
    }, { createCanvas, download });

    expect(canvas.width).toBe(640);
    expect(canvas.height).toBe(960);
    expect(download).toHaveBeenCalledWith(expect.any(Blob), "visual-text.png");
  });

  it("rejects when a PNG blob cannot be created", async () => {
    const canvas = document.createElement("canvas");
    canvas.toBlob = (callback) => callback(null);

    await expect(exportDocumentPng(createDefaultDocument(), {
      createCanvas: () => canvas,
      download: vi.fn(),
    })).rejects.toThrow("无法创建 PNG");
  });
});
