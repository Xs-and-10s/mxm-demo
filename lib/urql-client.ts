// lib/urql-client.ts
"use client";

import { createClient, cacheExchange, fetchExchange, ssrExchange } from "urql";

const isServer = typeof window === "undefined";
const ssr = ssrExchange({ isClient: !isServer });

export function makeUrqlClient(url: string) {
  return createClient({
    url,
    exchanges: [cacheExchange, ssr, fetchExchange],
    fetchOptions: () => ({
      credentials: "include", // adjust if you use cookies/session
      headers: { "content-type": "application/json" }
    })
  });
}

export const urqlSsr = ssr; // for extracting data in RSC if/when needed