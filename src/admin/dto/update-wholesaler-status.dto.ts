import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { WholesalerStatus } from '@prisma/client';

export class UpdateWholesalerStatusDto {
  @IsEnum(WholesalerStatus)
  @IsNotEmpty()
  status: WholesalerStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  rejectionReason?: string;
}
