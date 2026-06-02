export interface TextUnit {
  text: string;
  tokenCost: 0 | 1;
}

const HAN_CHARACTER = /^\p{Script=Han}$/u;
const LETTER_OR_NUMBER = /^[\p{L}\p{N}]$/u;
const WHITESPACE = /^\s$/u;

function tokenizeDisplayUnits(text: string): TextUnit[] {
  const units: TextUnit[] = [];
  let word = "";

  const appendWord = () => {
    if (word.length > 0) {
      units.push({ text: word, tokenCost: 1 });
      word = "";
    }
  };

  for (const character of text) {
    if (HAN_CHARACTER.test(character)) {
      appendWord();
      units.push({ text: character, tokenCost: 1 });
    } else if (LETTER_OR_NUMBER.test(character)) {
      word += character;
    } else {
      appendWord();
      if (!WHITESPACE.test(character)) {
        units.push({ text: character, tokenCost: 0 });
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
