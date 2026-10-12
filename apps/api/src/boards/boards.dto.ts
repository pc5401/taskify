import { IsString, Length, MaxLength, ValidateIf } from 'class-validator';
export class CreateBoardRequest {
  @IsString() @Length(1, 80) title: string;
  @ValidateIf((_object, value) => value !== undefined) @IsString() @MaxLength(500) description?: string;
  @ValidateIf((_object, value) => value !== undefined) @IsString() color?: string;
}
