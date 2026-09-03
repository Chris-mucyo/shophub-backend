import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto, ProductListResponseDto } from './dto/product-response.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private cloudinary: CloudinaryService,
  ) {}

  async createProduct(
    shopId: string,
    ownerId: string,
    dto: CreateProductDto,
    imageFiles: Express.Multer.File[],
  ): Promise<ProductResponseDto> {
    const shop = await this.prisma.shop.findUnique({
      where: { id: shopId },
    });

    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    if (shop.ownerId !== ownerId) {
      throw new ForbiddenException('Only the shop owner can add products');
    }

    if (imageFiles.length === 0) {
      throw new BadRequestException('At least one product image is required');
    }

    if (imageFiles.length > 5) {
      throw new BadRequestException('Maximum 5 images allowed per product');
    }

    const imageUrls = await Promise.all(
      imageFiles.map((file) => this.cloudinary.uploadImage(file, 'products')),
    );

    const product = await this.prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          ...dto,
          shopId,
          images: imageUrls,
        },
      });

      await tx.shop.update({
        where: { id: shopId },
        data: { productsCount: { increment: 1 } },
      });

      return newProduct;
    });

    return this.mapToResponseDto(product);
  }

  async getProductsByShop(
    shopId: string,
    page = 1,
    limit = 20,
    currentUserId?: string,
  ): Promise<ProductListResponseDto> {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) {
      throw new NotFoundException('Shop not found');
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { shopId },
        orderBy: { createdAt: 'desc' },
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
      this.prisma.product.count({ where: { shopId } }),
    ]);

    const productsWithLiked = await Promise.all(
      products.map(async (product) => {
        let likedByUser = false;
        if (currentUserId) {
          const like = await this.prisma.like.findUnique({
            where: {
              userId_productId: {
                userId: currentUserId,
                productId: product.id,
              },
            },
          });
          likedByUser = !!like;
        }
        return {
          ...product,
          price: Number(product.price),
          likedByUser,
        } as ProductResponseDto;
      }),
    );

    return {
      products: productsWithLiked,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getProductById(productId: string, currentUserId?: string): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
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

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let likedByUser = false;
    if (currentUserId) {
      const like = await this.prisma.like.findUnique({
        where: {
          userId_productId: {
            userId: currentUserId,
            productId: product.id,
          },
        },
      });
      likedByUser = !!like;
    }

    return {
      ...product,
      price: Number(product.price),
      likedByUser,
    } as ProductResponseDto;
  }

  async updateProduct(
    productId: string,
    ownerId: string,
    dto: UpdateProductDto,
    imageFiles?: Express.Multer.File[],
  ): Promise<ProductResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { shop: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.shop.ownerId !== ownerId) {
      throw new ForbiddenException('Only the shop owner can update this product');
    }

    let images = product.images;
    if (imageFiles && imageFiles.length > 0) {
      if (imageFiles.length > 5) {
        throw new BadRequestException('Maximum 5 images allowed per product');
      }
      images = await Promise.all(
        imageFiles.map((file) => this.cloudinary.uploadImage(file, 'products')),
      );
    }

    const updatedProduct = await this.prisma.product.update({
      where: { id: productId },
      data: {
        ...dto,
        images,
      },
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

    return this.mapToResponseDto(updatedProduct);
  }

  async deleteProduct(productId: string, ownerId: string): Promise<{ message: string }> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { shop: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.shop.ownerId !== ownerId) {
      throw new ForbiddenException('Only the shop owner can delete this product');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.product.delete({ where: { id: productId } });
      await tx.shop.update({
        where: { id: product.shopId },
        data: { productsCount: { decrement: 1 } },
      });
    });

    return { message: 'Product deleted successfully' };
  }

  async getProductDetail(
    productId: string,
    page = 1,
    limit = 20,
    currentUserId?: string,
  ): Promise<any> {
    const product = await this.getProductById(productId, currentUserId);

    const [comments, totalComments] = await Promise.all([
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
      ...product,
      comments: {
        items: comments,
        total: totalComments,
        page,
        limit,
        totalPages: Math.ceil(totalComments / limit),
      },
    };
  }

  private mapToResponseDto(product: any): ProductResponseDto {
    return {
      ...product,
      price: Number(product.price),
    };
  }
}