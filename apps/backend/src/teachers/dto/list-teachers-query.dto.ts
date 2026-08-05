import { IsBooleanString, IsOptional } from 'class-validator';

export class ListTeachersQueryDto {
  @IsOptional()
  @IsBooleanString()
  verified?: string;
}
