export interface TextUnit {
  text: string;
  tokenCost: 0 | 1;
}

const GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, {
  granularity: "grapheme",
});
const HAN_CHARACTER = /^\p{Script=Han}/u;
const LETTER_OR_NUMBER = /^[\p{L}\p{N}]/u;
const WHITESPACE = /^\s+$/u;

function needsCycleGap(unit?: TextUnit): boolean {
  return unit !== undefined
    && unit.tokenCost === 1
    && LETTER_OR_NUMBER.test(unit.text)
    && !HAN_CHARACTER.test(unit.text);
}

function tokenizeDisplayUnits(text: string): TextUnit[] {
  const units: TextUnit[] = [];
  let word = "";

  const appendWord = () => {
    if (word.length > 0) {
      units.push({ text: word, tokenCost: 1 });
      word = "";
    }
  };

  for (const { segment: grapheme } of GRAPHEME_SEGMENTER.segment(text)) {
    if (HAN_CHARACTER.test(grapheme)) {
      appendWord();
      units.push({ text: grapheme, tokenCost: 1 });
    } else if (LETTER_OR_NUMBER.test(grapheme)) {
      word += grapheme;
    } else {
      appendWord();
      if (WHITESPACE.test(grapheme)) {
        const previousUnit = units.at(-1);
        if (previousUnit !== undefined && previousUnit.text !== " ") {
          units.push({ text: " ", tokenCost: 0 });
        }
      } else {
        units.push({ text: grapheme, tokenCost: 0 });
      }
    }
  }

  appendWord();
  return units;
}

export function tokenizeReadingWords(text: string): string[] {
  return tokenizeDisplayUnits(text)
    .filter((unit) => unit.tokenCost === 1)
    .map((unit) => unit.text);
}

export function prepareTextUnits(
  text: string,
  maxWords: number,
  repeatFill: boolean,
): TextUnit[] {
  const wordLimit = Number.isFinite(maxWords)
    ? Math.max(0, Math.floor(maxWords))
    : 0;
  if (wordLimit === 0) {
    return [];
  }

  const units = tokenizeDisplayUnits(text);
  if (!units.some((unit) => unit.tokenCost === 1)) {
    return [];
  }

  if (repeatFill) {
    const repeatedUnits: TextUnit[] = [];
    let chargedWords = 0;
    let index = 0;

    while (chargedWords < wordLimit) {
      if (
        index > 0
        && index % units.length === 0
        && needsCycleGap(repeatedUnits.at(-1))
        && needsCycleGap(units[0])
      ) {
        repeatedUnits.push({ text: " ", tokenCost: 0 });
      }
      const unit = units[index % units.length];
      repeatedUnits.push(unit);
      chargedWords += unit.tokenCost;
      index += 1;
    }

    return repeatedUnits;
  }

  const limitedUnits: TextUnit[] = [];
  let chargedWords = 0;

  for (const unit of units) {
    if (unit.tokenCost === 1 && chargedWords >= wordLimit) {
      break;
    }

    limitedUnits.push(unit);
    chargedWords += unit.tokenCost;
  }

  return limitedUnits;
}
