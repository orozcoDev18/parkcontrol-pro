import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export const PAYMENT_METHODS = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'PLAN'] as const;

export class CheckInDto {
  @IsString() @MinLength(4) @MaxLength(12) plate!: string;
  /** Confirma el ingreso cuando el plan ya no tiene cupos y se cobrara por horas. */
  @IsOptional() @IsBoolean() force?: boolean;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
}

export class CheckOutDto {
  @IsString() @MinLength(4) @MaxLength(12) plate!: string;
  @IsOptional() @IsIn(PAYMENT_METHODS as unknown as string[]) paymentMethod?: string;
  @IsOptional() @IsString() @MaxLength(200) note?: string;
}
