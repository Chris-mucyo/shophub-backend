import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  FeedResponseDto,
  TrendingResponseDto,
  DiscoverResponseDto,
} from './dto/feed-response.dto';

@Injectable()
export class FeedService {
  constructor(private prisma: PrismaService) {}

  async getFeed(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<FeedResponseDto> {
    // Get shops user follows
    const followedShops = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { shopId: true },
    });

    const followedShopIds = followedShops.map((f) => f.shopId);

    // Get recent products from followed shops
    const followedProducts = await this.prisma.product.findMany({
      where: {
        shopId: { in: followedShopIds },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // If user doesn't follow many shops, supplement with popular products
    let products = followedProducts;
    if (followedProducts.length < limit) {
      const remaining = limit - followedProducts.length;
      const popularProducts = await this.prisma.product.findMany({
        where: {
          shopId: { notIn: followedShopIds },
        },
        orderBy: [
          { likeCount: 'desc' },
          { commentCount: 'desc' },
          { createdAt: 'desc' },
        ],
        take: remaining,
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });
      products = [...followedProducts, ...popularProducts];
    }

    // Add likedByUser flag
    const productIds = products.map((p) => p.id);
    const likes = await this.prisma.like.findMany({
      where: {
        userId,
        productId: { in: productIds },
      },
      select: { productId: true },
    });

    const likedSet = new Set(likes.map((l) => l.productId));

    const productsWithLiked = products.map((p) => ({
      ...p,
      likedByUser: likedSet.has(p.id),
      price: Number(p.price),
    }));

    // For feed, we don't have total count since it's mixed
    // We'll return the actual products and indicate if there are more
    return {
      products: productsWithLiked as any,
      total: productsWithLiked.length,
      page,
      limit,
      totalPages: 1, // Simplified for feed
    };
  }

  async getTrendingProducts(
    page = 1,
    limit = 20,
    days = 7,
  ): Promise<TrendingResponseDto> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: {
          createdAt: { gte: cutoffDate },
        },
        orderBy: [
          { likeCount: 'desc' },
          { commentCount: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          shop: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.product.count({
        where: {
          createdAt: { gte: cutoffDate },
        },
      }),
    ]);

    const productsWithScore = products.map((p) => ({
      ...p,
      price: Number(p.price),
      engagementScore: p.likeCount + p.commentCount * 2,
    }));

    return {
      products: productsWithScore as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getDiscoverShops(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<DiscoverResponseDto> {
    // Get shops user already follows
    const followedShops = await this.prisma.follow.findMany({
      where: { followerId: userId },
      select: { shopId: true },
    });

    const followedShopIds = followedShops.map((f) => f.shopId);

    // Get popular shops excluding followed ones
    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where: {
          id: { notIn: followedShopIds.length > 0 ? followedShopIds : undefined },
        },
        orderBy: { followersCount: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: {
            select: {
              followers: true,
              products: true,
            },
          },
        },
      }),
      this.prisma.shop.count({
        where: {
          id: { notIn: followedShopIds.length > 0 ? followedShopIds : undefined },
        },
      }),
    ]);

    const shopsWithFollowing = shops.map((shop) => ({
      ...shop,
      followersCount: shop._count.followers,
      productsCount: shop._count.products,
      isFollowing: false,
    }));

    return {
      shops: shopsWithFollowing as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}