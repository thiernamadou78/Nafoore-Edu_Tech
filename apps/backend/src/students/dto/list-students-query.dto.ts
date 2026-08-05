import { IsIn, IsOptional, IsString } from 'class-validator';

export class ListStudentsQueryDto {
  @IsOptional()
  @IsIn(['college', 'lycee'])
  level?: string;

  @IsOptional()
  @IsString()
  subject?: string;
}
