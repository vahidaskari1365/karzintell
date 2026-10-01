import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AdminCreateUserDto {
  @IsString() @IsNotEmpty() @MaxLength(120)
  fullName: string;

  @Matches(/^09\d{9}$/, { message: 'موبایل معتبر نیست' })
  phone: string;

  @IsOptional() @IsEmail()
  email?: string;

  /** اگر خالی باشد رمز موقت تولید می‌شود */
  @IsOptional() @IsString() @MinLength(8) @MaxLength(72)
  password?: string;

  @IsOptional() @IsArray() @IsInt({ each: true })
  roleIds?: number[];

  @IsOptional() @IsBoolean()
  sendOtp?: boolean;
}

export class AdminUpdateUserDto {
  @IsOptional() @IsString() @MaxLength(120)
  fullName?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @Matches(/^09\d{9}$/)
  phone?: string;

  @IsOptional() @IsIn(['active', 'pending', 'suspended'] as const)
  status?: 'active' | 'pending' | 'suspended';

  @IsOptional() @IsString() @MinLength(8) @MaxLength(72)
  newPassword?: string;
}

export class AssignRolesDto {
  @IsArray() @IsInt({ each: true })
  roleIds: number[];
}

class PermissionOverrideItem {
  @IsString() @IsNotEmpty()
  permission: string;

  @IsEnum(['allow', 'deny'] as const)
  type: 'allow' | 'deny';
}

export class AssignPermissionsDto {
  @IsArray()
  items: Array<{ permission: string; type: 'allow' | 'deny' }>;
}
