import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/application/access-token.service';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { ItemsService } from '../application/items.service';
import { DeleteItemQueryDto, UpsertItemDto } from './lists.dto';
import { ItemPresenter } from './lists.presenter';

@Controller('lists/:listId/items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Put(':itemId')
  async upsert(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpsertItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const result = await this.itemsService.upsert({
      listId,
      itemId,
      userId: user.userId,
      title: dto.title,
      isCompleted: dto.isCompleted,
      position: dto.position,
      clientUpdatedAt: new Date(dto.updatedAt),
    });
    return {
      applied: result.applied,
      item: ItemPresenter.toResponse(result.item),
    };
  }

  @Delete(':itemId')
  async remove(
    @Param('listId', ParseUUIDPipe) listId: string,
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Query() query: DeleteItemQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.itemsService.delete({
      listId,
      itemId,
      userId: user.userId,
      clientDeletedAt: query.deletedAt ? new Date(query.deletedAt) : undefined,
    });
  }
}
