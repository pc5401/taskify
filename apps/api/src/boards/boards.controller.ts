import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { SessionGuard } from '../auth/session.guard';
import { etag } from '../common/if-match';
import { BoardsService } from './boards.service';
import { CreateBoardRequest } from './boards.dto';
import { BoardReadsService } from './board-reads.service';

@Controller('boards') @UseGuards(SessionGuard)
export class BoardsController {
  constructor(private readonly boards: BoardsService, private readonly reads: BoardReadsService) {}
  @Get() list(@Req() request: any, @Query('cursor') cursor?: unknown, @Query('limit') limit?: unknown) {
    return this.boards.list(request.auth.userId, cursor, limit);
  }
  @Post() async create(@Req() request: any, @Body() input: CreateBoardRequest, @Res({ passthrough: true }) response: Response) {
    const board = await this.boards.create(request.auth.userId, input);
    response.setHeader('ETag', etag(board.version));
    return board;
  }
  @Get(':boardId') async board(@Param('boardId') boardId: string, @Req() request: any, @Res({ passthrough: true }) response: Response) {
    const board = await this.reads.board(boardId, request.auth.userId);
    response.setHeader('ETag', etag(board.version));
    return board;
  }
  @Get(':boardId/members') members(@Param('boardId') boardId: string, @Req() request: any) {
    return this.reads.members(boardId, request.auth.userId);
  }
  @Get(':boardId/columns') columns(@Param('boardId') boardId: string, @Req() request: any) {
    return this.reads.columns(boardId, request.auth.userId);
  }
  @Get(':boardId/cards') cards(@Param('boardId') boardId: string, @Req() request: any, @Query() query: Record<string, unknown>) {
    return this.reads.cards(boardId, request.auth.userId, query);
  }
}
