import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IsEmail, IsIn } from 'class-validator';
import { AuthEmailsService, PASSWORD_PORTALS, PasswordPortal } from './auth-emails.service';

class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email invalide' })
  email: string;

  @IsIn(PASSWORD_PORTALS)
  portal: PasswordPortal;
}

@Controller('auth')
export class AuthEmailsController {
  private readonly logger = new Logger(AuthEmailsController.name);

  constructor(private readonly authEmails: AuthEmailsService) {}

  // Route publique : 5 demandes par heure et par IP. Toujours 204, que le
  // compte existe ou non.
  @Throttle({ default: { limit: 5, ttl: 3_600_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    try {
      await this.authEmails.sendPasswordReset(dto.email, dto.portal);
    } catch (error) {
      this.logger.error(
        `Échec de l'envoi du lien de réinitialisation (${dto.portal})`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
