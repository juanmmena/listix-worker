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
import { CreateInviteUseCase } from '../application/create-invite.use-case';
import { RevokeInviteUseCase } from '../application/revoke-invite.use-case';

@Controller('lists/:listId/invites')
@UseGuards(ThrottlerGuard)
export class ListInvitesController {
  constructor(
    private readonly createInvite: CreateInviteUseCase,
    private readonly revokeInvite: RevokeInviteUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('listId', ParseUUIDPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.createInvite.execute({ listId, userId: user.userId });
  }

  @Delete('active')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @Param('listId', ParseUUIDPipe) listId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.revokeInvite.execute({ listId, userId: user.userId });
  }
}
