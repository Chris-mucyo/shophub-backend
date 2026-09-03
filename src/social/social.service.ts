import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import {
  ToggleResponseDto,
  CommentResponseDto,
  CommentListResponseDto,
} from './dto/social-response.dto';
import { NotificationType } from '@prisma/client';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  // ========== FOLLOW ==========

  async followShop(userId: string, shopId: string): Promise<ToggleResponseDto> {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.ownerId === userId) {
      throw new BadRequestException('Cannot follow your own shop');
    }

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_shopId: {
          followerId: userId,
          shopId,
        },
      },
    });

    if (existingFollow) {
      throw new BadRequestException('Already following this shop');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const follow = await tx.follow.create({
        data: {
          followerId: userId,
          shopId,
        },
      });

      await tx.shop.update({
        where: { id: shopId },
        data: { followersCount: { increment: 1 } },
      });

      // Create notification outside transaction to avoid mixing void promises
      // We'll do it after the transaction commits
      return { follow, shopOwnerId: shop.ownerId };
    });

    // Create notification after transaction
    await this.createNotification(
      result.shopOwnerId,
      NotificationType.FOLLOW,
      'New follower!',
      userId,
    );

    return {
      success: true,
      action: 'added',
      count: 1,
    };
  }

  async unfollowShop(userId: string, shopId: string): Promise<ToggleResponseDto> {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const existingFollow = await this.prisma.follow.findUnique({
      where: {
        followerId_shopId: {
          followerId: userId,
          shopId,
        },
      },
    });

    if (!existingFollow) {
      throw new BadRequestException('Not following this shop');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.follow.delete({
        where: {
          followerId_shopId: {
            followerId: userId,
            shopId,
          },
        },
      });

      await tx.shop.update({
        where: { id: shopId },
        data: { followersCount: { decrement: 1 } },
      });
    });

    return {
      success: true,
      action: 'removed',
      count: 0,
    };
  }

  async getShopFollowers(
    shopId: string,
    page = 1,
    limit = 20,
  ): Promise<{ followers: any[]; total: number }> {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          follower: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.follow.count({ where: { shopId } }),
    ]);

    return { followers: follows, total };
  }

  async getUserFollowingShops(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{ shops: any[]; total: number }> {
    const [follows, total] = await Promise.all([
      this.prisma.follow.findMany({
        where: { followerId: userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          shop: {
            include: {
              owner: {
                select: {
                  id: true,
                  fullName: true,
                },
              },
              _count: {
                select: {
                  followers: true,
                  products: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ]);

    return {
      shops: follows.map((f) => ({
        ...f.shop,
        followersCount: f.shop._count.followers,
        productsCount: f.shop._count.products,
        isFollowing: true,
      })),
      total,
    };
  }

  // ========== LIKE ==========

  async likeProduct(userId: string, productId: string): Promise<ToggleResponseDto> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_productId: {
          userId,
          productId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await this.prisma.$transaction(async (tx) => {
        await tx.like.delete({
          where: {
            userId_productId: {
              userId,
              productId,
            },
          },
        });

        await tx.product.update({
          where: { id: productId },
          data: { likeCount: { decrement: 1 } },
        });
      });

      const updatedProduct = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { likeCount: true },
      });

      return {
        success: true,
        action: 'removed',
        count: updatedProduct?.likeCount || 0,
      };
    } else {
      // Like
      const result = await this.prisma.$transaction(async (tx) => {
        const like = await tx.like.create({
          data: {
            userId,
            productId,
          },
        });

        await tx.product.update({
          where: { id: productId },
          data: { likeCount: { increment: 1 } },
        });

        return { like, shopId: product.shopId, productName: product.name };
      });

      // Create notification after transaction
      await this.createNotification(
        result.shopId,
        NotificationType.LIKE,
        `Someone liked your product "${result.productName}"`,
        userId,
      );

      const updatedProduct = await this.prisma.product.findUnique({
        where: { id: productId },
        select: { likeCount: true },
      });

      return {
        success: true,
        action: 'added',
        count: updatedProduct?.likeCount || 0,
      };
    }
  }

  async getProductLikes(
    productId: string,
    page = 1,
    limit = 20,
  ): Promise<{ likes: any[]; total: number }> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const [likes, total] = await Promise.all([
      this.prisma.like.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.like.count({ where: { productId } }),
    ]);

    return { likes, total };
  }

  // ========== COMMENT ==========

  async addComment(
    userId: string,
    productId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          userId,
          productId,
          text: dto.text,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      });

      await tx.product.update({
        where: { id: productId },
        data: { commentCount: { increment: 1 } },
      });

      return { comment, shopId: product.shopId, productName: product.name };
    });

    // Create notification after transaction
    await this.createNotification(
      result.shopId,
      NotificationType.COMMENT,
      `New comment on "${result.productName}"`,
      userId,
    );

    return {
      ...result.comment,
      user: result.comment.user,
    };
  }

  async getComments(
    productId: string,
    page = 1,
    limit = 20,
  ): Promise<CommentListResponseDto> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const [comments, total] = await Promise.all([
      this.prisma.comment.findMany({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
            },
          },
        },
      }),
      this.prisma.comment.count({ where: { productId } }),
    ]);

    return {
      comments: comments.map((c) => ({
        ...c,
        user: c.user,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateComment(
    commentId: string,
    userId: string,
    dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('Can only update your own comments');
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: { text: dto.text },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    return {
      ...updatedComment,
      user: updatedComment.user,
    };
  }

  async deleteComment(commentId: string, userId: string): Promise<{ message: string }> {
    const comment = await this.prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('Can only delete your own comments');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.comment.delete({ where: { id: commentId } });
      await tx.product.update({
        where: { id: comment.productId },
        data: { commentCount: { decrement: 1 } },
      });
    });

    return { message: 'Comment deleted successfully' };
  }

  // ========== HELPER: CREATE NOTIFICATION ==========

  private async createNotification(
    userId: string,
    type: NotificationType,
    message: string,
    actorId?: string,
  ) {
    // Don't notify self
    if (userId === actorId) return;

    await this.prisma.notification.create({
      data: {
        userId,
        type,
        message,
      },
    });
  }
}