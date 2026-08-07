import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { MiniappService } from './miniapp.service';
import { MiniApp } from './entities/miniapp.entity';

@Controller('mini-apps')
export class MiniappController {
  constructor(private readonly miniappService: MiniappService) {}

  @Post()
  create(@Body() createData: Partial<MiniApp>) {
    return this.miniappService.create(createData);
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
  update(@Param('id') id: string, @Body() updateData: Partial<MiniApp>) {
    return this.miniappService.update(id, updateData);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.miniappService.remove(id);
  }
}
