import { IsString, MinLength } from 'class-validator';

export class ScanAttendanceDto {
  @IsString()
  @MinLength(1, { message: 'Token manquant' })
  qrToken: string;
}
