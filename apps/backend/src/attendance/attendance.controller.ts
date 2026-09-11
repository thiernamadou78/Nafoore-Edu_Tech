import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentTeacherAccount } from '../auth/current-teacher-account.decorator';
import { AuthenticatedTeacherAccount, TeacherAuthGuard } from '../auth/teacher-auth.guard';
import { AttendanceService } from './attendance.service';
import { ManualAttendanceDto } from './dto/manual-attendance.dto';
import { ScanAttendanceDto } from './dto/scan-attendance.dto';
import { ConfirmEarlyCheckoutDto } from './dto/confirm-early-checkout.dto';

@UseGuards(TeacherAuthGuard)
@Controller('teacher/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post('scan')
  scan(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Body() dto: ScanAttendanceDto,
  ) {
    this.assertHasTeacherProfile(teacherAccount);
    return this.attendanceService.scan(teacherAccount.teacherId as string, dto);
  }

  @Post('manual')
  manual(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Body() dto: ManualAttendanceDto,
  ) {
    this.assertHasTeacherProfile(teacherAccount);
    return this.attendanceService.manual(teacherAccount.teacherId as string, dto);
  }

  @Post('checkout-confirm')
  confirmEarlyCheckout(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Body() dto: ConfirmEarlyCheckoutDto,
  ) {
    this.assertHasTeacherProfile(teacherAccount);
    return this.attendanceService.confirmEarlyCheckout(teacherAccount.teacherId as string, dto);
  }

  private assertHasTeacherProfile(teacherAccount: AuthenticatedTeacherAccount) {
    if (!teacherAccount.teacherId) {
      throw new BadRequestException('Profil enseignant non configuré');
    }
  }
}
