import type { Chunk } from "./types.ts";

type MarkdownSection = {
  headingPath?: string;
  content: string;
};

export function splitMarkdownIntoSections(markdown: string): MarkdownSection[] {
  const lines = markdown.split("\n");
  const sections: MarkdownSection[] = [];

  let currentH1: string | undefined;
  let currentH2: string | undefined;
  let currentH3: string | undefined;
  let currentHeadingPath: string | undefined;
  let currentContent: string[] = [];

  function buildHeadingPath() {
    return [currentH1, currentH2, currentH3].filter(Boolean).join(" > ");
  }

  function pushCurrentSection() {
    const content = currentContent.join("\n").trim();
    if (!content) return;

    // 只有标题、没有正文的 section 不生成 chunk。
    // 例如 H1 下面立刻接 H2 时，H1 只是路径，不是可检索证据。
    const bodyWithoutHeadings = currentContent
      .filter((line) => !/^#{1,6}\s+/.test(line))
      .join("\n")
      .trim();
    if (!bodyWithoutHeadings) return;

    sections.push({ headingPath: currentHeadingPath, content });
  }

  for (const line of lines) {
    const h1Match = line.match(/^#\s+(.+)$/);
    const h2Match = line.match(/^##\s+(.+)$/);
    const h3Match = line.match(/^###\s+(.+)$/);

    if (h1Match || h2Match || h3Match) {
      pushCurrentSection();

      if (h1Match) {
        currentH1 = h1Match[1];
        currentH2 = undefined;
        currentH3 = undefined;
      }

      if (h2Match) {
        currentH2 = h2Match[1];
        currentH3 = undefined;
      }

      if (h3Match) {
        currentH3 = h3Match[1];
      }

      currentHeadingPath = buildHeadingPath();
      currentContent = [line];
    } else {
      currentContent.push(line);
    }
  }

  pushCurrentSection();
  return sections;
}

function splitLongTextBySentence(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text];

  const sentences = text
    .split(/(?<=[。！？.!?])\s*/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return splitByFixedLength(text, maxLength, Math.min(30, Math.floor(maxLength / 5)));
  }

  return packUnits(sentences, maxLength, "\n");
}

function splitByFixedLength(text: string, maxLength: number, overlap: number): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxLength, text.length);
    chunks.push(text.slice(start, end));
    if (end === text.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
}

function packUnits(units: string[], maxLength: number, separator: string): string[] {
  const chunks: string[] = [];
  let currentText = "";

  for (const unit of units) {
    const nextText = currentText ? `${currentText}${separator}${unit}` : unit;

    if (nextText.length > maxLength && currentText) {
      chunks.push(currentText);
      currentText = unit;
    } else if (unit.length > maxLength) {
      chunks.push(...splitLongTextBySentence(unit, maxLength));
      currentText = "";
    } else {
      currentText = nextText;
    }
  }

  if (currentText) chunks.push(currentText);
  return chunks;
}

function splitSectionByParagraph(section: MarkdownSection, maxLength: number): string[] {
  if (section.content.length <= maxLength) return [section.content];

  const paragraphs = section.content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return packUnits(paragraphs, maxLength, "\n\n");
}

export function chunkMarkdown(
  markdown: string,
  options: {
    source: string;
    maxLength: number;
    strategy: "fixed" | "structured" | "recursive";
  },
): Chunk[] {
  const strategy = options.strategy;

  if (strategy === "fixed") {
    const parts = splitByFixedLength(markdown, options.maxLength, 0);
    return parts.map((text, i) => ({
      id: `${options.source}#chunk-${i}`,
      text,
      metadata: {
        source: options.source,
        chunkIndex: i,
        strategy: "fixed",
      },
    }));
  }

  if (strategy === "structured") {
    const sections = splitMarkdownIntoSections(markdown);
    return sections.map((section, i) => ({
      id: `${options.source}#chunk-${i}`,
      text: section.headingPath
        ? `标题路径：${section.headingPath}\n\n${section.content}`
        : section.content,
      metadata: {
        source: options.source,
        headingPath: section.headingPath,
        chunkIndex: i,
        strategy: "structured",
      },
    }));
  }

  // recursive: 标题路径 + 段落递归切分
  const sections = splitMarkdownIntoSections(markdown);
  const chunks: Chunk[] = [];

  for (const section of sections) {
    const sectionChunks = splitSectionByParagraph(section, options.maxLength);

    for (const sectionChunk of sectionChunks) {
      const headingPrefix = section.headingPath
        ? `标题路径：${section.headingPath}\n\n`
        : "";

      chunks.push({
        id: `${options.source}#chunk-${chunks.length}`,
        text: `${headingPrefix}${sectionChunk}`,
        metadata: {
          source: options.source,
          headingPath: section.headingPath,
          chunkIndex: chunks.length,
          strategy: "recursive",
        },
      });
    }
  }

  return chunks;
}
