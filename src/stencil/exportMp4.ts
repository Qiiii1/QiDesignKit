import {
  BufferTarget,
  CanvasSource,
  Mp4OutputFormat,
  Output,
  QUALITY_HIGH,
  getFirstEncodableVideoCodec,
  type Quality,
  type VideoCodec,
} from "mediabunny";
import {
  calculateFrameCount,
  calculateMp4Dimensions,
  getFrameTime,
} from "./dimensions";
import { getBaseName, readSourceImageData } from "./image";
import { renderStencilImageData } from "./renderStencil";
import type { StencilSettings, StencilSource } from "./types";

export class StencilMp4UnsupportedError extends Error {
  constructor() {
    super("当前浏览器不支持本地 MP4 编码。请继续导出 PNG，或换用支持 WebCodecs AVC/H.264 编码的浏览器。");
  }
}

interface OutputLike {
  addVideoTrack: (source: unknown) => unknown;
  start: () => Promise<void>;
  finalize: () => Promise<void>;
  target: { buffer: ArrayBuffer | null };
}

interface CanvasSourceLike {
  add: (
    timestamp: number,
    duration?: number,
    options?: VideoEncoderEncodeOptions,
  ) => Promise<void>;
}

interface Mp4Dependencies {
  getFirstEncodableVideoCodec?: typeof getFirstEncodableVideoCodec;
  createCanvas?: (width: number, height: number) => HTMLCanvasElement;
  createOutput?: () => OutputLike;
  createCanvasSource?: (
    canvas: HTMLCanvasElement,
    options: { codec: VideoCodec; bitrate: Quality },
  ) => CanvasSourceLike;
  download?: (blob: Blob, filename: string) => void;
  onProgress?: (progress: number) => void;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createDefaultOutput(): OutputLike {
  return new Output({
    format: new Mp4OutputFormat(),
    target: new BufferTarget(),
  }) as OutputLike;
}

function createDefaultCanvasSource(
  canvas: HTMLCanvasElement,
  options: { codec: VideoCodec; bitrate: Quality },
): CanvasSourceLike {
  return new CanvasSource(canvas, options);
}

function createCanvas(
  width: number,
  height: number,
  dependency?: (width: number, height: number) => HTMLCanvasElement,
): HTMLCanvasElement {
  const canvas = dependency?.(width, height) ?? document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function isStencilMp4Supported(
  width: number,
  height: number,
  dependencies: Pick<Mp4Dependencies, "getFirstEncodableVideoCodec"> = {},
): Promise<boolean> {
  const dimensions = calculateMp4Dimensions(width, height);
  const checker = dependencies.getFirstEncodableVideoCodec
    ?? getFirstEncodableVideoCodec;
  const codec = await checker(["avc"], {
    width: dimensions.width,
    height: dimensions.height,
  });
  return codec === "avc";
}

export async function exportStencilMp4(
  source: StencilSource,
  settings: StencilSettings,
  dependencies: Mp4Dependencies = {},
): Promise<void> {
  const dimensions = calculateMp4Dimensions(source.width, source.height);
  const checker = dependencies.getFirstEncodableVideoCodec
    ?? getFirstEncodableVideoCodec;
  const codec = await checker(["avc"], {
    width: dimensions.width,
    height: dimensions.height,
  });
  if (codec !== "avc") {
    throw new StencilMp4UnsupportedError();
  }

  const canvas = createCanvas(
    dimensions.width,
    dimensions.height,
    dependencies.createCanvas,
  );
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("无法初始化 MP4 画布");
  }

  const output = dependencies.createOutput?.() ?? createDefaultOutput();
  const videoSource = dependencies.createCanvasSource?.(canvas, {
    codec,
    bitrate: QUALITY_HIGH,
  }) ?? createDefaultCanvasSource(canvas, {
    codec,
    bitrate: QUALITY_HIGH,
  });
  output.addVideoTrack(videoSource);
  await output.start();

  const sourceCanvas = createCanvas(
    dimensions.width,
    dimensions.height,
    dependencies.createCanvas,
  );
  const scaledSource = {
    ...source,
    width: dimensions.width,
    height: dimensions.height,
  };
  const frameCount = calculateFrameCount(
    settings.animationDuration,
    settings.frameRate,
  );

  for (let frame = 0; frame < frameCount; frame += 1) {
    const time = getFrameTime(frame, settings.frameRate);
    const imageData = readSourceImageData(scaledSource, sourceCanvas);
    const rendered = renderStencilImageData({
      source: imageData,
      settings,
      time,
    });
    context.putImageData(rendered, 0, 0);
    await videoSource.add(time, 1 / settings.frameRate, {
      keyFrame: frame % Math.max(1, settings.frameRate) === 0,
    });
    dependencies.onProgress?.((frame + 1) / frameCount);
  }

  await output.finalize();
  if (output.target.buffer === null) {
    throw new Error("无法创建 MP4 文件");
  }
  const blob = new Blob([output.target.buffer], { type: "video/mp4" });
  const filename = `stencil-${getBaseName(source.name)}.mp4`;
  (dependencies.download ?? downloadBlob)(blob, filename);
}
