import { IsString, IsNotEmpty, Matches, MaxLength } from 'class-validator';

export class SubmitProfileDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{16}$/, { message: 'National ID must be 16 digits' })
  nationalIdNumber: string;

  @IsString()
  @IsNotEmpty()
  nationalIdImage: string; // Cloudinary URL

  @IsString()
  @IsNotEmpty()
  selfieImage: string; // Cloudinary URL

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  addressDistrict: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  addressSector: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  addressCell: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  addressVillage: string;

  @IsString()
  @IsNotEmpty()
  proofOfAddress: string; // Cloudinary URL (utility bill, bank statement, etc.)
}
