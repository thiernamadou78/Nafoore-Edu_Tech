import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsString, ValidateNested } from 'class-validator';

// Un prof peut enseigner plusieurs matieres a un meme eleve : chaque
// assignation precise donc les matieres couvertes pour ce couple prof/eleve.
export class TeacherAssignmentDto {
  @IsString()
  teacherId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Sélectionnez au moins une matière pour ce professeur' })
  @IsString({ each: true })
  subjects: string[];
}

export class AssignTeachersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TeacherAssignmentDto)
  assignments: TeacherAssignmentDto[];
}
