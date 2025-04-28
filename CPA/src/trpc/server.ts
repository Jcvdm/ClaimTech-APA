import "server-only";
import SuperJSON from 'superjson';
import { headers } from 'next/headers';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

import { type AppRouter } from '@/server/api/root';

function getBaseUrl() {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const api = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      async headers() {
        const heads = new Headers(await headers());
        heads.set('x-trpc-source', 'rsc');
        return Object.fromEntries(heads);
      },
      transformer: SuperJSON,
    }),
  ],
});
