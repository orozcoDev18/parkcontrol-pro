import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { OverflowPolicy, VehicleType } from '@prisma/client';

export class CreatePlanDto {
  @IsString() @MinLength(3) @MaxLength(60) name!: string;
  @IsOptional() @IsEnum(VehicleType) vehicleType?: VehicleType;
  @IsInt() @Min(1) @Max(50) maxSimultaneousSpots!: number;
  @IsNumber() @Min(0) price!: number;
  @IsInt() @Min(1) @Max(3650) durationDays!: number;
  @IsNumber() @Min(0) hourlyRate!: number;
  @IsOptional() @IsEnum(OverflowPolicy) overflowPolicy?: OverflowPolicy;
  @IsOptional() @IsBoolean() isOccasional?: boolean;
}

export class UpdatePlanDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(60) name?: string;
  @IsOptional() @IsInt() @Min(1) @Max(50) maxSimultaneousSpots?: number;
  @IsOptional() @IsNumber() @Min(0) price?: number;
  @IsOptional() @IsInt() @Min(1) @Max(3650) durationDays?: number;
  @IsOptional() @IsNumber() @Min(0) hourlyRate?: number;
  @IsOptional() @IsEnum(OverflowPolicy) overflowPolicy?: OverflowPolicy;
  @IsOptional() @IsBoolean() active?: boolean;
}

export class CreateSubscriptionDto {
  @IsUUID() clientId!: string;
  @IsUUID() planId!: string;
  /** Fecha ISO de inicio; por defecto hoy. */
  @IsOptional() @IsString() startsAt?: string;
}
