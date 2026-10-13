import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { AuthenticatedUser } from '../../auth/application/access-token.service';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { InvitesService } from '../application/invites.service';

@Controller('lists/:listId/invites')
@UseGuards(ThrottlerGuard)
export class ListInvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('listId', ParseUUIDPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.invitesService.create({ listId, userId: user.userId });
  }

  @Delete('active')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Param('listId', ParseUUIDPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.invitesService.revoke({ listId, userId: user.userId });
  }
}
