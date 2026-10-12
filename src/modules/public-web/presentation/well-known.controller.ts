import { Controller, Get, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Env } from '../../../config/env.schema';
import { Public } from '../../auth/presentation/public.decorator';

@Controller('.well-known')
export class WellKnownController {
  constructor(private readonly config: ConfigService<Env, true>) {}

  @Public()
  @Get('assetlinks.json')
  @Header('Cache-Control', 'public, max-age=3600')
  assetLinks() {
    const fingerprints = this.config
      .get('ANDROID_SHA256_FINGERPRINTS', { infer: true })
      .split(',')
      .map((fingerprint) => fingerprint.trim())
      .filter((fingerprint) => fingerprint.length > 0);
    return [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: this.config.get('ANDROID_PACKAGE_NAME', { infer: true }),
          sha256_cert_fingerprints: fingerprints,
        },
      },
    ];
  }
}
