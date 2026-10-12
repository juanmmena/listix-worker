import {
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import { Env } from '../../../config/env.schema';
import { CryptoService } from '../../../shared/application/crypto.service';
import { httpStatusFor } from '../../../shared/presentation/error-status.map';
import { Public } from '../../auth/presentation/public.decorator';
import { ValidateInviteUseCase } from '../../invites/application/validate-invite.use-case';
import { renderInviteLandingPage } from './invite-landing.page';

@Controller()
@UseGuards(ThrottlerGuard)
export class InviteLandingController {
  constructor(
    private readonly validateInvite: ValidateInviteUseCase,
    private readonly crypto: CryptoService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Get('join/:credential')
  async landing(
    @Param('credential') credential: string,
    @Query('format') format: string | undefined,
    @Headers('accept') accept: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.validateInvite.execute(credential);
    response.status(result.valid ? HttpStatus.OK : httpStatusFor(result.errorCode ?? ''));
    response.setHeader('Cache-Control', 'no-store, max-age=0');

    if (format === 'json' || (accept ?? '').includes('application/json')) {
      return result;
    }

    const nonce = this.crypto.randomHex(16);
    response.setHeader(
      'Content-Security-Policy',
      `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    );
    response.type('html');
    return renderInviteLandingPage({
      credential,
      result,
      nonce,
      appScheme: this.config.get('APP_SCHEME', { infer: true }),
      packageName: this.config.get('ANDROID_PACKAGE_NAME', { infer: true }),
      playStoreUrl: this.config.get('PLAY_STORE_URL', { infer: true }),
    });
  }
}
