import { passThroughToRegistry } from '@/lib/registryPassthrough';

// Dart pub registry for partners: `dart pub token add https://<host>/pub`
// dart pub asks for /pub/api/packages/<name> and /pub/packages/<name>/versions/<v>.tar.gz
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
