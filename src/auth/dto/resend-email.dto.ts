import { IsString, IsNotEmpty } from 'class-validator';

export class ResendEmailDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}
