import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverStub);
class ImageDataStub {
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;
  readonly colorSpace = "srgb";

  constructor(dataOrWidth: Uint8ClampedArray | number, width: number, height?: number) {
    if (typeof dataOrWidth === "number") {
      this.width = dataOrWidth;
      this.height = width;
      this.data = new Uint8ClampedArray(this.width * this.height * 4);
      return;
    }

    this.data = dataOrWidth;
    this.width = width;
    this.height = height ?? dataOrWidth.length / width / 4;
  }
}
vi.stubGlobal("ImageData", ImageDataStub);
afterEach(cleanup);
Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
  value: vi.fn(() => ({
    save: vi.fn(), restore: vi.fn(), scale: vi.fn(), clearRect: vi.fn(), fillRect: vi.fn(),
    beginPath: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), closePath: vi.fn(),
    clip: vi.fn(), stroke: vi.fn(), arc: vi.fn(), fill: vi.fn(), fillText: vi.fn(),
    drawImage: vi.fn(), putImageData: vi.fn(),
    getImageData: vi.fn(() => new ImageData(new Uint8ClampedArray([
      0, 0, 0, 255,
    ]), 1, 1)),
    measureText: (text: string) => ({ width: text.length * 10 }),
  })),
});
Object.defineProperty(HTMLCanvasElement.prototype, "toBlob", {
  value: vi.fn(function toBlob(callback: BlobCallback) {
    callback(new Blob(["png"], { type: "image/png" }));
  }),
});
Object.defineProperty(HTMLCanvasElement.prototype, "getBoundingClientRect", {
  value: () => ({ left: 0, top: 0, width: 1200, height: 1200, right: 1200, bottom: 1200, x: 0, y: 0, toJSON() {} }),
});
