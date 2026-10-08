import { IsHexadecimal, Length } from 'class-validator';

export class RefreshSessionDto {
  @IsHexadecimal()
  @Length(64, 64)
  refreshToken!: string;
}
