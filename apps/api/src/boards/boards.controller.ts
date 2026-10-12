import { Body, Controller, Get, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { SessionGuard } from '../auth/session.guard';
import { etag } from '../common/if-match';
import { BoardsService } from './boards.service';
import { CreateBoardRequest } from './boards.dto';

@Controller('boards') @UseGuards(SessionGuard)
export class BoardsController {
  constructor(private readonly boards: BoardsService) {}
  @Get() list(@Req() request: any, @Query('cursor') cursor?: unknown, @Query('limit') limit?: unknown) {
    return this.boards.list(request.auth.userId, cursor, limit);
  }
  @Post() async create(@Req() request: any, @Body() input: CreateBoardRequest, @Res({ passthrough: true }) response: Response) {
    const board = await this.boards.create(request.auth.userId, input);
    response.setHeader('ETag', etag(board.version));
    return board;
  }
}
