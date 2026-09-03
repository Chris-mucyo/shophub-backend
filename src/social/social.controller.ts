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
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';

import { SocialService } from './social.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import {
  ToggleResponseDto,
  CommentResponseDto,
  CommentListResponseDto,
} from './dto/social-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('social')
@Controller()
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  // ========== FOLLOW ==========

  @Post('shops/:id/follow')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Follow a shop' })
  @ApiParam({ name: 'id', description: 'Shop ID' })
  @ApiResponse({ status: 200, type: ToggleResponseDto })
  @ApiResponse({ status: 400, description: 'Already following or cannot follow own shop' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async followShop(
    @Param('id') shopId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.socialService.followShop(userId, shopId);
  }

  @Delete('shops/:id/follow')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unfollow a shop' })
  @ApiParam({ name: 'id', description: 'Shop ID' })
  @ApiResponse({ status: 200, type: ToggleResponseDto })
  @ApiResponse({ status: 400, description: 'Not following this shop' })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async unfollowShop(
    @Param('id') shopId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.socialService.unfollowShop(userId, shopId);
  }

  @Get('shops/:id/followers')
  @ApiOperation({ summary: 'Get shop followers (paginated)' })
  @ApiParam({ name: 'id', description: 'Shop ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Shop not found' })
  async getShopFollowers(
    @Param('id') shopId: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 20,
  ) {
    return this.socialService.getShopFollowers(shopId, page, limit);
  }

  @Get('me/following')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get shops current user is following' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200 })
  async getMyFollowingShops(
    @CurrentUser('id') userId: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 20,
  ) {
    return this.socialService.getUserFollowingShops(userId, page, limit);
  }

  // ========== LIKE ==========

  @Post('products/:id/like')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like/Unlike a product (toggle)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 200, type: ToggleResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async toggleLike(
    @Param('id') productId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.socialService.likeProduct(userId, productId);
  }

  @Get('products/:id/likes')
  @ApiOperation({ summary: 'Get product likes (paginated)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getProductLikes(
    @Param('id') productId: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 20,
  ) {
    return this.socialService.getProductLikes(productId, page, limit);
  }

  // ========== COMMENT ==========

  @Post('products/:id/comments')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add comment to product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiResponse({ status: 201, type: CommentResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async addComment(
    @Param('id') productId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.socialService.addComment(userId, productId, dto);
  }

  @Get('products/:id/comments')
  @ApiOperation({ summary: 'Get product comments (paginated)' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: CommentListResponseDto })
  @ApiResponse({ status: 404, description: 'Product not found' })
  async getComments(
    @Param('id') productId: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 20,
  ) {
    return this.socialService.getComments(productId, page, limit);
  }

  @Patch('comments/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, type: CommentResponseDto })
  @ApiResponse({ status: 403, description: 'Can only update own comments' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async updateComment(
    @Param('id') commentId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.socialService.updateComment(commentId, userId, dto);
  }

  @Delete('comments/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete own comment' })
  @ApiParam({ name: 'id', description: 'Comment ID' })
  @ApiResponse({ status: 200, description: 'Comment deleted' })
  @ApiResponse({ status: 403, description: 'Can only delete own comments' })
  @ApiResponse({ status: 404, description: 'Comment not found' })
  async deleteComment(
    @Param('id') commentId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.socialService.deleteComment(commentId, userId);
  }
}