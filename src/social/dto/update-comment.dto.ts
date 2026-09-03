import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommentDto {
  @ApiProperty({ example: 'Updated: Great product! Interested in bulk order.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  text: string;
}