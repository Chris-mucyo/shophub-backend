import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'Great product! Interested in bulk order.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text: string;
}