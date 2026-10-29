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

  // Semaine / mois contenant `date` (AAAA-MM-JJ), par defaut la derniere
  // periode terminee ; ou intervalle libre `from` / `to` (kind=custom).
  private load(rawKind?: string, date?: string, from?: string, to?: string) {
    if (rawKind === 'custom') {
      const { start, end } = this.reports.parseRange(from, to);
      return this.reports.buildRange(start, end);
    }
    if (rawKind !== undefined && rawKind !== 'weekly' && rawKind !== 'monthly') {
      throw new BadRequestException('Type de rapport invalide');
    }
    const kind = (rawKind as ReportKind | undefined) ?? 'weekly';
    return this.reports.build(kind, this.reports.parseAnchor(date) ?? this.reports.defaultAnchor(kind));
  }

  @Get()
  get(@Query('kind') kind?: string, @Query('date') date?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.load(kind, date, from, to);
  }

  @Get('csv')
  async csv(@Query('kind') kind?: string, @Query('date') date?: string, @Query('from') from?: string, @Query('to') to?: string) {
    return { csv: this.reports.toCsv(await this.load(kind, date, from, to)) };
  }
}
