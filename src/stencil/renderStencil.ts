import type { StencilRenderInput, StencilSettings } from "./types";

interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

function clamp(value: number, min = 0, max = 255): number {
  return Math.min(max, Math.max(min, value));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function parseHexColor(value: string): Rgba {
  const normalized = value.replace("#", "");
  const hex = normalized.length === 3
    ? normalized.split("").map((part) => part + part).join("")
    : normalized.padEnd(6, "0").slice(0, 6);

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
    a: 255,
  };
}

function getBackgroundColor(settings: StencilSettings): Rgba {
  if (settings.backgroundMode === "transparent") {
    return { r: 255, g: 255, b: 255, a: 0 };
  }
  if (settings.backgroundMode === "white") {
    return { r: 255, g: 255, b: 255, a: 255 };
  }
  return parseHexColor(settings.backgroundColor);
}

function luminance(data: Uint8ClampedArray, index: number): number {
  return data[index] * 0.2126
    + data[index + 1] * 0.7152
    + data[index + 2] * 0.0722;
}

function sampleLuminance(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  const clampedX = Math.min(width - 1, Math.max(0, x));
  const clampedY = Math.min(height - 1, Math.max(0, y));
  return luminance(data, (clampedY * width + clampedX) * 4);
}

function edgeStrength(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  const center = sampleLuminance(data, width, height, x, y);
  const right = sampleLuminance(data, width, height, x + 1, y);
  const down = sampleLuminance(data, width, height, x, y + 1);
  return clamp01((Math.abs(center - right) + Math.abs(center - down)) / 180);
}

function waveNoise(x: number, y: number, time: number, scale: number): number {
  const safeScale = Math.max(2, scale);
  const nx = x / safeScale;
  const ny = y / safeScale;
  const a = Math.sin(nx * 2.7 + time * 2.2);
  const b = Math.cos(ny * 3.1 - time * 1.7);
  const c = Math.sin((nx + ny) * 4.4 + time * 0.9);
  return (a + b + c + 3) / 6;
}

function lineField(x: number, y: number, time: number, scale: number): number {
  const safeScale = Math.max(2, scale);
  const phase = (x * 0.72 + y * 1.18) / safeScale + time;
  const wave = Math.abs(Math.sin(phase * Math.PI * 2));
  return 1 - wave;
}

function shouldRemoveForTexture(
  x: number,
  y: number,
  time: number,
  edge: number,
  settings: StencilSettings,
): boolean {
  const density = clamp01(settings.textureDensity);
  if (density <= 0) {
    return false;
  }

  const textureTime = settings.flowEnabled ? time * settings.flowSpeed : 0;
  const holes = waveNoise(x, y, textureTime, settings.textureScale);
  const lines = lineField(x, y, textureTime, settings.textureScale);
  const mixed = settings.textureType === "holes"
    ? holes
    : settings.textureType === "lines"
      ? lines
      : holes * 0.58 + lines * 0.42;

  const edgeAllowance = edge * clamp01(settings.edgeEmphasis) * 0.24;
  return mixed > 1 - density * 0.72 - edgeAllowance;
}

function writePixel(
  data: Uint8ClampedArray,
  index: number,
  color: Rgba,
): void {
  data[index] = color.r;
  data[index + 1] = color.g;
  data[index + 2] = color.b;
  data[index + 3] = color.a;
}

export function renderStencilImageData({
  source,
  settings,
  time,
}: StencilRenderInput): ImageData {
  const output = new ImageData(source.width, source.height);
  const foreground = parseHexColor(settings.foregroundColor);
  const background = getBackgroundColor(settings);
  const breathing = settings.breathingEnabled
    ? Math.sin((time / settings.animationDuration) * Math.PI * 2)
      * settings.breathingAmplitude
    : 0;
  const threshold = clamp(settings.threshold + breathing);

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = (y * source.width + x) * 4;
      const lightness = luminance(source.data, index);
      const selected = settings.invert
        ? lightness >= threshold
        : lightness <= threshold;
      const edge = edgeStrength(source.data, source.width, source.height, x, y);
      const removed = selected
        ? shouldRemoveForTexture(x, y, time, edge, settings)
        : true;

      writePixel(
        output.data,
        index,
        selected && !removed ? foreground : background,
      );
    }
  }

  return output;
}
