import { describe, expect, it } from "vitest";
import { prepareTextUnits, tokenizeReadingWords } from "./tokenize";

describe("text tokenization", () => {
  it("extracts Han characters and contiguous letter or number words for reading", () => {
    expect(tokenizeReadingWords("明月，hello world! 光。")).toEqual([
      "明",
      "月",
      "hello",
      "world",
      "光",
    ]);
  });

  it("keeps visible punctuation without charging it against the word limit", () => {
    expect(prepareTextUnits("明月，hello!", 3, false)).toEqual([
      { text: "明", tokenCost: 1 },
      { text: "月", tokenCost: 1 },
      { text: "，", tokenCost: 0 },
      { text: "hello", tokenCost: 1 },
      { text: "!", tokenCost: 0 },
    ]);
  });

  it("cycles full display units until repeat fill reaches its charged limit", () => {
    expect(prepareTextUnits("明月，", 3, true)).toEqual([
      { text: "明", tokenCost: 1 },
      { text: "月", tokenCost: 1 },
      { text: "，", tokenCost: 0 },
      { text: "明", tokenCost: 1 },
    ]);
  });

  it("returns no units for text without charged tokens", () => {
    expect(prepareTextUnits("，！？", 3, true)).toEqual([]);
  });

  it("returns no units for invalid or non-positive word limits", () => {
    expect(prepareTextUnits("明月", Number.NaN, true)).toEqual([]);
    expect(prepareTextUnits("明月", 0, true)).toEqual([]);
    expect(prepareTextUnits("明月", -1, false)).toEqual([]);
  });

  it("floors finite fractional limits before repeat filling", () => {
    expect(prepareTextUnits("明月", 1.9, true)).toEqual([
      { text: "明", tokenCost: 1 },
    ]);
  });
});
