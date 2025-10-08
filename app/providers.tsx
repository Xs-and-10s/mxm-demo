// app/providers.tsx
// "use client";

// import { type ReactNode, useMemo } from "react";
// import { Provider as UrqlProvider } from "urql";
// import { makeUrqlClient } from "@/lib/urql-client";
// import { env } from "@/lib/env";

// export default function Providers({ children }: { children: ReactNode }) {
//   const client = useMemo(() => makeUrqlClient(env.GRAPHQL_ENDPOINT), []);
//   return <UrqlProvider value={client}>{children}</UrqlProvider>;
// }
