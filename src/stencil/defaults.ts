import type { StencilSettings } from "./types";

export const DEFAULT_STENCIL_SETTINGS: StencilSettings = {
  foregroundColor: "#111111",
  backgroundMode: "transparent",
  backgroundColor: "#ffffff",
  threshold: 138,
  invert: false,
  textureType: "mixed",
  textureDensity: 0.42,
  textureScale: 34,
  edgeEmphasis: 0.55,
  flowEnabled: true,
  breathingEnabled: true,
  animationDuration: 4,
  frameRate: 24,
  flowSpeed: 0.65,
  breathingAmplitude: 22,
};
