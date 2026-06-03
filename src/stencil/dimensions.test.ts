import { describe, expect, it } from "vitest";
import {
  calculateFrameCount,
  calculateMp4Dimensions,
  getFrameTime,
} from "./dimensions";

describe("calculateMp4Dimensions", () => {
  it("caps a landscape image at a 1080px longest side", () => {
    expect(calculateMp4Dimensions(2400, 1200)).toEqual({
      width: 1080,
      height: 540,
    });
  });

  it("caps a portrait image at a 1080px longest side", () => {
    expect(calculateMp4Dimensions(1200, 2400)).toEqual({
      width: 540,
      height: 1080,
    });
  });

  it("does not upscale small images", () => {
    expect(calculateMp4Dimensions(640, 480)).toEqual({
      width: 640,
      height: 480,
    });
  });

  it("keeps dimensions even for AVC compatibility", () => {
    expect(calculateMp4Dimensions(333, 111)).toEqual({
      width: 332,
      height: 110,
    });
  });
});

describe("frame timing", () => {
  it("calculates frame count without duplicating the loop endpoint", () => {
    expect(calculateFrameCount(3, 12)).toBe(36);
    expect(getFrameTime(35, 12)).toBeCloseTo(35 / 12);
  });
});
