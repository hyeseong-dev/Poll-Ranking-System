import { Body, Controller, Logger, Post, Req, UseGuards } from '@nestjs/common';
import { ControllerAuthGuard } from './controller-auth.guard';
import { CreatePollDto, JoinPollDto } from './dtos';
import { PollService } from './polls.service';
import { RequestWithAuth } from './types';

@Controller('polls')
export class PollsController {
  constructor(private readonly pollService: PollService) {}

  @Post()
  async create(@Body() createPollDto: CreatePollDto) {
    const result = await this.pollService.createPoll(createPollDto);
    return result;
  }

  @Post('/join')
  async join(@Body() joinPollDto: JoinPollDto) {
    Logger.log('In join!');
    const result = await this.pollService.joinPoll(joinPollDto);
    return result;
  }

  @UseGuards(ControllerAuthGuard)
  @Post('/rejoin')
  async rejoin(@Req() request: RequestWithAuth) {
    const { userID, pollID, name } = request;
    const result = await this.pollService.rejoinPoll({ name, userID, pollID });
    return result;
  }
}
