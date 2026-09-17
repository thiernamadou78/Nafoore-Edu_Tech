import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTestimonialDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  author?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  role?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(600)
  quote?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  published?: boolean;
}
