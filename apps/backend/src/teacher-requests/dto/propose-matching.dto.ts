import { IsString } from 'class-validator';

export class ProposeMatchingDto {
  @IsString()
  teacherId: string;
}
