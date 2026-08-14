import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { MiniappService } from './miniapp.service';
import { CreateMiniAppDto } from './dto/create-miniapp.dto';
import { UpdateMiniAppDto } from './dto/update-miniapp.dto';

@Controller('mini-apps')
export class MiniappController {
  constructor(private readonly miniappService: MiniappService) {}

  @Post()
  create(@Body() createData: CreateMiniAppDto) {
    const dataToSave: any = { ...createData };
    if (createData.integrationMethod === 'WEBVIEW') {
      dataToSave.integrationConfig = createData.integrationConfigWebView;
    } else if (createData.integrationMethod === 'FLUTTER_PACKAGE') {
      dataToSave.integrationConfig = createData.integrationConfigFlutter;
    }
    
    // Clean up DTO specific fields
    delete dataToSave.integrationConfigWebView;
    delete dataToSave.integrationConfigFlutter;

    return this.miniappService.create(dataToSave);
  }

  @Get()
  findAll(@Query('status') status?: string) {
    const query = status ? { status } : {};
    return this.miniappService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.miniappService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateData: UpdateMiniAppDto) {
    const dataToSave: any = { ...updateData };
    if (updateData.integrationMethod === 'WEBVIEW') {
      dataToSave.integrationConfig = updateData.integrationConfigWebView;
    } else if (updateData.integrationMethod === 'FLUTTER_PACKAGE') {
      dataToSave.integrationConfig = updateData.integrationConfigFlutter;
    }
    
    // Clean up DTO specific fields
    delete dataToSave.integrationConfigWebView;
    delete dataToSave.integrationConfigFlutter;

    return this.miniappService.update(id, dataToSave);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.miniappService.remove(id);
  }
}
