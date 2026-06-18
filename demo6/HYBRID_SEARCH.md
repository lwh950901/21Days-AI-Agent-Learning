# Hybrid Search

Hybrid Search combines semantic retrieval and keyword retrieval.

```text
finalScore = vectorScore * 0.7 + keywordScore * 0.3
```

In this demo:

- `vectorScore`: cosine similarity between query embedding and chunk embedding.
- `keywordScore`: exact keyword overlap between query and chunk text.
- `finalScore`: the score used for sorting and `minScore` filtering.

## Why It Matters

Vector search is good for semantic similarity:

```text
query: 怎么重置账号密码？
doc: 用户可以在账号安全中修改密码。
```

Keyword search is better for exact identifiers:

```text
query: 错误码 E1024 是什么意思？
doc: E1024：用户 token 已过期，请重新登录。
```

Pure vector search may return semantically similar but wrong chunks. Keyword search can directly match `E1024`.

## Interview Answer

> I use Hybrid Search when a knowledge base contains both natural language concepts and exact identifiers. Vector search handles semantic similarity, such as "reset password" matching "modify password". Keyword search handles exact terms, such as error codes, API names, order numbers, and contract clauses.
>
> In a simple implementation, I compute both vectorScore and keywordScore, then combine them into a final score. In production I may use BM25 plus vector search, then rerank the merged candidates.
