import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ShopResponseDto, ShopListResponseDto } from './dto/shop-response.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ShopsService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async createShop(
    ownerId: string,
    dto: CreateShopDto,
    avatarFile?: Express.Multer.File,
    coverFile?: Express.Multer.File,
  ): Promise<ShopResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id: ownerId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'WHOLESALER') {
      throw new ForbiddenException('Only wholesalers can create shops');
    }

    if (user.wholesalerStatus !== 'APPROVED') {
      throw new ForbiddenException('Wholesaler status must be approved to create a shop');
    }

    const existingShop = await this.prisma.shop.findUnique({ where: { ownerId } });
    if (existingShop) {
      throw new BadRequestException('User already has a shop');
    }

    let avatarUrl: string | undefined;
    let coverPhotoUrl: string | undefined;

    if (avatarFile) {
      avatarUrl = await this.cloudinary.uploadImage(avatarFile, 'shops/avatars');
    }
    if (coverFile) {
      coverPhotoUrl = await this.cloudinary.uploadImage(coverFile, 'shops/covers');
    }

    const shop = await this.prisma.shop.create({
      data: {
        ...dto,
        ownerId,
        avatarUrl,
        coverPhotoUrl,
      },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    return this.mapToResponseDto(shop);
  }

  async getShopById(shopId: string, currentUserId?: string): Promise<ShopResponseDto> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            followers: true,
            products: true,
          },
        },
      },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    let isFollowing = false;
    if (currentUserId) {
      const follow = await this.prisma.follow.findUnique({
        where: {
          followerId_shopId: {
            followerId: currentUserId,
            shopId,
          },
        },
      });
      isFollowing = !!follow;
    }

    return {
      ...shop,
      followersCount: shop._count.followers,
      productsCount: shop._count.products,
      isFollowing,
    } as ShopResponseDto;
  }

  async getShops(
    page = 1,
    limit = 20,
    category?: string,
    location?: string,
    sortBy: 'followers' | 'recent' = 'followers',
    currentUserId?: string,
  ): Promise<ShopListResponseDto> {
    const where: any = {};

    if (category) {
      where.category = { contains: category, mode: 'insensitive' };
    }
    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    const orderBy: Prisma.ShopOrderByWithRelationInput = sortBy === 'followers' 
      ? { followersCount: 'desc' } 
      : { createdAt: 'desc' };

    const [shops, total] = await Promise.all([
      this.prisma.shop.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          _count: {
            select: {
              followers: true,
              products: true,
            },
          },
        },
      }),
      this.prisma.shop.count({ where }),
    ]);

    const shopsWithFollowing = await Promise.all(
      shops.map(async (shop) => {
        let isFollowing = false;
        if (currentUserId) {
          const follow = await this.prisma.follow.findUnique({
            where: {
              followerId_shopId: {
                followerId: currentUserId,
                shopId: shop.id,
              },
            },
          });
          isFollowing = !!follow;
        }
        return {
          ...shop,
          followersCount: shop._count.followers,
          productsCount: shop._count.products,
          isFollowing,
        } as ShopResponseDto;
      }),
    );

    return {
      shops: shopsWithFollowing,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateShop(
    shopId: string,
    ownerId: string,
    dto: UpdateShopDto,
    avatarFile?: Express.Multer.File,
    coverFile?: Express.Multer.File,
  ): Promise<ShopResponseDto> {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.ownerId !== ownerId) {
      throw new ForbiddenException('Only the shop owner can update this shop');
    }

    let avatarUrl = shop.avatarUrl;
    let coverPhotoUrl = shop.coverPhotoUrl;

    if (avatarFile) {
      avatarUrl = await this.cloudinary.uploadImage(avatarFile, 'shops/avatars');
    }
    if (coverFile) {
      coverPhotoUrl = await this.cloudinary.uploadImage(coverFile, 'shops/covers');
    }

    const updatedShop = await this.prisma.shop.update({
      where: { id: shopId },
      data: {
        ...dto,
        avatarUrl,
        coverPhotoUrl,
      },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            followers: true,
            products: true,
          },
        },
      },
    });

    return {
      ...updatedShop,
      followersCount: updatedShop._count.followers,
      productsCount: updatedShop._count.products,
    } as ShopResponseDto;
  }

  async deleteShop(shopId: string, ownerId: string): Promise<{ message: string }> {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.ownerId !== ownerId) {
      throw new ForbiddenException('Only the shop owner can delete this shop');
    }

    await this.prisma.shop.delete({ where: { id: shopId } });

    return { message: 'Shop deleted successfully' };
  }

  async getMyShop(ownerId: string): Promise<ShopResponseDto | null> {
    const shop = await this.prisma.shop.findUnique({
      where: { ownerId },
      include: {
        owner: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            followers: true,
            products: true,
          },
        },
      },
    });

    if (!shop) {
      return null;
    }

    return {
      ...shop,
      followersCount: shop._count.followers,
      productsCount: shop._count.products,
    } as ShopResponseDto;
  }

  private mapToResponseDto(shop: any): ShopResponseDto {
    return {
      ...shop,
      followersCount: 0,
      productsCount: 0,
    };
  }
}