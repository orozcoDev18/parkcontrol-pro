import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';
import { COOKIE_NAME, Role, SESSION_HOURS, SessionPayload } from './token';

class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(8) @MaxLength(72) password!: string;
}

class CreateUserDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(3) @MaxLength(80) name!: string;
  @IsString() @MinLength(8) @MaxLength(72) password!: string;
  @IsOptional() @IsIn(['ADMIN', 'PORTERO']) role?: Role;
}

const isProd = process.env.NODE_ENV === 'production';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { user, token } = await this.auth.login(dto.email, dto.password);
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      // 'lax' porque la web sirve la API bajo su propio /api: la cookie es del
      // mismo sitio que la pagina y asi no viaja en peticiones de otros sitios.
      sameSite: 'lax',
      secure: isProd,
      maxAge: SESSION_HOURS * 3600 * 1000,
      path: '/',
    });
    return user;
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { ok: true };
  }

  @Get('me')
  me(@Req() req: Request & { user: SessionPayload }) {
    const { sub, email, name, role } = req.user;
    return { id: sub, email, name, role };
  }

  @Roles('ADMIN')
  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.auth.createUser(dto);
  }

  @Roles('ADMIN')
  @Get('users')
  listUsers() {
    return this.auth.listUsers();
  }
}
