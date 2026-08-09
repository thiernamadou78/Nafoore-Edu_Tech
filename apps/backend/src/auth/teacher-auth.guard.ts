import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { TeacherAccount } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseJwtService } from './supabase-jwt.service';

export type AuthenticatedTeacherAccount = TeacherAccount;

@Injectable()
export class TeacherAuthGuard implements CanActivate {
  constructor(
    private readonly supabaseJwt: SupabaseJwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers['authorization'];
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7)
      : undefined;

    if (!token) {
      throw new UnauthorizedException('Token manquant');
    }

    const user = await this.supabaseJwt.verify(token);

    const teacherAccount = await this.prisma.teacherAccount.findUnique({
      where: { id: user.id },
    });

    if (!teacherAccount || teacherAccount.status === 'suspendu') {
      throw new UnauthorizedException('Compte introuvable ou suspendu');
    }

    request.teacherAccount = teacherAccount;

    return true;
  }
}
