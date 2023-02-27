import {
  Body,
  Controller,
  Logger,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ControllerAuthGuard } from './controller-auth.guard';
import { CreatePollDto, JoinPollDto } from './dtos';
import { PollsService } from './polls.service';
import { RequestWithAuth } from './types';

@UsePipes(new ValidationPipe())
@Controller('polls')
export class PollsController {
  constructor(private readonly pollsService: PollsService) {}

  @Post()
  async create(@Body() createPollDto: CreatePollDto) {
    const result = await this.pollsService.createPoll(createPollDto);
    return result;
  }

  @Post('/join')
  async join(@Body() joinPollDto: JoinPollDto) {
    Logger.log('In join!');
    const result = await this.pollsService.joinPoll(joinPollDto);
    return result;
  }

  @UseGuards(ControllerAuthGuard)
  @Post('/rejoin')
  async rejoin(@Req() request: RequestWithAuth) {
    const { userID, pollID, name } = request;
    const result = await this.pollsService.rejoinPoll({ name, userID, pollID });
    return result;
  }
}
