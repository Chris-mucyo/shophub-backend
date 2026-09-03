import {
  Controller,
  Get,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';

import { FeedService } from './feed.service';
import {
  FeedResponseDto,
  TrendingResponseDto,
  DiscoverResponseDto,
} from './dto/feed-response.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('feed')
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get personalized feed for current user' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: FeedResponseDto })
  async getFeed(
    @CurrentUser('id') userId: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 20,
  ) {
    return this.feedService.getFeed(userId, page, limit);
  }

  @Get('trending')
  @ApiOperation({ summary: 'Get trending products (most engaged in last 7 days)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'days', required: false, type: Number, example: 7 })
  @ApiResponse({ status: 200, type: TrendingResponseDto })
  async getTrending(
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 20,
    @Query('days', ParseIntPipe) days = 7,
  ) {
    return this.feedService.getTrendingProducts(page, limit, days);
  }

  @Get('discover')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get suggested shops to follow' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: DiscoverResponseDto })
  async getDiscover(
    @CurrentUser('id') userId: string,
    @Query('page', ParseIntPipe) page = 1,
    @Query('limit', ParseIntPipe) limit = 20,
  ) {
    return this.feedService.getDiscoverShops(userId, page, limit);
  }
}