import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateClientDto {
  @IsOptional() @IsString() @MaxLength(10) documentType?: string;
  @IsString() @MinLength(4) @MaxLength(30) documentNumber!: string;
  @IsString() @MinLength(3) @MaxLength(120) fullName!: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}

export class UpdateClientDto {
  @IsOptional() @IsString() @MinLength(3) @MaxLength(120) fullName?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
}
