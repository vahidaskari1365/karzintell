import {
  Body, Controller, Get, Param, ParseIntPipe, Post, Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CurrentUser, Public, RequirePermissions } from '../../common/decorators';
import { AuthUser } from '../../common/types';
import { ReviewsService } from './reviews.service';

class CreateReviewDto {
  @IsInt() @Min(1) @Max(5)
  rating: number;

  @IsOptional() @IsString() @MaxLength(150)
  title?: string;

  @IsOptional() @IsString() @MaxLength(2000)
  body?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  pros?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  cons?: string[];
}

class AskDto {
  @IsString() @IsNotEmpty() @MaxLength(1000)
  question: string;
}

class ModerateDto {
  @IsString() action: 'approve' | 'reject' | 'reply';

  @IsOptional() @IsString() @MaxLength(1000)
  body?: string;
}

class AnswerDto {
  @IsOptional() @IsString() @MaxLength(2000)
  answer?: string;
}

@ApiTags('reviews')
@Controller()
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Public()
  @Get('products/:id/reviews')
  async list(@Param('id', ParseIntPipe) id: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    const r = await this.service.listApproved(id, page, limit);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Post('products/:id/reviews')
  async create(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: CreateReviewDto) {
    return { data: await this.service.create(user.id, id, dto) };
  }

  @Public()
  @Get('products/:id/questions')
  async questions(@Param('id', ParseIntPipe) id: number, @Query('page') page?: string, @Query('limit') limit?: string) {
    const r = await this.service.listQuestions(id, page, limit);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Post('products/:id/questions')
  async ask(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: AskDto) {
    return { data: await this.service.ask(user.id, id, dto.question) };
  }
}

@ApiTags('admin/reviews')
@Controller('admin')
export class AdminReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get('reviews')
  @RequirePermissions('reviews.moderate')
  async list(@Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    const r = await this.service.adminList(status, page, limit);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Post('reviews/:id/moderate')
  @RequirePermissions('reviews.moderate')
  async moderate(@Param('id', ParseIntPipe) id: number, @Body() dto: ModerateDto) {
    return { data: await this.service.moderate(id, dto.action, dto.body) };
  }

  @Get('questions')
  @RequirePermissions('questions.moderate')
  async questions(@Query('status') status?: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    const r = await this.service.adminQuestions(status, page, limit);
    return { data: r.items, meta: { page: r.page, limit: r.limit, total: r.total } };
  }

  @Post('questions/:id/answer')
  @RequirePermissions('questions.moderate')
  async answer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AnswerDto,
    @CurrentUser() admin: AuthUser,
  ) {
    return { data: await this.service.answerQuestion(id, dto.answer, admin.id) };
  }
}
