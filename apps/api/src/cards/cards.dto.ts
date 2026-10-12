import {
  IsArray,
  IsISO8601,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
export class CreateCardRequest {
  @IsString() @Length(1, 120) title!: string;
  @ValidateIf((_, v) => v !== undefined)
  @IsString()
  @MaxLength(5000)
  description?: string;
  @ValidateIf((_, v) => v != null) @IsUUID() assigneeId?: string | null;
  @ValidateIf((_, v) => v != null) @IsUUID() predecessorId?: string | null;
  @ValidateIf((_, v) => v != null)
  @IsISO8601({ strict: true })
  @Matches(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/,
  )
  dueAt?: string | null;
  @ValidateIf((_, v) => v !== undefined)
  @IsArray()
  @IsString({ each: true })
  @Length(1, 30, { each: true })
  tagNames?: string[];
}
export class MoveCardRequest {
  @IsUUID() toColumnId!: string;
  @ValidateIf((_, v) => v != null) @IsUUID() beforeCardId?: string | null;
}
