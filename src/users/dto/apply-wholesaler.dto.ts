import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator';

export class ApplyWholesalerDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  businessName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{9}$/, { message: 'TIN must be 9 digits' })
  tin: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  businessRegNo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  businessAddress: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  businessCategory: string;

  @IsString()
  @IsNotEmpty()
  businessDocUrl: string; // Cloudinary URL (RDB certificate, etc.)
}
