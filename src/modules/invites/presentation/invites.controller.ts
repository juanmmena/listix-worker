import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { httpStatusFor } from '../../../shared/presentation/error-status.map';
import type { AuthenticatedUser } from '../../auth/application/access-token.service';
import { CurrentUser } from '../../auth/presentation/current-user.decorator';
import { Public } from '../../auth/presentation/public.decorator';
import { SnapshotPresenter } from '../../lists/presentation/lists.presenter';
import { InvitesService } from '../application/invites.service';
import { JoinListDto } from './join-list.dto';

@Controller('invites')
@UseGuards(ThrottlerGuard)
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Public()
  @Get(':credential')
  async validate(
    @Param('credential') credential: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.invitesService.validate(credential);
    response.status(result.valid ? HttpStatus.OK : httpStatusFor(result.errorCode ?? ''));
    return result;
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  async join(@Body() dto: JoinListDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.invitesService.join({ ...dto, userId: user.userId });
    return { alreadyMember: result.alreadyMember, ...SnapshotPresenter.toResponse(result) };
  }
}
