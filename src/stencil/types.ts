export type StencilBackgroundMode = "transparent" | "white" | "custom";
export type StencilTextureType = "holes" | "lines" | "mixed";
export type StencilVisualMode = "diffusion" | "stencil";

export interface StencilSettings {
  visualMode: StencilVisualMode;
  foregroundColor: string;
  backgroundMode: StencilBackgroundMode;
  backgroundColor: string;
  threshold: number;
  invert: boolean;
  textureType: StencilTextureType;
  textureDensity: number;
  textureScale: number;
  edgeEmphasis: number;
  diffusionStrength: number;
  diffusionLineSpacing: number;
  diffusionLineWidth: number;
  diffusionDotDensity: number;
  diffusionGrowth: number;
  flowEnabled: boolean;
  breathingEnabled: boolean;
  animationDuration: number;
  frameRate: number;
  flowSpeed: number;
  breathingAmplitude: number;
}

export interface StencilSource {
  image: CanvasImageSource;
  width: number;
  height: number;
  name: string;
}

export interface StencilRenderInput {
  source: ImageData;
  settings: StencilSettings;
  time: number;
}

export interface StencilExportDependencies {
  createCanvas?: (width: number, height: number) => HTMLCanvasElement;
  download?: (blob: Blob, filename: string) => void;
}
