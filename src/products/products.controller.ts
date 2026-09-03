import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto, ProductListResponseDto } from './dto/product-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('products')
@Controller('shops/:shopId/products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('WHOLESALER')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Add product to shop (Wholesalers only)' })
  @ApiParam({ name: 'shopId', type: 'string' })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  @ApiResponse({ status: 403, description: 'Only shop owner can add products' })
  @UseInterceptors(FilesInterceptor('images', 5))
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createProduct(
    @Param('shopId') shopId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateProductDto,
    @UploadedFiles() images: Express.Multer.File[],
  ) {
    return this.productsService.createProduct(shopId, userId, dto, images);
  }

  @Get()
  @ApiOperation({ summary: 'List shop products (paginated)' })
  @ApiParam({ name: 'shopId', type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: ProductListResponseDto })
  async getProducts(
    @Param('shopId') shopId: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 20,
    @CurrentUser('id') currentUserId?: string,
  ) {
    return this.productsService.getProductsByShop(shopId, page, limit, currentUserId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product detail with like/comment status' })
  @ApiParam({ name: 'shopId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProduct(
    @Param('id') productId: string,
    @CurrentUser('id') currentUserId?: string,
  ) {
    return this.productsService.getProductById(productId, currentUserId);
  }

  @Get(':id/detail')
  @ApiOperation({ summary: 'Get product detail with comments (paginated)' })
  @ApiParam({ name: 'shopId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductDetail(
    @Param('id') productId: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 20,
    @CurrentUser('id') currentUserId?: string,
  ) {
    return this.productsService.getProductDetail(productId, page, limit, currentUserId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update product (Owner only)' })
  @ApiParam({ name: 'shopId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiResponse({ status: 403, description: 'Only shop owner can update' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @UseInterceptors(FilesInterceptor('images', 5))
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async updateProduct(
    @Param('id') productId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProductDto,
    @UploadedFiles() images: Express.Multer.File[],
  ) {
    return this.productsService.updateProduct(productId, userId, dto, images);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete product (Owner only)' })
  @ApiParam({ name: 'shopId', type: 'string' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, description: 'Product deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only shop owner can delete' })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async deleteProduct(
    @Param('id') productId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.productsService.deleteProduct(productId, userId);
  }
}