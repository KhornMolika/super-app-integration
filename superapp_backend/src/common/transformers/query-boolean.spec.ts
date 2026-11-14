import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { QueryBoolean } from './query-boolean';
import { QueryMiniAppsDto } from '../../miniapps/dto/query-miniapps.dto';
import { QueryNotificationsDto } from '../../notifications/dto/query-notifications.dto';
import { QueryRolesDto } from '../../access-control/dto/query-roles.dto';
import { QueryCapabilitiesDto } from '../../capabilities/dto/query-capabilities.dto';

class Probe {
  @IsOptional()
  @QueryBoolean()
  @IsBoolean()
  flag?: boolean;
}

// Same options as the global ValidationPipe in main.ts
const parse = <T>(cls: new () => T, plain: object) =>
  plainToInstance(cls, plain, { enableImplicitConversion: true });

describe('QueryBoolean', () => {
  it.each([
    ['true', true],
    ['1', true],
    [true, true],
    ['false', false],
    ['0', false],
    ['', undefined],
    ['yes', undefined],
    [false, false],
  ])('%p -> %p', (raw, expected) => {
    expect(parse(Probe, { flag: raw }).flag).toBe(expected);
  });

  it('mine=false lists every app in reach, not only my own', () => {
    const q = parse(QueryMiniAppsDto, { mine: 'false', includeArchived: 'false' });
    expect(q.mine).toBe(false);
    expect(q.includeArchived).toBe(false);
    expect(parse(QueryMiniAppsDto, { mine: 'true' }).mine).toBe(true);
  });

  it('absent means no filter', () => {
    expect(parse(Probe, {}).flag).toBeUndefined();
    expect(parse(QueryRolesDto, {}).isActive).toBeUndefined();
    expect(parse(QueryRolesDto, { isActive: 'false' }).isActive).toBe(false);
    expect(parse(QueryCapabilitiesDto, { isActive: 'false' }).isActive).toBe(false);
  });

  it('applies to notification queries too', () => {
    expect(parse(QueryNotificationsDto, { isRead: 'false' }).isRead).toBe(false);
    expect(parse(QueryNotificationsDto, { isRead: 'true' }).isRead).toBe(true);
  });
});
