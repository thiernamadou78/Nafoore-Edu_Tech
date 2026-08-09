import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export class CreatePublicTeacherApplicationDto {
  @IsString()
  @MinLength(2, { message: 'Le nom doit faire au moins 2 caractères' })
  @MaxLength(100)
  candidateName: string;

  @IsEmail({}, { message: 'Email invalide' })
  candidateEmail: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @Transform(({ value }) => toArray(value))
  @IsArray({ message: 'Au moins une matière est requise' })
  @IsString({ each: true })
  subjects: string[];

  @Transform(({ value }) => toArray(value))
  @IsArray()
  @IsString({ each: true })
  levels: string[];

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  zone: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  availability?: string;
}
