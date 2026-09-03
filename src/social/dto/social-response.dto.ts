import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FollowResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  followerId: string;

  @ApiProperty()
  shopId: string;

  @ApiProperty()
  createdAt: Date;
}

export class LikeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  createdAt: Date;
}

export class CommentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  text: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  user?: {
    id: string;
    fullName: string;
  };
}

export class CommentListResponseDto {
  @ApiProperty({ type: [CommentResponseDto] })
  comments: CommentResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class ToggleResponseDto {
  @ApiProperty()
  success: boolean;

  @ApiProperty()
  action: 'added' | 'removed';

  @ApiProperty()
  count: number;
}