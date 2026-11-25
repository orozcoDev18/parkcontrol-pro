import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { VehicleType } from '@prisma/client';

export class CreateVehicleDto {
  @IsString() @MinLength(4) @MaxLength(12) plate!: string;
  @IsUUID() clientId!: string;
  @IsOptional() @IsEnum(VehicleType) type?: VehicleType;
  @IsOptional() @IsString() @MaxLength(40) brand?: string;
  @IsOptional() @IsString() @MaxLength(40) model?: string;
  @IsOptional() @IsString() @MaxLength(30) color?: string;
}

export class TransferVehicleDto {
  @IsUUID() toClientId!: string;
  @IsOptional() @IsString() @MaxLength(200) reason?: string;
}
