import { MiniappValidationHelper } from './miniapp-validation.helper';

/**
 * The Jenkins watchdog must not leave a scan RUNNING forever when Jenkins
 * finished but its results never reached the backend (e.g. callback 401).
 */
describe('MiniappValidationHelper Jenkins watchdog', () => {
  let app: any;
  let status: any;
  let helper: any;
  let repo: any;

  beforeEach(() => {
    jest.useFakeTimers();
    app = { id: 'a1', validationStatus: 'RUNNING', validationStages: { ingest: { status: 'RUNNING' } } };
    repo = {
      findOne: jest.fn(async () => app),
      update: jest.fn(async (_id: string, patch: any) => Object.assign(app, patch)),
      save: jest.fn(async (v: any) => Object.assign(app, v)),
    };
    const jenkins = { getJobBuildStatus: jest.fn(async () => status) };
    const none = {} as any;
    helper = new (MiniappValidationHelper as any)(
      repo, none, none, none, none, none, none, none, none, none, jenkins, none,
    );
  });
  afterEach(() => jest.useRealTimers());

  const tick = async (polls: number) => {
    for (let i = 0; i < polls; i++) await jest.advanceTimersByTimeAsync(3000);
  };

  it('fails the scan with the 401 reason when Jenkins finished but the callback was refused', async () => {
    status = { available: true, building: false, result: 'SUCCESS', miniAppId: 'a1', consoleText: 'Final callback HTTP status: 401' };
    helper.monitorJenkinsValidation('a1', 'WEBVIEW');
    await tick(9);
    expect(app.validationStatus).toBe('RUNNING'); // grace period for a late callback
    await tick(2);
    expect(app.validationStatus).toBe('FAILED');
    expect(JSON.stringify(app)).toContain('CALLBACK_TOKEN');
  });

  it('leaves the scan alone when the result arrives during the grace period', async () => {
    status = { available: true, building: false, result: 'SUCCESS', miniAppId: 'a1', consoleText: '' };
    helper.monitorJenkinsValidation('a1', 'WEBVIEW');
    await tick(3);
    app.validationStatus = 'PASSED';
    await tick(20);
    expect(app.validationStatus).toBe('PASSED');
  });

  it("ignores another app's build (ours may still be queued)", async () => {
    status = { available: true, building: false, result: 'SUCCESS', miniAppId: 'other', consoleText: 'status: 401' };
    helper.monitorJenkinsValidation('a1', 'WEBVIEW');
    await tick(30);
    expect(app.validationStatus).toBe('RUNNING');
  });
});
