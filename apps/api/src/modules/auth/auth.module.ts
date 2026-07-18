import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken, User, VerificationCode } from '../../database/entities';
import { AuthController, MeTwoFactorController } from './auth.controller';
import { AuthService } from './auth.service';
import { CaptchaService, TwoFactorService } from './security.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, VerificationCode, RefreshToken])],
  controllers: [AuthController, MeTwoFactorController],
  providers: [AuthService, CaptchaService, TwoFactorService],
  exports: [AuthService],
})
export class AuthModule {}
