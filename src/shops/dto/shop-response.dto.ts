import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

export class ShopResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  bio?: string;

  @ApiPropertyOptional()
  avatarUrl?: string;

  @ApiPropertyOptional()
  coverPhotoUrl?: string;

  @ApiPropertyOptional()
  category?: string;

  @ApiPropertyOptional()
  location?: string;

  @ApiPropertyOptional()
  website?: string;

  @ApiPropertyOptional()
  socialLinks?: Record<string, string>;

  @ApiProperty()
  followersCount: number;

  @ApiProperty()
  productsCount: number;

  @ApiPropertyOptional()
  isFollowing?: boolean;

  @ApiProperty()
  ownerId: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @Exclude()
  owner?: any;
}

export class ShopListResponseDto {
  @ApiProperty({ type: [ShopResponseDto] })
  shops: ShopResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}