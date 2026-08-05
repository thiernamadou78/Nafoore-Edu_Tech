import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedAdmin } from './supabase-auth.guard';

export const CurrentAdmin = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedAdmin => {
    const request = ctx.switchToHttp().getRequest();
    return request.adminAccount;
  },
);
