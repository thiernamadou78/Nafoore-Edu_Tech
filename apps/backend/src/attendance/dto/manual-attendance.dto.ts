import { IsIn, IsString } from 'class-validator';

export class ManualAttendanceDto {
  @IsString()
  sessionId: string;

  @IsIn(['qr_oublie', 'probleme_technique', 'autre'], { message: 'Motif invalide' })
  manualReason: string;
}
