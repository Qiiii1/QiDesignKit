import { describe, expect, it, vi } from "vitest";
import { DEFAULT_STENCIL_SETTINGS } from "./defaults";
import {
  StencilMp4UnsupportedError,
  exportStencilMp4,
  isStencilMp4Supported,
} from "./exportMp4";

const source = {
  image: {} as CanvasImageSource,
  width: 2,
  height: 2,
  name: "motion.png",
};

describe("isStencilMp4Supported", () => {
  it("returns false when mediabunny cannot encode AVC for the dimensions", async () => {
    const supported = await isStencilMp4Supported(640, 480, {
      getFirstEncodableVideoCodec: vi.fn().mockResolvedValue(null),
    });

    expect(supported).toBe(false);
  });
});

describe("exportStencilMp4", () => {
  it("throws a compatibility error before rendering unsupported exports", async () => {
    const createCanvas = vi.fn();

    await expect(exportStencilMp4(source, DEFAULT_STENCIL_SETTINGS, {
      getFirstEncodableVideoCodec: vi.fn().mockResolvedValue(null),
      createCanvas,
    })).rejects.toBeInstanceOf(StencilMp4UnsupportedError);
    expect(createCanvas).not.toHaveBeenCalled();
  });

  it("reports progress while adding frames for supported exports", async () => {
    const add = vi.fn().mockResolvedValue(undefined);
    const output = {
      addVideoTrack: vi.fn(),
      start: vi.fn().mockResolvedValue(undefined),
      finalize: vi.fn().mockResolvedValue(undefined),
      target: { buffer: new ArrayBuffer(4) },
    };
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: vi.fn(),
        getImageData: () => new ImageData(new Uint8ClampedArray(16), 2, 2),
        putImageData: vi.fn(),
      }),
    } as unknown as HTMLCanvasElement;
    const progress = vi.fn();
    const download = vi.fn();

    await exportStencilMp4(
      source,
      {
        ...DEFAULT_STENCIL_SETTINGS,
        animationDuration: 1,
        frameRate: 2,
      },
      {
        getFirstEncodableVideoCodec: vi.fn().mockResolvedValue("avc"),
        createCanvas: () => canvas,
        createOutput: vi.fn(() => output),
        createCanvasSource: vi.fn(() => ({ add })),
        download,
        onProgress: progress,
      },
    );

    expect(add).toHaveBeenCalledTimes(2);
    expect(progress).toHaveBeenLastCalledWith(1);
    expect(download).toHaveBeenCalledWith(
      expect.any(Blob),
      "stencil-motion.mp4",
    );
  });
});
