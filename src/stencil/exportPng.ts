import { getBaseName, readSourceImageData } from "./image";
import { renderStencilImageData } from "./renderStencil";
import type {
  StencilExportDependencies,
  StencilSettings,
  StencilSource,
} from "./types";

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function createPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error("无法创建 PNG"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

export async function exportStencilPng(
  source: StencilSource,
  settings: StencilSettings,
  time: number,
  dependencies: StencilExportDependencies = {},
): Promise<void> {
  const canvas = dependencies.createCanvas?.(source.width, source.height)
    ?? document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("无法初始化 PNG 画布");
  }

  const sourceImageData = readSourceImageData(source, canvas);
  const output = renderStencilImageData({
    source: sourceImageData,
    settings,
    time,
  });
  context.putImageData(output, 0, 0);

  const blob = await createPngBlob(canvas);
  const filename = `stencil-${getBaseName(source.name)}.png`;
  (dependencies.download ?? downloadBlob)(blob, filename);
}
