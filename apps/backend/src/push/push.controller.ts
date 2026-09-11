import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentTeacherAccount } from '../auth/current-teacher-account.decorator';
import { AuthenticatedTeacherAccount, TeacherAuthGuard } from '../auth/teacher-auth.guard';
import { PushService } from './push.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { UnsubscribePushDto } from './dto/unsubscribe-push.dto';

@UseGuards(TeacherAuthGuard)
@Controller('teacher/push')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post('subscribe')
  subscribe(
    @CurrentTeacherAccount() teacherAccount: AuthenticatedTeacherAccount,
    @Body() dto: SubscribePushDto,
  ) {
    if (!teacherAccount.teacherId) {
      throw new BadRequestException('Profil enseignant non configuré');
    }
    return this.pushService.subscribe(teacherAccount.teacherId, dto);
  }

  @Post('unsubscribe')
  unsubscribe(@Body() dto: UnsubscribePushDto) {
    return this.pushService.unsubscribe(dto.endpoint);
  }
}
