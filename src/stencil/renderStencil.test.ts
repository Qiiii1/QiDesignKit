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

function countColor(imageData: ImageData, rgb: [number, number, number]): number {
  let count = 0;
  for (let index = 0; index < imageData.data.length; index += 4) {
    if (
      imageData.data[index] === rgb[0]
      && imageData.data[index + 1] === rgb[1]
      && imageData.data[index + 2] === rgb[2]
      && imageData.data[index + 3] > 0
    ) {
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
        visualMode: "stencil",
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
      settings: {
        ...DEFAULT_STENCIL_SETTINGS,
        visualMode: "stencil",
        backgroundMode: "transparent",
        textureDensity: 0,
      },
      time: 0,
    });
    const inverted = renderStencilImageData({
      source: makeImageData([20, 220]),
      settings: {
        ...DEFAULT_STENCIL_SETTINGS,
        visualMode: "stencil",
        backgroundMode: "transparent",
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
        visualMode: "stencil",
        textureDensity: 0,
        backgroundMode: "white",
      },
      time: 0,
    });
    const custom = renderStencilImageData({
      source: makeImageData([240]),
      settings: {
        ...DEFAULT_STENCIL_SETTINGS,
        visualMode: "stencil",
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
      visualMode: "stencil" as const,
      backgroundMode: "transparent" as const,
      breathingEnabled: false,
      textureType: "mixed" as const,
      textureDensity: 0.86,
      textureScale: 9,
    };
    const first = renderStencilImageData({ source, settings, time: 0 });
    const second = renderStencilImageData({ source, settings, time: 1.2 });

    expect(countOpaque(first)).not.toBe(countOpaque(second));
  });

  it("renders diffusion marks without filling the whole selected region", () => {
    const source = makeImageData(Array.from({ length: 256 }, () => 60), 16);
    const settings = {
      ...DEFAULT_STENCIL_SETTINGS,
      visualMode: "diffusion" as const,
      foregroundColor: "#00aa00",
      backgroundMode: "white" as const,
      threshold: 180,
      breathingEnabled: false,
      flowEnabled: false,
      textureDensity: 0,
      diffusionStrength: 0.7,
      diffusionLineSpacing: 12,
      diffusionLineWidth: 2,
      diffusionDotDensity: 0.35,
      diffusionGrowth: 1,
    };

    const output = renderStencilImageData({ source, settings, time: 0 });
    const foregroundPixels = countColor(output, [0, 170, 0]);

    expect(foregroundPixels).toBeGreaterThan(0);
    expect(foregroundPixels).toBeLessThan(256);
  });

  it("changes diffusion output when line and dot settings change", () => {
    const source = makeImageData(Array.from({ length: 400 }, () => 70), 20);
    const baseSettings = {
      ...DEFAULT_STENCIL_SETTINGS,
      visualMode: "diffusion" as const,
      foregroundColor: "#00aa00",
      backgroundMode: "white" as const,
      threshold: 180,
      breathingEnabled: false,
      flowEnabled: false,
      textureDensity: 0,
      diffusionStrength: 0.65,
      diffusionLineWidth: 2,
      diffusionGrowth: 1,
    };
    const fine = renderStencilImageData({
      source,
      settings: {
        ...baseSettings,
        diffusionLineSpacing: 8,
        diffusionDotDensity: 0.75,
      },
      time: 0,
    });
    const sparse = renderStencilImageData({
      source,
      settings: {
        ...baseSettings,
        diffusionLineSpacing: 24,
        diffusionDotDensity: 0.05,
      },
      time: 0,
    });

    expect(Array.from(fine.data)).not.toEqual(Array.from(sparse.data));
  });

  it("reveals more diffusion texture as animation time advances", () => {
    const source = makeImageData(Array.from({ length: 900 }, () => 50), 30);
    const settings = {
      ...DEFAULT_STENCIL_SETTINGS,
      visualMode: "diffusion" as const,
      foregroundColor: "#00aa00",
      backgroundMode: "white" as const,
      threshold: 180,
      breathingEnabled: false,
      flowEnabled: true,
      flowSpeed: 0.6,
      animationDuration: 4,
      textureDensity: 0,
      diffusionStrength: 0.8,
      diffusionLineSpacing: 10,
      diffusionLineWidth: 2,
      diffusionDotDensity: 0.4,
      diffusionGrowth: 0.1,
    };

    const early = renderStencilImageData({ source, settings, time: 0 });
    const late = renderStencilImageData({ source, settings, time: 3 });

    expect(countColor(late, [0, 170, 0]))
      .toBeGreaterThan(countColor(early, [0, 170, 0]));
  });
});
