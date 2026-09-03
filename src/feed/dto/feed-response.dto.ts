import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FeedProductDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  caption?: string;

  @ApiProperty()
  tags: string[];

  @ApiProperty()
  price: number;

  @ApiProperty()
  stock: number;

  @ApiProperty()
  images: string[];

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiPropertyOptional()
  category?: string;

  @ApiProperty()
  shopId: string;

  @ApiPropertyOptional()
  shop?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };

  @ApiPropertyOptional()
  likedByUser?: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class FeedResponseDto {
  @ApiProperty({ type: [FeedProductDto] })
  products: FeedProductDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class TrendingProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  caption?: string;

  @ApiProperty()
  tags: string[];

  @ApiProperty()
  price: number;

  @ApiProperty()
  images: string[];

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  commentCount: number;

  @ApiProperty()
  shop: {
    id: string;
    name: string;
    avatarUrl?: string;
  };

  @ApiProperty()
  engagementScore: number;
}

export class TrendingResponseDto {
  @ApiProperty({ type: [TrendingProductResponseDto] })
  products: TrendingProductResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}

export class DiscoverShopResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

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

  @ApiProperty()
  followersCount: number;

  @ApiProperty()
  productsCount: number;

  @ApiProperty()
  isFollowing: boolean;
}

export class DiscoverResponseDto {
  @ApiProperty({ type: [DiscoverShopResponseDto] })
  shops: DiscoverShopResponseDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  totalPages: number;
}