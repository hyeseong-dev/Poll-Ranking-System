import { Body, Controller, Logger, Post } from '@nestjs/common';
import { CreatePollDto, JoinPollDto } from './dtos';
import { PollService } from './polls.service';

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

  @Post('/rejoin')
  async rejoin() {
    Logger.log('In rejoin!');
    const result = await this.pollService.rejoinPoll({
      name: 'from token',
      userID: 'userID',
      pollID: 'pollID',
    });
    return result;
  }
}
