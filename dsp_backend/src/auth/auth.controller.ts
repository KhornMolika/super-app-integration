import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: any) {
    if (body.email && body.password) {
      // Create a mock user based on email (for PoC)
      const mockUser = {
        id: 'user-123',
        email: body.email,
        name: body.email.split('@')[0],
        role: 'user'
      };
      
      const tokens = this.authService.login(mockUser);
      return { success: true, message: 'Logged in successfully', ...tokens };
    }
    return { success: false, message: 'Invalid credentials' };
  }

  @Get('jwks')
  getJwks() {
    return this.authService.getJwks();
  }
}
