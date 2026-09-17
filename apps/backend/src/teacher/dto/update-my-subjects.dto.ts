import { ArrayMinSize, IsArray, IsIn } from 'class-validator';
import { SUBJECT_OPTIONS } from '../../common/subjects';

export class UpdateMySubjectsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Choisissez au moins une matière' })
  @IsIn(SUBJECT_OPTIONS, { each: true, message: 'Matière inconnue' })
  subjects: string[];
}
