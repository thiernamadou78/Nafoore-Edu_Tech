import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { CHARTER_VERSION, TERMS_VERSION, acceptanceStatus } from '../common/legal';

// Suivi des acceptations des CGU (familles, enseignants) et de la charte de
// confidentialite (enseignants) : reserve au Super Admin.
@Roles('super_admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Controller('admin/legal-acceptances')
export class LegalAcceptancesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    const [families, teachers] = await Promise.all([
      this.prisma.portalAccount.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, fullName: true, familyName: true, role: true, createdAt: true,
          mustChangePassword: true, termsVersion: true, termsAcceptedAt: true, leadId: true,
        },
      }),
      this.prisma.teacherAccount.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, fullName: true, createdAt: true, mustChangePassword: true, teacherId: true,
          termsVersion: true, termsAcceptedAt: true, charterVersion: true, charterAcceptedAt: true,
        },
      }),
    ]);

    return {
      termsVersion: TERMS_VERSION,
      charterVersion: CHARTER_VERSION,
      families: families.map((a) => ({
        id: a.id,
        name: a.familyName || a.fullName,
        email: a.email,
        role: a.role,
        leadId: a.leadId,
        createdAt: a.createdAt,
        // Jamais connecte : mot de passe provisoire toujours actif.
        neverLoggedIn: a.mustChangePassword,
        terms: { status: acceptanceStatus(a.termsVersion, TERMS_VERSION), version: a.termsVersion, acceptedAt: a.termsAcceptedAt },
      })),
      teachers: teachers.map((a) => ({
        id: a.id,
        name: a.fullName,
        email: a.email,
        teacherId: a.teacherId,
        createdAt: a.createdAt,
        neverLoggedIn: a.mustChangePassword,
        terms: { status: acceptanceStatus(a.termsVersion, TERMS_VERSION), version: a.termsVersion, acceptedAt: a.termsAcceptedAt },
        charter: {
          status: acceptanceStatus(a.charterVersion, CHARTER_VERSION),
          version: a.charterVersion,
          acceptedAt: a.charterAcceptedAt,
        },
      })),
    };
  }
}
