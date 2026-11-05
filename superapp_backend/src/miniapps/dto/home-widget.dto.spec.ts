import 'reflect-metadata';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CreateMiniAppDto } from './create-miniapp.dto';
import { UpdateMiniAppDto } from './update-miniapp.dto';

// The same options as the global pipe in src/main.ts.
const pipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const patch = async (body: Record<string, unknown>) =>
  (await pipe.transform(body, {
    type: 'body',
    metatype: UpdateMiniAppDto,
  })) as UpdateMiniAppDto;

const create = async (body: Record<string, unknown>) =>
  (await pipe.transform(
    {
      appId: 'miniapp_ams_ccef3a',
      name: 'AMS',
      ownerEmail: 'owner@example.com',
      integrationMethod: 'DEEP_LINK',
      integrationConfigDeepLink: { urlScheme: 'amsattendance://login' },
      ...body,
    },
    { type: 'body', metatype: CreateMiniAppDto },
  )) as CreateMiniAppDto;

describe('homeWidget DTO field', () => {
  it('PATCH keeps homeWidget.widgetClass through whitelisting', async () => {
    const dto = await patch({ homeWidget: { widgetClass: 'HrHomeWidget' } });
    expect(dto.homeWidget).toMatchObject({ widgetClass: 'HrHomeWidget' });
  });

  it('PATCH keeps null, which clears the widget', async () => {
    const dto = await patch({ homeWidget: null });
    expect(dto).toHaveProperty('homeWidget', null);
  });

  it('PATCH leaves it unset when the body has none', async () => {
    const dto = await patch({ name: 'AMS' });
    expect(dto.homeWidget).toBeUndefined();
  });

  it('PATCH rejects a non-string widgetClass with 400', async () => {
    await expect(
      patch({ homeWidget: { widgetClass: 5 } }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('PATCH strips the legacy homeWidgetType field', async () => {
    const dto = await patch({ name: 'AMS', homeWidgetType: 'hr_summary' });
    expect(dto).not.toHaveProperty('homeWidgetType');
  });

  it('POST /mini-apps keeps homeWidget, accepts null, rejects bad shapes', async () => {
    const dto = await create({ homeWidget: { widgetClass: 'HrHomeWidget' } });
    expect(dto.homeWidget).toMatchObject({ widgetClass: 'HrHomeWidget' });
    expect(await create({ homeWidget: null })).toHaveProperty(
      'homeWidget',
      null,
    );
    await expect(
      create({ homeWidget: { widgetClass: 5 } }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(await create({ homeWidgetType: 'hr_summary' })).not.toHaveProperty(
      'homeWidgetType',
    );
  });
});
