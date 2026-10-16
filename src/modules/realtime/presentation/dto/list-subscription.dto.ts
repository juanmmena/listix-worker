import { IsUUID } from 'class-validator';

export class ListSubscriptionDto {
  @IsUUID()
  listId!: string;
}
