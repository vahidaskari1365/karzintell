import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { WalletService } from './wallet.service';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

class WithdrawRequestDto {
  @IsInt() @Min(100000)
  amount: number;

  @IsString() @IsNotEmpty()
  shaba: string;

  @IsString() @IsNotEmpty()
  cardHolder: string;
}

class RejectWithdrawalDto {
  @IsString() @IsNotEmpty()
  reason: string;
}

@ApiTags('me')
@Controller('me/wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  async overview(@CurrentUser() user: AuthUser) {
    return { data: await this.wallet.overview(user.id) };
  }

  @Post('withdraw')
  async requestWithdrawal(@CurrentUser() user: AuthUser, @Body() dto: WithdrawRequestDto) {
    return { data: await this.wallet.requestWithdrawal(user.id, dto.amount, dto.shaba, dto.cardHolder) };
  }
}

@ApiTags('admin/wallet')
@Controller('admin/wallet')
export class AdminWalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get('withdrawals')
  @RequirePermissions('payments.view')
  async listWithdrawals() {
    return { data: await this.wallet.listAdminWithdrawals() };
  }

  @Post('withdrawals/:id/approve')
  @RequirePermissions('payments.view')
  async approveWithdrawal(@Param('id', ParseIntPipe) id: number) {
    return { data: await this.wallet.approveWithdrawal(id) };
  }

  @Post('withdrawals/:id/reject')
  @RequirePermissions('payments.view')
  async rejectWithdrawal(@Param('id', ParseIntPipe) id: number, @Body() dto: RejectWithdrawalDto) {
    return { data: await this.wallet.rejectWithdrawal(id, dto.reason) };
  }
}
