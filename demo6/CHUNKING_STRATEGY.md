# Chunking Strategy

## Fixed Chunking

Fixed chunking cuts text by a fixed character or token length.

- Good for: quick baseline, unstructured text.
- Risk: can cut through headings, paragraphs, sentences, or table rows.
- Engineering note: use overlap to reduce boundary loss, but too much overlap creates duplicate chunks.

## Structured Chunking

Structured chunking uses natural document boundaries, such as headings, paragraphs, list items, FAQ pairs, or log events.

- Good for: Markdown, policy docs, FAQ, technical docs, contracts, logs with timestamps.
- Risk: one section can still be too long.
- Engineering note: keep metadata such as source and headingPath.

## Recursive Chunking

Recursive chunking tries larger semantic boundaries first, then falls back only when needed:

```text
heading
-> paragraph
-> list item
-> sentence
-> fixed token / character length
```

This demo implements the first practical version:

```text
H1/H2/H3 headingPath
-> paragraph
-> sentence / fixed length fallback
```

## Interview Answer

> I do not start chunking by asking only "how many tokens?" I first check what structure the document already has. If it has headings, FAQ pairs, paragraphs, list items, or log boundaries, I use those as primary boundaries. If a section is still too long, I recursively split it into smaller semantic units, and only use fixed token or character length as the last fallback.
>
> This keeps chunks semantically complete while still controlling context size and retrieval noise.
