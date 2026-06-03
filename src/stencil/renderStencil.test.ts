import { describe, expect, it } from "vitest";
import { DEFAULT_STENCIL_SETTINGS } from "./defaults";
import { renderStencilImageData } from "./renderStencil";

function makeImageData(values: number[], width = values.length): ImageData {
  const data = new Uint8ClampedArray(values.length * 4);
  values.forEach((value, index) => {
    data[index * 4] = value;
    data[index * 4 + 1] = value;
    data[index * 4 + 2] = value;
    data[index * 4 + 3] = 255;
  });
  return new ImageData(data, width, values.length / width);
}

function alphaAt(imageData: ImageData, pixelIndex: number): number {
  return imageData.data[pixelIndex * 4 + 3];
}

function countOpaque(imageData: ImageData): number {
  let count = 0;
  for (let index = 3; index < imageData.data.length; index += 4) {
    if (imageData.data[index] > 0) {
      count += 1;
    }
  }
  return count;
}

describe("renderStencilImageData", () => {
  it("applies threshold and transparent background", () => {
    const output = renderStencilImageData({
      source: makeImageData([20, 120, 220]),
      settings: {
        ...DEFAULT_STENCIL_SETTINGS,
        threshold: 140,
        textureDensity: 0,
        foregroundColor: "#ff0000",
        backgroundMode: "transparent",
      },
      time: 0,
    });

    expect(Array.from(output.data.slice(0, 4))).toEqual([255, 0, 0, 255]);
    expect(alphaAt(output, 1)).toBe(255);
    expect(alphaAt(output, 2)).toBe(0);
  });

  it("supports inverted foreground selection", () => {
    const normal = renderStencilImageData({
      source: makeImageData([20, 220]),
      settings: { ...DEFAULT_STENCIL_SETTINGS, textureDensity: 0 },
      time: 0,
    });
    const inverted = renderStencilImageData({
      source: makeImageData([20, 220]),
      settings: {
        ...DEFAULT_STENCIL_SETTINGS,
        invert: true,
        textureDensity: 0,
      },
      time: 0,
    });

    expect(alphaAt(normal, 0)).toBe(255);
    expect(alphaAt(normal, 1)).toBe(0);
    expect(alphaAt(inverted, 0)).toBe(0);
    expect(alphaAt(inverted, 1)).toBe(255);
  });

  it("renders white and custom backgrounds", () => {
    const white = renderStencilImageData({
      source: makeImageData([240]),
      settings: {
        ...DEFAULT_STENCIL_SETTINGS,
        textureDensity: 0,
        backgroundMode: "white",
      },
      time: 0,
    });
    const custom = renderStencilImageData({
      source: makeImageData([240]),
      settings: {
        ...DEFAULT_STENCIL_SETTINGS,
        textureDensity: 0,
        backgroundMode: "custom",
        backgroundColor: "#123456",
      },
      time: 0,
    });

    expect(Array.from(white.data.slice(0, 4))).toEqual([255, 255, 255, 255]);
    expect(Array.from(custom.data.slice(0, 4))).toEqual([18, 52, 86, 255]);
  });

  it("changes output when texture settings and time change", () => {
    const source = makeImageData(Array.from({ length: 256 }, () => 30), 16);
    const settings = {
      ...DEFAULT_STENCIL_SETTINGS,
      breathingEnabled: false,
      textureType: "mixed" as const,
      textureDensity: 0.86,
      textureScale: 9,
    };
    const first = renderStencilImageData({ source, settings, time: 0 });
    const second = renderStencilImageData({ source, settings, time: 1.2 });

    expect(countOpaque(first)).not.toBe(countOpaque(second));
  });
});
