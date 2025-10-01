"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

export type CommentItem = {
  id: string;
  author: string;
  message: string;
  ts: Date; // stored as UTC Date
};

/**
 * Format UTC as: dd-mm-yyyy, hh:ss _M
 * Note: spec requests seconds ("ss") after hour; minutes intentionally omitted.
 */
function fmtUtcDMY(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  let hh = d.getUTCHours();
  const am = hh < 12;
  hh = hh % 12 || 12;
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy}, ${String(hh).padStart(2, "0")}:${ss} ${am ? "AM" : "PM"}`;
}

export default function CommentsThread({ items }: { items: CommentItem[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="rounded-md border p-3 text-sm text-muted-foreground">
        No comments for this work order.
      </div>
    );
  }

  // Oldest → newest
  const sorted = [...items].sort((a, b) => a.ts.getTime() - b.ts.getTime());

  return (
    <ScrollArea className="h-[520px]">
      <div className="space-y-3 pr-2">
        {sorted.map((c) => (
          <article key={c.id} className="rounded-md border">
            {/* Top row: Author (left), Timestamp (right) — no pipe, no separator line */}
            <div className="flex items-start justify-between gap-3 px-3 pt-2">
              <span className="font-medium">{c.author}</span>
              <span className="text-xs text-muted-foreground">{fmtUtcDMY(c.ts)}</span>
            </div>

            {/* Message row (no border between header and body) */}
            <div className="px-3 pb-3 pt-1 text-sm leading-snug">{c.message}</div>
          </article>
        ))}
      </div>
    </ScrollArea>
  );
}
