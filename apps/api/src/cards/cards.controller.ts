import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { SessionGuard } from '../auth/session.guard';
import { etag } from '../common/if-match';
import { CreateCardRequest, MoveCardRequest } from './cards.dto';
import { CardsService } from './cards.service';
@Controller()
@UseGuards(SessionGuard)
export class CardsController {
  constructor(private readonly cards: CardsService) {}
  @Post('columns/:columnId/cards') async create(
    @Param('columnId') id: string,
    @Req() req: any,
    @Body() input: CreateCardRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const card = await this.cards.create(id, req.auth.userId, input);
    res.setHeader('ETag', etag(card.version));
    return card;
  }
  @Post('cards/:cardId/move') @HttpCode(200) async move(
    @Param('cardId') id: string,
    @Req() req: any,
    @Body() input: MoveCardRequest,
    @Headers('if-match') match: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const card = await this.cards.move(id, req.auth.userId, input, match);
    res.setHeader('ETag', etag(card.version));
    return card;
  }
}
