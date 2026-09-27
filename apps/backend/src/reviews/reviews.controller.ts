import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { Permission } from '../auth/permissions';
import { ZoneParams } from '../auth/zone.service';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { CurrentPortalAccount } from '../auth/current-portal-account.decorator';
import { AuthenticatedPortalAccount, PortalAuthGuard } from '../auth/portal-auth.guard';
import { PortalRoles } from '../auth/portal-roles.decorator';
import { PortalRolesGuard } from '../auth/portal-roles.guard';
import { ReviewsService } from './reviews.service';
import { UpsertReviewDto } from './dto/upsert-review.dto';

@PortalRoles('famille')
@UseGuards(PortalAuthGuard, PortalRolesGuard)
@Controller('family/students/:studentId/reviews')
export class FamilyReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get()
  list(
    @Param('studentId') studentId: string,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.reviews.listForFamily(portalAccount, studentId);
  }

  @Put(':teacherId')
  upsert(
    @Param('studentId') studentId: string,
    @Param('teacherId') teacherId: string,
    @Body() dto: UpsertReviewDto,
    @CurrentPortalAccount() portalAccount: AuthenticatedPortalAccount,
  ) {
    return this.reviews.upsertForFamily(portalAccount, studentId, teacherId, dto);
  }
}

@Permission('teachers')
@ZoneParams({ id: 'teacher' })
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('teachers')
export class AdminReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Get(':id/reviews')
  list(@Param('id') id: string) {
    return this.reviews.listForAdmin(id);
  }
}
