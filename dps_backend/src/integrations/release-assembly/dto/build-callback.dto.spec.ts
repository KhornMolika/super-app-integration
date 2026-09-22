import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BuildCallbackDto } from './release-assembly-verification.dto';

const check = (status: unknown) =>
  validate(
    plainToInstance(BuildCallbackDto, { releaseVersion: 'v1.0.0', status }),
  );

describe('BuildCallbackDto.status', () => {
  it.each(['COMPLETED', 'SUCCESS', 'FAILED', 'FAILURE', 'ABORTED'])(
    'accepts %s',
    async (status) => {
      expect(await check(status)).toHaveLength(0);
    },
  );

  it.each(['', 'ok', 'completed', 'PENDING', 'RUNNING', 'x'.repeat(40)])(
    'rejects %p so a stray POST cannot abort in-flight builds',
    async (status) => {
      const errors = await check(status);
      expect(errors.map((e) => e.property)).toContain('status');
    },
  );

  it('rejects a missing status', async () => {
    const errors = await validate(
      plainToInstance(BuildCallbackDto, { releaseVersion: 'v1.0.0' }),
    );
    expect(errors.map((e) => e.property)).toContain('status');
  });
});
