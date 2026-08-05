import { IsDateString } from 'class-validator';

export class ScheduleInterviewDto {
  @IsDateString({}, { message: 'interviewDate doit être une date ISO valide' })
  interviewDate: string;
}
