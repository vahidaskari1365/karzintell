import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { PaymentsService } from './payments.service';
import { PaymentGateway } from '../../database/entities';

class InitPaymentDto {
  @IsString()
  orderCode: string;

  @IsEnum(['zarinpal', 'manual', 'wallet'] as const)
  gateway: PaymentGateway;
}

class WalletChargeDto {
  @IsNumber() @Min(1000)
  amount: number;

  @IsEnum(['zarinpal', 'manual'] as const)
  gateway: PaymentGateway;
}

class RefundDto {
  @IsOptional() @IsString()
  note?: string;
}

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('payments/init')
  async init(@CurrentUser() user: AuthUser, @Body() dto: InitPaymentDto) {
    return { data: await this.payments.init(user.id, dto.orderCode, dto.gateway) };
  }

  /** بازگشت از درگاه → ریدایرکت به نتیجه در فرانت */
  @Public()
  @Get('payments/callback/:gateway')
  async callback(@Param('gateway') gateway: string, @Query() query: Record<string, string>, @Res() res: Response) {
    const { redirectUrl } = await this.payments.handleCallback(gateway, query);
    return res.redirect(302, redirectUrl);
  }

  @Post('me/wallet/charge')
  async walletCharge(@CurrentUser() user: AuthUser, @Body() dto: WalletChargeDto) {
    return { data: await this.payments.initWalletCharge(user.id, Number(dto.amount), dto.gateway) };
  }

  // --------------------------------------------------------------- ادمین
  @Get('admin/payments')
  @RequirePermissions('payments.view')
  async adminList(@Query('page') page?: string, @Query('limit') limit?: string) {
    const r = await this.payments.adminList(page, limit);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Post('admin/orders/:id/refund')
  @RequirePermissions('orders.refund')
  async refund(@Param('id') id: string, @Body() dto: RefundDto, @CurrentUser() admin: AuthUser) {
    return { data: await this.payments.refund(Number(id), admin.id, dto.note) };
  }
}
