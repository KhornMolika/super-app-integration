import { passThroughToRegistry } from '@/lib/registryPassthrough';

// The web Super App shown in the device preview: the newest build Jenkins
// (superapp-sandbox-build) published to Nexus, served by the backend. Nothing
// is stored here, so a new build shows up without redeploying the Back Office.
async function handle(request: Request) {
  const rest = new URL(request.url).pathname.replace(/^\/superapp-sandbox\/?/, '').replace(/\/+$/, '');
  return passThroughToRegistry(request, rest ? `superapp-web/${rest}` : 'superapp-web', {
    'x-superapp-web-base': '/superapp-sandbox/',
  });
}

export const GET = handle;
export const HEAD = handle;
export const dynamic = 'force-dynamic';
