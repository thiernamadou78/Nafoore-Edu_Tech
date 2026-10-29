import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ActivityReportService, ReportKind } from './activity-report.service';

// Rapports d'activite : reserves au Super Admin (toutes zones confondues).
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('super_admin')
@Controller('admin/reports')
export class ActivityReportController {
  constructor(private readonly reports: ActivityReportService) {}

  private kind(raw?: string): ReportKind {
    if (raw !== undefined && raw !== 'weekly' && raw !== 'monthly') throw new BadRequestException('Type de rapport invalide');
    return (raw as ReportKind | undefined) ?? 'weekly';
  }

  // Rapport de la periode contenant `date` (AAAA-MM-JJ) ; par defaut, la
  // derniere periode terminee.
  @Get()
  get(@Query('kind') rawKind?: string, @Query('date') date?: string) {
    const kind = this.kind(rawKind);
    const anchor = this.reports.parseAnchor(date) ?? this.reports.defaultAnchor(kind);
    return this.reports.build(kind, anchor);
  }

  @Get('csv')
  async csv(@Query('kind') rawKind?: string, @Query('date') date?: string) {
    const kind = this.kind(rawKind);
    const anchor = this.reports.parseAnchor(date) ?? this.reports.defaultAnchor(kind);
    return { csv: this.reports.toCsv(await this.reports.build(kind, anchor)) };
  }
}
