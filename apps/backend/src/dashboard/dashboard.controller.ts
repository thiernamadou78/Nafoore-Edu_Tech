import { BadRequestException, Controller, ForbiddenException, Get, NotFoundException, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Permission } from '../auth/permissions';
import { RolesGuard } from '../auth/roles.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import { AuthenticatedAdmin, SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { DashboardService } from './dashboard.service';
import { CockpitService } from './cockpit.service';

@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly cockpit: CockpitService,
    private readonly prisma: PrismaService,
  ) {}

  // Le Super Admin peut afficher le tableau de bord tel que le voit un
  // delegue (?asAdmin=<id>) : memes droits et meme zone que lui.
  private async viewer(admin: AuthenticatedAdmin, asAdmin?: string): Promise<AuthenticatedAdmin> {
    if (!asAdmin || asAdmin === admin.id) return admin;
    if (!admin.roleNames.includes('super_admin')) {
      throw new ForbiddenException('Réservé au Super Admin');
    }
    const account = await this.prisma.adminAccount.findUnique({
      where: { id: asAdmin },
      include: { roles: { include: { role: true } } },
    });
    if (!account) throw new NotFoundException('Compte introuvable');
    const { roles, ...rest } = account;
    return { ...rest, roleNames: roles.map((r) => r.role.name) };
  }

  @Permission('dashboard')
  @Get()
  getSummary(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.dashboardService.getSummary(admin);
  }

  // Accessible a tout admin : le contenu est filtre selon ses droits.
  @Get('notifications')
  getNotifications(@CurrentAdmin() admin: AuthenticatedAdmin) {
    return this.dashboardService.getNotifications(admin);
  }

  @Permission('dashboard')
  @Get('cockpit')
  async getCockpit(@CurrentAdmin() admin: AuthenticatedAdmin, @Query('asAdmin') asAdmin?: string) {
    return this.cockpit.get(await this.viewer(admin, asAdmin));
  }

  @Permission('dashboard')
  @Get('map')
  async getMapData(@CurrentAdmin() admin: AuthenticatedAdmin, @Query('asAdmin') asAdmin?: string) {
    return this.dashboardService.getMapData(await this.viewer(admin, asAdmin));
  }

  @Permission('attendance')
  @Get('attendance-alerts')
  getAttendanceAlerts(
    @CurrentAdmin() admin: AuthenticatedAdmin,
    @Query('days') days?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    // Periode du journal des pointages : intervalle de dates (from/to, bornes
    // incluses, 1 an maximum) ou N derniers jours (1 a 92, 7 par defaut).
    if (from || to) {
      const start = from ? new Date(from) : null;
      const end = to ? new Date(to) : null;
      if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new BadRequestException('Intervalle invalide : indiquez une date de début et une date de fin');
      }
      if (end <= start) throw new BadRequestException('La date de fin doit être après la date de début');
      if (end.getTime() - start.getTime() > 367 * 24 * 3_600_000) {
        throw new BadRequestException('Intervalle trop long (1 an maximum)');
      }
      return this.dashboardService.getAttendanceAlerts(admin, { start, end });
    }
    const parsed = Number.parseInt(days ?? '', 10);
    const period = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 92) : 7;
    const end = new Date();
    return this.dashboardService.getAttendanceAlerts(admin, {
      start: new Date(end.getTime() - period * 24 * 3_600_000),
      end,
    });
  }
}
