import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class SyncListDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isStarred?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsISO8601({ strict: true })
  updatedAt!: string;
}

export class UpsertItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsBoolean()
  isCompleted!: boolean;

  @IsInt()
  @Min(0)
  position!: number;

  @IsISO8601({ strict: true })
  updatedAt!: string;
}

export class DeleteItemQueryDto {
  @IsOptional()
  @IsISO8601({ strict: true })
  deletedAt?: string;
}

export class ChangeMemberRoleDto {
  @IsIn(['admin', 'member'])
  role!: 'admin' | 'member';
}
