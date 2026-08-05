import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityLogService {
  constructor(private readonly prisma: PrismaService) {}

  log(
    adminAccountId: string,
    action: string,
    targetTable?: string,
    targetId?: string,
  ) {
    return this.prisma.activityLog.create({
      data: {
        adminAccountId,
        action,
        targetTable: targetTable ?? null,
        targetId: targetId ?? null,
      },
    });
  }
}
