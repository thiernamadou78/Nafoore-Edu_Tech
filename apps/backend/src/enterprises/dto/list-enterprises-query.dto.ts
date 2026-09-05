import { IsOptional, IsString } from 'class-validator';

export class ListEnterprisesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;
}
