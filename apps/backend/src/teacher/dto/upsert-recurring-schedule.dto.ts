import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ScheduleSlotDto } from './schedule-slot.dto';

export class UpsertRecurringScheduleDto {
  @IsInt()
  @Min(1, { message: 'La fréquence doit être d’au moins 1 séance par semaine' })
  @Max(7, { message: 'La fréquence ne peut pas dépasser 7 séances par semaine' })
  frequency: number;

  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins un créneau est requis' })
  @ValidateNested({ each: true })
  @Type(() => ScheduleSlotDto)
  slots: ScheduleSlotDto[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  subject?: string;

  @IsOptional()
  @IsIn([30, 45, 60, 90, 120])
  durationMinutes?: number;
}
