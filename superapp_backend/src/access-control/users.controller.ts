import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccessControlService } from './access-control.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly accessControlService: AccessControlService) {}

  @Get()
  async findAll() {
    return this.accessControlService.findAllUsers();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.accessControlService.findUserById(id);
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.accessControlService.createUser(dto);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.accessControlService.updateUser(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.accessControlService.deleteUser(id);
  }
}
