import { describe, expect, it } from "vitest";
import { DEFAULT_STENCIL_SETTINGS } from "./defaults";

describe("DEFAULT_STENCIL_SETTINGS", () => {
  it("starts with useful editable visual and animation values", () => {
    expect(DEFAULT_STENCIL_SETTINGS.foregroundColor).toMatch(/^#[0-9a-f]{6}$/i);
    expect(DEFAULT_STENCIL_SETTINGS.visualMode).toBe("diffusion");
    expect(DEFAULT_STENCIL_SETTINGS.backgroundMode).toBe("white");
    expect(DEFAULT_STENCIL_SETTINGS.threshold).toBeGreaterThan(0);
    expect(DEFAULT_STENCIL_SETTINGS.threshold).toBeLessThan(255);
    expect(DEFAULT_STENCIL_SETTINGS.textureType).toBe("mixed");
    expect(DEFAULT_STENCIL_SETTINGS.textureDensity).toBeGreaterThan(0);
    expect(DEFAULT_STENCIL_SETTINGS.diffusionStrength).toBeGreaterThan(0);
    expect(DEFAULT_STENCIL_SETTINGS.diffusionLineSpacing).toBeGreaterThan(0);
    expect(DEFAULT_STENCIL_SETTINGS.diffusionLineWidth).toBeGreaterThan(0);
    expect(DEFAULT_STENCIL_SETTINGS.diffusionDotDensity).toBeGreaterThan(0);
    expect(DEFAULT_STENCIL_SETTINGS.diffusionGrowth).toBeGreaterThan(0);
    expect(DEFAULT_STENCIL_SETTINGS.animationDuration).toBeGreaterThan(0);
    expect(DEFAULT_STENCIL_SETTINGS.frameRate).toBeGreaterThan(0);
    expect(DEFAULT_STENCIL_SETTINGS.flowEnabled).toBe(true);
    expect(DEFAULT_STENCIL_SETTINGS.breathingEnabled).toBe(true);
  });
});
