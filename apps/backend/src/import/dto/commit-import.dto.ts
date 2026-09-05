import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsString, ValidateNested } from 'class-validator';
import { ImportRowDto } from './import-row.dto';

export class CommitImportDto {
  @IsString()
  contractId: string;

  @IsString()
  fileName: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Aucune ligne à importer' })
  @ValidateNested({ each: true })
  @Type(() => ImportRowDto)
  rows: ImportRowDto[];
}
