const MP4_MAX_SIDE = 1080;

function even(value: number): number {
  return Math.max(2, Math.floor(value / 2) * 2);
}

export function calculateMp4Dimensions(
  width: number,
  height: number,
): { width: number; height: number } {
  const safeWidth = Math.max(1, Math.floor(width));
  const safeHeight = Math.max(1, Math.floor(height));
  const longestSide = Math.max(safeWidth, safeHeight);
  const scale = longestSide > MP4_MAX_SIDE ? MP4_MAX_SIDE / longestSide : 1;

  return {
    width: even(safeWidth * scale),
    height: even(safeHeight * scale),
  };
}

export function calculateFrameCount(duration: number, frameRate: number): number {
  return Math.max(1, Math.floor(duration * frameRate));
}

export function getFrameTime(frameIndex: number, frameRate: number): number {
  return frameIndex / frameRate;
}
