import { IsString, MaxLength, MinLength } from 'class-validator';

export class SetFamilyNameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  familyName: string;
}
