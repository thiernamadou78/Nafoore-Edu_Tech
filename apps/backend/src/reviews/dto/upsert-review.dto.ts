import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class UpsertReviewDto {
  @Type(() => Number)
  @IsInt({ message: 'La note doit être un nombre entier' })
  @Min(1, { message: 'La note va de 1 à 5 étoiles' })
  @Max(5, { message: 'La note va de 1 à 5 étoiles' })
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
