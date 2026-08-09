import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedTeacherAccount } from './teacher-auth.guard';

export const CurrentTeacherAccount = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthenticatedTeacherAccount => {
    const request = ctx.switchToHttp().getRequest();
    return request.teacherAccount;
  },
);
