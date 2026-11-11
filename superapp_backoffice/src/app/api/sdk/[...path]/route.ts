import { passThroughToRegistry } from '@/lib/registryPassthrough';

// npm registry for partners (@fsasuperapp scope): registry=https://<host>/api/sdk/
// More specific than /api/[...proxy], so it does not go through the login-cookie proxy.
async function handle(request: Request) {
  // The raw path, still encoded (npm sends scoped names as @scope%2fname)
  return passThroughToRegistry(request, new URL(request.url).pathname.slice(1));
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const DELETE = handle;
export const dynamic = 'force-dynamic';
