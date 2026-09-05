import { IsString } from 'class-validator';

export class PreviewImportDto {
  @IsString()
  contractId: string;
}
