export type StencilBackgroundMode = "transparent" | "white" | "custom";
export type StencilTextureType = "holes" | "lines" | "mixed";

export interface StencilSettings {
  foregroundColor: string;
  backgroundMode: StencilBackgroundMode;
  backgroundColor: string;
  threshold: number;
  invert: boolean;
  textureType: StencilTextureType;
  textureDensity: number;
  textureScale: number;
  edgeEmphasis: number;
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
