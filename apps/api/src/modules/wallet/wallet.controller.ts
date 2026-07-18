import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { WalletService } from './wallet.service';

@ApiTags('me')
@Controller('me/wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  async overview(@CurrentUser() user: AuthUser) {
    return { data: await this.wallet.overview(user.id) };
  }
}
