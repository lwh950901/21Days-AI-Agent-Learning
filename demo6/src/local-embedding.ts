export function createLocalKeywordEmbedder() {
  return async function embed(texts: string[]): Promise<number[][]> {
    return texts.map((text) => embedWithFeatureHashing(text));
  };
}

function embedWithFeatureHashing(text: string) {
  const dimensions = 256;
  const vector = Array.from({ length: dimensions }, () => 0);
  const normalized = text.toLowerCase();
  const terms = normalized
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .flatMap((term) => [term, ...characterBigrams(term)]);

  for (const term of terms) {
    vector[hashTerm(term) % dimensions] += 1;
  }

  return vector;
}

function characterBigrams(term: string) {
  const chars = Array.from(term);
  const bigrams: string[] = [];

  for (let i = 0; i < chars.length - 1; i++) {
    bigrams.push(chars[i] + chars[i + 1]);
  }

  return bigrams;
}

function hashTerm(term: string) {
  let hash = 0;

  for (const char of term) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }

  return hash;
}
