import { Matches, Max, Min } from 'class-validator';

export class ScheduleSlotDto {
  // ISO : 1 = lundi ... 7 = dimanche
  @Min(1, { message: 'dayOfWeek doit être entre 1 (lundi) et 7 (dimanche)' })
  @Max(7, { message: 'dayOfWeek doit être entre 1 (lundi) et 7 (dimanche)' })
  dayOfWeek: number;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: "L'heure doit être au format HH:mm" })
  time: string;
}
