import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedPortalAccount } from './portal-auth.guard';

export const CurrentPortalAccount = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedPortalAccount => {
    const request = ctx.switchToHttp().getRequest();
    return request.portalAccount;
  },
);
