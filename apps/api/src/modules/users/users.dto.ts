import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, Length, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() @MaxLength(120)
  fullName?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @Matches(/^\d{10}$/, { message: 'کد ملی ۱۰ رقمی است' })
  nationalCode?: string;

  @IsOptional() @IsString() @MaxLength(500)
  avatarPath?: string;
}

export class AddressDto {
  @IsString() @MaxLength(50)
  title: string;

  @IsString() @IsNotEmpty() @MaxLength(120)
  receiverName: string;

  @IsString() @Matches(/^09\d{9}$/, { message: 'موبایل گیرنده معتبر نیست' })
  receiverPhone: string;

  @IsString() @IsNotEmpty()
  province: string;

  @IsString() @IsNotEmpty()
  city: string;

  @IsOptional() @IsString() @Length(10, 10)
  postalCode?: string;

  @IsString() @IsNotEmpty()
  address: string;

  @IsOptional() @IsString() @MaxLength(20)
  plaque?: string;

  @IsOptional() @IsString() @MaxLength(20)
  unit?: string;

  @IsOptional() @IsBoolean()
  isDefault?: boolean;
}
