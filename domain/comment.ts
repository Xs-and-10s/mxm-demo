// domain/comments.ts
import { type } from "arktype";

export const CommentSchema = type({
  id: "string > 0",
  author: "string > 0",
  message: "string > 0",
  ts: "Date",
});

export type CommentT = typeof CommentSchema.infer;