import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() body: any) {
    if (body.email && body.password) {
      // In a real app we'd check password here. For this POC, just fetch user by email.
      return this.authService.login(body);
    }
    return { success: false, message: 'Invalid credentials' };
  }

  @Get('jwks')
  getJwks() {
    return this.authService.getJwks();
  }
}
