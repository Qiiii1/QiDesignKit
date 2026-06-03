import { describe, expect, it, vi } from "vitest";
import { DEFAULT_STENCIL_SETTINGS } from "./defaults";
import { exportStencilPng } from "./exportPng";

describe("exportStencilPng", () => {
  it("renders original dimensions and downloads a PNG", async () => {
    const putImageData = vi.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: vi.fn(),
        getImageData: () => new ImageData(new Uint8ClampedArray([
          20, 20, 20, 255,
          240, 240, 240, 255,
        ]), 2, 1),
        putImageData,
      }),
      toBlob: (callback: BlobCallback) => callback(new Blob(["png"], {
        type: "image/png",
      })),
    } as unknown as HTMLCanvasElement;
    const download = vi.fn();

    await exportStencilPng(
      {
        image: {} as CanvasImageSource,
        width: 2,
        height: 1,
        name: "sample.jpg",
      },
      DEFAULT_STENCIL_SETTINGS,
      0,
      {
        createCanvas: () => canvas,
        download,
      },
    );

    expect(canvas.width).toBe(2);
    expect(canvas.height).toBe(1);
    expect(putImageData).toHaveBeenCalledOnce();
    expect(download).toHaveBeenCalledWith(
      expect.any(Blob),
      "stencil-sample.png",
    );
  });
});
