/**
 * Boots the real AppModule (real controllers, guards, services, Postgres)
 * with the same global pipes, filter and interceptors as main.ts. Only
 * Jenkins is faked: it records each trigger, and the tests play Jenkins by
 * posting to the real callback endpoints.
 */
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { JenkinsService } from '../../../src/integrations/jenkins/jenkins.service';
import { AllExceptionsFilter } from '../../../src/common/filters/all-exceptions.filter';
import { TransformInterceptor } from '../../../src/common/interceptors/transform.interceptor';
import { SensitiveFieldsInterceptor } from '../../../src/common/interceptors/sensitive-fields.interceptor';
import { AssetUrlSigningInterceptor } from '../../../src/common/interceptors/asset-url-signing.interceptor';
import { CALLBACK_TOKEN } from './env';

export interface JenkinsCall {
  method: string;
  options: any;
}

/** Records every Jenkins trigger; never talks to a server. */
export class FakeJenkins {
  calls: JenkinsCall[] = [];
  private queue = 100;
  /** Set to make the next trigger fail like an unreachable Jenkins. */
  failNext = false;

  private record(method: string, options: any) {
    this.calls.push({ method, options });
    if (this.failNext) {
      this.failNext = false;
      return { success: false, message: 'Jenkins is unreachable (fake)' };
    }
    return { success: true, message: 'queued (fake)', queueId: ++this.queue };
  }

  callsOf(method: string): JenkinsCall[] {
    return this.calls.filter((c) => c.method === method);
  }

  reset(): void {
    this.calls = [];
    this.failNext = false;
  }

  async triggerMiniAppValidation(o: any) {
    return this.record('triggerMiniAppValidation', o);
  }
  async triggerWebViewValidation(o: any) {
    return this.record('triggerMiniAppValidation', o);
  }
  async triggerPackageValidation(o: any) {
    return this.record('triggerMiniAppValidation', o);
  }
  async triggerNativeSdkValidation(o: any) {
    return this.record('triggerMiniAppValidation', o);
  }
  async triggerDeepLinkValidation(o: any) {
    return this.record('triggerMiniAppValidation', o);
  }
  async triggerSuperAppBuild(o: any) {
    return this.record('triggerSuperAppBuild', o);
  }
  async triggerSuperAppSandboxBuild(o: any) {
    return this.record('triggerSuperAppSandboxBuild', o);
  }
  async getSandboxBuildStatusFromJenkins() {
    return { available: false } as any;
  }
  async getJobBuildStatus() {
    return { available: false } as any;
  }
  async getTestBuildStatusFromJenkins() {
    return { available: false } as any;
  }
  trackTestBuild() {
    return {
      poll: async () => ({ available: false, state: 'pending' }) as any,
    };
  }
}

export interface E2eApp {
  app: INestApplication;
  jenkins: FakeJenkins;
  db: DataSource;
  http: () => ReturnType<typeof request>;
  close: () => Promise<void>;
}

export async function bootApp(): Promise<E2eApp> {
  const jenkins = new FakeJenkins();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(JenkinsService)
    .useValue(jenkins)
    .compile();
  const app = moduleRef.createNestApplication({ logger: ['error'] });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(
    new SensitiveFieldsInterceptor(),
    new AssetUrlSigningInterceptor(),
    new TransformInterceptor(app.get(Reflector)),
  );
  await app.init();
  const db = app.get(DataSource);
  return {
    app,
    jenkins,
    db,
    http: () => request(app.getHttpServer()),
    close: async () => {
      // Background work (scans, notifications) may still be writing: give it a moment
      await new Promise((r) => setTimeout(r, 300));
      await app.close();
    },
  };
}

export const callbackHeaders = { 'x-callback-token': CALLBACK_TOKEN };
