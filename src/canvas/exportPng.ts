import type { EditorDocument } from "../domain/types";
import { renderDocument } from "./renderDocument";

export interface ExportDependencies {
  createCanvas?: () => HTMLCanvasElement;
  download?: (blob: Blob, filename: string) => void;
}

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

export async function exportDocumentPng(
  document: EditorDocument,
  dependencies: ExportDependencies = {},
): Promise<void> {
  const canvas = dependencies.createCanvas?.() ?? window.document.createElement("canvas");
  canvas.width = document.background.width;
  canvas.height = document.background.height;

  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("无法初始化 PNG 画布");
  }

  renderDocument(context, document, { scale: 1, editorMode: false });
  const blob = await createPngBlob(canvas);
  (dependencies.download ?? downloadBlob)(blob, "visual-text.png");
}
