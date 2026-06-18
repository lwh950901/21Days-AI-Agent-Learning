# Vector Store Choice

This demo uses an in-memory vector store so the RAG chain is easy to inspect:

```text
embed chunks
-> store vectors in memory
-> embed query
-> cosine similarity
-> topK results
```

It is not the final production choice.

## Practical Options

| Option | Best for | Tradeoff |
|---|---|---|
| In-memory | learning, tests, local demo | not persistent, not scalable |
| Chroma | local prototyping, quick demos | weaker production story |
| pgvector | app already uses Postgres, needs transactional data + vectors | requires DB operations and indexing knowledge |
| Pinecone | managed vector search, production scale | external service cost and vendor dependency |

## Recommended Portfolio Story

For this module:

```text
first: in-memory store to prove the chain
next: pgvector if the app already has Postgres
later: Pinecone if managed scaling is more important than DB simplicity
```

## Interview Answer

> I would not choose a vector database only by popularity. For a learning demo I use an in-memory store because it makes the retrieval logic visible. For a production app that already uses Postgres, pgvector is often a good first choice because documents, chunks, metadata, and vectors can live in one database. If scale, managed operations, or specialized vector features become more important, I would evaluate Pinecone or another managed vector service.
