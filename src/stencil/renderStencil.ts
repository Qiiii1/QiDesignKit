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

function mixColor(from: Rgba, to: Rgba, amount: number): Rgba {
  const safeAmount = clamp01(amount);
  const inverse = 1 - safeAmount;
  return {
    r: Math.round(from.r * inverse + to.r * safeAmount),
    g: Math.round(from.g * inverse + to.g * safeAmount),
    b: Math.round(from.b * inverse + to.b * safeAmount),
    a: Math.round(from.a * inverse + to.a * safeAmount),
  };
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

function dotField(x: number, y: number, time: number, scale: number): number {
  const cellSize = Math.max(3, scale * 0.42);
  const shiftedX = x + time * cellSize * 0.62;
  const shiftedY = y - time * cellSize * 0.38;
  const cellX = Math.floor(shiftedX / cellSize);
  const cellY = Math.floor(shiftedY / cellSize);
  const offsetX = hash2d(cellX, cellY, 1) - 0.5;
  const offsetY = hash2d(cellX, cellY, 2) - 0.5;
  const centerX = (cellX + 0.5 + offsetX * 0.56) * cellSize;
  const centerY = (cellY + 0.5 + offsetY * 0.56) * cellSize;
  const radius = cellSize * (0.12 + hash2d(cellX, cellY, 3) * 0.2);
  const distance = Math.hypot(shiftedX - centerX, shiftedY - centerY);

  return distance <= radius ? 1 : hash2d(cellX, cellY, 4) * 0.42;
}

function grainField(x: number, y: number, time: number, scale: number): number {
  const grainSize = Math.max(1, Math.round(scale / 18));
  const gx = Math.floor((x + time * scale * 1.7) / grainSize);
  const gy = Math.floor((y - time * scale * 1.1) / grainSize);
  const fine = hash2d(gx, gy);
  const soft = waveNoise(x, y, time, Math.max(4, scale * 0.7));

  return fine * 0.78 + soft * 0.22;
}

function contourField(x: number, y: number, time: number, scale: number): number {
  const safeScale = Math.max(4, scale);
  const warp = waveNoise(x + 31, y - 17, time * 0.45, safeScale * 0.85);
  const phase = (x * 0.31 + y * 0.47) / safeScale
    + warp * 1.65
    + time * 0.22;
  const contour = Math.abs(Math.sin(phase * Math.PI * 2));

  return 1 - contour;
}

function meshField(x: number, y: number, time: number, scale: number): number {
  const primary = lineField(x, y, time * 0.8, scale);
  const secondary = lineField(x * 0.9, -y * 1.1, -time * 0.55, scale * 0.86);
  const woven = waveNoise(x, y, time * 0.4, scale * 0.72);

  return Math.max(primary, secondary) * 0.82 + woven * 0.18;
}

function crackField(x: number, y: number, time: number, scale: number): number {
  const safeScale = Math.max(4, scale);
  const branchA = 1 - Math.abs(Math.sin((
    x * 0.88
    + y * 0.24
    + waveNoise(x, y, time * 0.7, safeScale * 0.7) * safeScale
  ) / safeScale * Math.PI));
  const branchB = 1 - Math.abs(Math.sin((
    x * -0.36
    + y * 0.94
    + waveNoise(x + 53, y - 29, time * 0.54, safeScale) * safeScale * 0.8
  ) / Math.max(4, safeScale * 1.35) * Math.PI));
  const gate = waveNoise(x - 11, y + 7, time * 0.33, safeScale * 1.2);

  return Math.max(branchA, branchB * 0.9) * (0.58 + gate * 0.42);
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
  const mixed = holes * 0.48
    + lines * 0.28
    + dotField(x, y, textureTime, settings.textureScale) * 0.12
    + contourField(x, y, textureTime, settings.textureScale) * 0.12;
  const texture = settings.textureType === "holes"
    ? holes
    : settings.textureType === "lines"
      ? lines
      : settings.textureType === "dots"
        ? dotField(x, y, textureTime, settings.textureScale)
        : settings.textureType === "grain"
          ? grainField(x, y, textureTime, settings.textureScale)
          : settings.textureType === "contours"
            ? contourField(x, y, textureTime, settings.textureScale)
            : settings.textureType === "mesh"
              ? meshField(x, y, textureTime, settings.textureScale)
              : settings.textureType === "cracks"
                ? crackField(x, y, textureTime, settings.textureScale)
                : mixed;

  const edgeAllowance = edge * clamp01(settings.edgeEmphasis) * 0.24;
  return texture > 1 - density * 0.72 - edgeAllowance;
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

function diffusionLineBand(
  source: ImageData,
  x: number,
  y: number,
  timeOffset: number,
  edge: number,
  settings: StencilSettings,
): number {
  const spacing = Math.max(4, settings.diffusionLineSpacing);
  const strength = clamp01(settings.diffusionStrength);
  const direction = gradientDirection(
    source.data,
    source.width,
    source.height,
    x,
    y,
  );
  const directional = (x * direction.x + y * direction.y) / spacing;
  const secondary = (x * 0.34 + y * 0.86) / spacing;
  const branch = (x * -0.82 + y * 0.29) / Math.max(4, spacing * 1.35);
  const organic = waveNoise(
    x + edge * spacing * 4.5,
    y - edge * spacing * 2.6,
    timeOffset,
    Math.max(4, spacing * (1.55 - strength * 0.58)),
  ) - 0.5;
  const branchNoise = waveNoise(
    x + 37,
    y - 19,
    timeOffset * 0.72,
    Math.max(4, spacing * 0.86),
  ) - 0.5;
  const phase = directional * (0.78 + strength * 0.44)
    + secondary * 0.32
    + branch * branchNoise * strength * 0.9
    + organic * strength * 3.4
    + timeOffset * 0.85;

  return Math.abs(Math.sin(phase * Math.PI));
}

function diffusionBranchBand(
  x: number,
  y: number,
  timeOffset: number,
  settings: StencilSettings,
): number {
  const spacing = Math.max(4, settings.diffusionLineSpacing);
  const strength = clamp01(settings.diffusionStrength);
  const phase = (
    x * -0.66
    + y * 1.04
    + waveNoise(x, y, timeOffset * 0.55, spacing * 1.25) * spacing * strength
  ) / Math.max(4, spacing * 1.46);
  return Math.abs(Math.sin((phase + timeOffset * 0.42) * Math.PI));
}

function hasDiffusionChannel(
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
  const band = diffusionLineBand(source, x, y, timeOffset, edge, settings);
  const branchBand = diffusionBranchBand(x, y, timeOffset, settings);
  const channelThreshold = clamp01(
    (lineWidth / spacing) * (0.82 + strength * 0.3) + edge * 0.12,
  );
  const branchThreshold = channelThreshold * (0.52 + strength * 0.24);
  const branchGate = waveNoise(
    x + 11,
    y - 23,
    timeOffset * 0.8,
    Math.max(4, spacing * 1.1),
  ) > 0.52 - strength * 0.12;

  return band <= channelThreshold
    || (branchGate && branchBand <= branchThreshold);
}

function hasDiffusionTrail(
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
  const band = diffusionLineBand(source, x, y, timeOffset, edge, settings);
  const branchBand = diffusionBranchBand(x, y, timeOffset, settings);
  const channelThreshold = clamp01(
    (lineWidth / spacing) * (0.82 + strength * 0.3) + edge * 0.12,
  );
  const trailThreshold = clamp01(channelThreshold + 0.1 + strength * 0.08);
  const branchTrailThreshold = clamp01(channelThreshold + 0.04 + strength * 0.07);

  return band <= trailThreshold || branchBand <= branchTrailThreshold;
}

function renderDiffusionMode(
  source: ImageData,
  settings: StencilSettings,
  time: number,
): ImageData {
  const output = new ImageData(source.width, source.height);
  const foreground = parseHexColor(settings.foregroundColor);
  const background = getBackgroundColor(settings);
  const trailColor = mixColor(background.a === 0
    ? { ...foreground, a: 0 }
    : background, foreground, 0.28);
  const threshold = getAnimatedThreshold(settings, time);
  const timeOffset = settings.flowEnabled ? time * settings.flowSpeed : 0;
  const growth = getDiffusionGrowth(settings, time);

  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      const index = (y * source.width + x) * 4;
      const selected = source.data[index + 3] > 8
        && isSelected(source, index, threshold, settings);
      if (!selected) {
        writePixel(output.data, index, background);
        continue;
      }

      const edge = edgeStrength(source.data, source.width, source.height, x, y);
      const revealed = isRevealedByGrowth(
        x,
        y,
        source.width,
        source.height,
        growth,
        settings,
      );
      if (!revealed) {
        writePixel(output.data, index, foreground);
        continue;
      }

      const channel = hasDiffusionChannel(source, x, y, timeOffset, edge, settings);
      const dot = hasDiffusionDot(x, y, timeOffset, edge, settings);
      const stableEdge = edge > 0.36;
      const trail = !stableEdge
        && !channel
        && !dot
        && hasDiffusionTrail(source, x, y, timeOffset, edge, settings);

      writePixel(
        output.data,
        index,
        !stableEdge && (channel || dot)
          ? background
          : trail
            ? trailColor
            : foreground,
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
