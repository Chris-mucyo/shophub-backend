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

import { ShopsService } from './shops.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';
import { ShopResponseDto, ShopListResponseDto } from './dto/shop-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('WHOLESALER')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a new shop (Wholesalers only)' })
  @ApiResponse({ status: 201, type: ShopResponseDto })
  @ApiResponse({ status: 403, description: 'Only approved wholesalers can create shops' })
  @UseInterceptors(FilesInterceptor('files', 2))
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createShop(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateShopDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const avatarFile = files.find((f) => f.fieldname === 'avatar');
    const coverFile = files.find((f) => f.fieldname === 'cover');
    return this.shopsService.createShop(userId, dto, avatarFile, coverFile);
  }

  @Get()
  @ApiOperation({ summary: 'List shops with filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'category', required: false, type: String })
  @ApiQuery({ name: 'location', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['followers', 'recent'], example: 'followers' })
  @ApiResponse({ status: 200, type: ShopListResponseDto })
  async getShops(
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 20,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('sortBy') sortBy: 'followers' | 'recent' = 'followers',
    @CurrentUser('id') currentUserId?: string,
  ) {
    return this.shopsService.getShops(page, limit, category, location, sortBy, currentUserId);
  }

  @Get('my-shop')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('WHOLESALER')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user shop' })
  @ApiResponse({ status: 200, type: ShopResponseDto })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async getMyShop(@CurrentUser('id') userId: string) {
    return this.shopsService.getMyShop(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get shop by ID' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiResponse({ status: 200, type: ShopResponseDto })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async getShop(
    @Param('id') shopId: string,
    @CurrentUser('id') currentUserId?: string,
  ) {
    return this.shopsService.getShopById(shopId, currentUserId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update shop (Owner only)' })
  @ApiResponse({ status: 200, type: ShopResponseDto })
  @ApiResponse({ status: 403, description: 'Only the shop owner can update' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  @UseInterceptors(FilesInterceptor('files', 2))
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async updateShop(
    @Param('id') shopId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateShopDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    const avatarFile = files.find((f) => f.fieldname === 'avatar');
    const coverFile = files.find((f) => f.fieldname === 'cover');
    return this.shopsService.updateShop(shopId, userId, dto, avatarFile, coverFile);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete shop (Owner only)' })
  @ApiResponse({ status: 200, description: 'Shop deleted successfully' })
  @ApiResponse({ status: 403, description: 'Only the shop owner can delete' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async deleteShop(
    @Param('id') shopId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.shopsService.deleteShop(shopId, userId);
  }
}