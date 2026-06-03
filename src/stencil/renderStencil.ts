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

function gradientDirection(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): { x: number; y: number } {
  const dx = sampleLuminance(data, width, height, x + 1, y)
    - sampleLuminance(data, width, height, x - 1, y);
  const dy = sampleLuminance(data, width, height, x, y + 1)
    - sampleLuminance(data, width, height, x, y - 1);
  const magnitude = Math.hypot(dx, dy);
  if (magnitude < 0.001) {
    const angle = Math.sin(x * 0.021 + y * 0.037) * Math.PI;
    return { x: Math.cos(angle), y: Math.sin(angle) };
  }

  return { x: -dy / magnitude, y: dx / magnitude };
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

function fract(value: number): number {
  return value - Math.floor(value);
}

function hash2d(x: number, y: number, seed = 0): number {
  return fract(Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453);
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

function isSelected(
  source: ImageData,
  index: number,
  threshold: number,
  settings: StencilSettings,
): boolean {
  const lightness = luminance(source.data, index);
  return settings.invert
    ? lightness >= threshold
    : lightness <= threshold;
}

function getAnimatedThreshold(settings: StencilSettings, time: number): number {
  const breathing = settings.breathingEnabled
    ? Math.sin((time / settings.animationDuration) * Math.PI * 2)
      * settings.breathingAmplitude
    : 0;
  return clamp(settings.threshold + breathing);
}

function renderStencilMode(
  source: ImageData,
  settings: StencilSettings,
  time: number,
): ImageData {
  const output = new ImageData(source.width, source.height);
  const foreground = parseHexColor(settings.foregroundColor);
  const background = getBackgroundColor(settings);
  const threshold = getAnimatedThreshold(settings, time);

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = (y * source.width + x) * 4;
      const selected = isSelected(source, index, threshold, settings);
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

function getDiffusionGrowth(settings: StencilSettings, time: number): number {
  const fixedGrowth = clamp01(settings.diffusionGrowth);
  if (!settings.flowEnabled) {
    return fixedGrowth;
  }

  const duration = Math.max(0.001, settings.animationDuration);
  const animatedGrowth = (time % duration) / duration;
  return clamp01(Math.max(fixedGrowth, animatedGrowth));
}

function isRevealedByGrowth(
  x: number,
  y: number,
  width: number,
  height: number,
  growth: number,
  settings: StencilSettings,
): boolean {
  const normalizedX = width <= 1 ? 0 : x / (width - 1);
  const normalizedY = height <= 1 ? 0 : y / (height - 1);
  const organic = waveNoise(
    x,
    y,
    0,
    Math.max(10, settings.diffusionLineSpacing * 1.7),
  ) - 0.5;
  const revealValue = normalizedX * 0.5 + normalizedY * 0.5 + organic * 0.18;
  return revealValue <= growth + 0.08;
}

function hasDiffusionDot(
  x: number,
  y: number,
  timeOffset: number,
  edge: number,
  settings: StencilSettings,
): boolean {
  const density = clamp01(settings.diffusionDotDensity);
  if (density <= 0) {
    return false;
  }

  const spacing = Math.max(4, settings.diffusionLineSpacing);
  const cellSize = Math.max(3, spacing * (1.18 - density * 0.44));
  const shiftedX = x + timeOffset * spacing * 0.36;
  const shiftedY = y - timeOffset * spacing * 0.22;
  const cellX = Math.floor(shiftedX / cellSize);
  const cellY = Math.floor(shiftedY / cellSize);
  const random = hash2d(cellX, cellY);
  const dotChance = density * (0.72 + edge * 0.62);
  if (random > dotChance) {
    return false;
  }

  const offsetX = hash2d(cellX, cellY, 1) - 0.5;
  const offsetY = hash2d(cellX, cellY, 2) - 0.5;
  const centerX = (cellX + 0.5 + offsetX * 0.58) * cellSize;
  const centerY = (cellY + 0.5 + offsetY * 0.58) * cellSize;
  const radius = Math.max(0.7, settings.diffusionLineWidth * 0.58 + density * 1.7);

  return Math.hypot(shiftedX - centerX, shiftedY - centerY) <= radius;
}

function hasDiffusionLine(
  source: ImageData,
  x: number,
  y: number,
  timeOffset: number,
  edge: number,
  settings: StencilSettings,
): boolean {
  const spacing = Math.max(4, settings.diffusionLineSpacing);
  const lineWidth = Math.max(0.2, settings.diffusionLineWidth);
  const strength = clamp01(settings.diffusionStrength);
  const direction = gradientDirection(
    source.data,
    source.width,
    source.height,
    x,
    y,
  );
  const directional = (x * direction.x + y * direction.y) / spacing;
  const secondary = (x * 0.38 + y * 0.91) / spacing;
  const organic = waveNoise(
    x + edge * spacing * 4,
    y - edge * spacing * 2,
    timeOffset,
    Math.max(4, spacing * (1.5 - strength * 0.5)),
  ) - 0.5;
  const phase = directional * (0.76 + strength * 0.42)
    + secondary * 0.34
    + organic * strength * 3.1
    + timeOffset * 0.8;
  const band = Math.abs(Math.sin(phase * Math.PI));
  const threshold = clamp01((lineWidth / spacing) * 1.18 + edge * 0.28);

  return band <= threshold;
}

function renderDiffusionMode(
  source: ImageData,
  settings: StencilSettings,
  time: number,
): ImageData {
  const output = new ImageData(source.width, source.height);
  const foreground = parseHexColor(settings.foregroundColor);
  const background = getBackgroundColor(settings);
  const threshold = getAnimatedThreshold(settings, time);
  const timeOffset = settings.flowEnabled ? time * settings.flowSpeed : 0;
  const growth = getDiffusionGrowth(settings, time);

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = (y * source.width + x) * 4;
      const selected = source.data[index + 3] > 8
        && isSelected(source, index, threshold, settings);
      if (!selected || !isRevealedByGrowth(
        x,
        y,
        source.width,
        source.height,
        growth,
        settings,
      )) {
        writePixel(output.data, index, background);
        continue;
      }

      const edge = edgeStrength(source.data, source.width, source.height, x, y);
      const line = hasDiffusionLine(source, x, y, timeOffset, edge, settings);
      const dot = hasDiffusionDot(x, y, timeOffset, edge, settings);
      const edgeTrace = edge > 0.2 && waveNoise(
        x,
        y,
        timeOffset,
        Math.max(5, settings.diffusionLineSpacing),
      ) > 0.44;

      writePixel(
        output.data,
        index,
        line || dot || edgeTrace ? foreground : background,
      );
    }
  }

  return output;
}

export function renderStencilImageData({
  source,
  settings,
  time,
}: StencilRenderInput): ImageData {
  if (settings.visualMode === "diffusion") {
    return renderDiffusionMode(source, settings, time);
  }

  return renderStencilMode(source, settings, time);
}
