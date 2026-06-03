import type { StencilSource } from "./types";

export async function decodeStencilImage(file: File): Promise<StencilSource> {
  const bitmap = await createImageBitmap(file);
  return {
    image: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    name: file.name,
  };
}

export function getBaseName(filename: string): string {
  const withoutPath = filename.split(/[\\/]/).pop() ?? "image";
  return withoutPath.replace(/\.[^.]+$/, "") || "image";
}

export function readSourceImageData(
  source: StencilSource,
  canvas: HTMLCanvasElement,
): ImageData {
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("无法初始化图像处理画布");
  }
  context.drawImage(source.image, 0, 0, source.width, source.height);
  return context.getImageData(0, 0, source.width, source.height);
}
