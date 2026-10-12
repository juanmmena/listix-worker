import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class JoinListDto {
  @IsString()
  @Length(6, 128)
  credential!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  displayName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}
