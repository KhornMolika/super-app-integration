import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { BypassTransform } from '../common/decorators/bypass-transform.decorator';
import { SuperAppWebService } from './superapp-web.service';
import { cleanArchivePath } from './tar.util';

const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'application/javascript; charset=utf-8',
  mjs: 'application/javascript; charset=utf-8',
  json: 'application/json; charset=utf-8',
  css: 'text/css; charset=utf-8',
  wasm: 'application/wasm',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  ttf: 'font/ttf',
  otf: 'font/otf',
  woff: 'font/woff',
  woff2: 'font/woff2',
  txt: 'text/plain; charset=utf-8',
  bin: 'application/octet-stream',
  frag: 'text/plain; charset=utf-8',
};

/** Where the page is served: set by the Backoffice (/superapp-sandbox/) and the /preview/ pod. */
const BASE_HEADER = 'x-superapp-web-base';
const SAFE_BASE = /^\/[a-z0-9-]{1,40}\/$/;

/**
 * Serves the newest web Super App build (see SuperAppWebService). Public, like
 * any web app: it holds no secrets, and the app signs users in itself. Reached
 * in the cluster through the Backoffice (/superapp-sandbox/) and the client pod
 * (/preview/); each sets the base path the page must use.
 */
@Controller(['superapp-web', 'api/superapp-web'])
export class SuperAppWebController {
  constructor(private readonly web: SuperAppWebService) {}

  @Get('-/info')
  @BypassTransform()
  async info() {
    const build = await this.web.getBuild();
    return build ? { available: true, ...build.info, files: build.files.size } : { available: false };
  }

  @Get()
  @BypassTransform()
  root(@Req() req: Request, @Res() res: Response) {
    return this.serve('', req, res);
  }

  @Get('*path')
  @BypassTransform()
  file(@Req() req: Request, @Res() res: Response) {
    const rel = (req.path || '').replace(/^\/(?:api\/)?superapp-web\/?/, '');
    return this.serve(rel, req, res);
  }

  private async serve(rel: string, req: Request, res: Response) {
    const build = await this.web.getBuild();
    if (!build) {
      res.status(503).type('text/plain').set('Retry-After', '60')
        .send('No Super App web build has been published yet: run the Jenkins job superapp-sandbox-build.');
      return;
    }
    let decoded: string | null = rel;
    try {
      decoded = decodeURIComponent(rel);
    } catch {
      decoded = null;
    }
    let name = rel === '' ? 'index.html' : decoded === null ? null : cleanArchivePath(decoded);
    if (name && !build.files.has(name) && build.files.has(`${name}/index.html`)) name = `${name}/index.html`;
    let body = name ? build.files.get(name) : undefined;
    if (!body) {
      // In-app routes (no file extension) open the app; missing files are 404
      if (name && /\.[A-Za-z0-9]+$/.test(name)) {
        res.status(404).type('text/plain').send('Not found');
        return;
      }
      name = 'index.html';
      body = build.files.get(name)!;
    }
    const file: string = name ?? 'index.html';

    const ext = (file.split('.').pop() || '').toLowerCase();
    res.set('Content-Type', TYPES[ext] || 'application/octet-stream');
    res.set('X-SuperApp-Web-Build', String(build.info.build));
    res.set('X-Content-Type-Options', 'nosniff');
    if (file === 'index.html') {
      const requested = String(req.headers[BASE_HEADER] || '');
      const base = SAFE_BASE.test(requested)
        ? requested
        : req.path.startsWith('/api/') ? '/api/superapp-web/' : '/superapp-web/';
      body = Buffer.from(body.toString('utf8').replace(/<base href="[^"]*"\s*\/?>/i, `<base href="${base}">`));
      res.set('Cache-Control', 'no-cache');
    } else {
      // Names are not content-hashed: short cache, revalidated after a new build
      res.set('Cache-Control', 'public, max-age=300');
    }
    res.status(200).send(body);
  }
}
