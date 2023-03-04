import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { IORedisKey } from 'src/redis.module';
import {
  AddNominationData,
  AddParticipantData,
  CreatePollData,
  RemoveNominationFields,
  RemoveParticipantData,
} from './types';
import { Poll } from 'shared';
import { error } from 'console';

@Injectable()
export class PollsRepository {
  // to use time-to-live from configuration
  private readonly ttl: string;
  private readonly logger = new Logger(PollsRepository.name);

  constructor(
    configService: ConfigService,
    @Inject(IORedisKey) private readonly redisClient: Redis,
  ) {
    this.ttl = configService.get('POLL_DURATION');
  }

  /**

  Create a new poll in Redis with the specified topic, votes per voter, poll ID, and admin ID.
  @param {CreatePollData} data - The data required to create a poll.
  @param {number} data.votesPerVoter - The number of votes allowed per voter.
  @param {string} data.topic - The topic of the poll.
  @param {string} data.pollID - The ID of the poll.
  @param {string} data.userID - The ID of the user creating the poll.
  @returns {Promise<Poll>} - The newly created poll.
  @throws {InternalServerErrorException} - Throws an error if creating the poll fails.
  */
  async createPoll({
    votesPerVoter,
    topic,
    pollID,
    userID,
  }: CreatePollData): Promise<Poll> {
    // Create initial poll object with specified details
    const initialPoll = {
      id: pollID,
      topic,
      votesPerVoter,
      participants: {},
      nominations: {},
      adminID: userID,
      hasStarted: false,
    };

    // Log creation of poll object
    this.logger.log(
      `Creating new poll: ${JSON.stringify(initialPoll, null, 2)} with TTL ${
        this.ttl
      }`,
    );

    // Set Redis key-value pair for the new poll with a specified time to live (TTL)
    const key = `polls:${pollID}`;
    try {
      await this.redisClient
        .multi([
          ['send_command', 'JSON.SET', key, '.', JSON.stringify(initialPoll)],
          ['expire', key, this.ttl],
        ])
        .exec();
      return initialPoll;
    } catch (error) {
      // Log and throw error if creation of poll fails
      this.logger.error(
        `Failed to add poll ${JSON.stringify(initialPoll)}\n${error}`,
      );
      throw new InternalServerErrorException();
    }
  }

  /**

  Get an existing poll from Redis.
  @param {string} pollID - The ID of the poll.
  @returns {Promise<Poll>} - The poll retrieved from Redis.
  @throws {Error} - Throws an error if getting the poll from Redis fails.
  */
  async getPoll(pollID: string): Promise<Poll> {
    // Log attempt to retrieve poll
    this.logger.log(`Attempting to get poll with: ${pollID}`);

    // Retrieve poll from Redis using pollID
    const key = `polls:${pollID}`;
    try {
      const currentPoll = await this.redisClient.send_command(
        'JSON.GET',
        key,
        '.',
      );
      this.logger.verbose(currentPoll);
      return JSON.parse(currentPoll);
    } catch (error) {
      // Log and throw error if retrieval of poll fails
      const errorMessage = `Failed to get pollID: ${pollID}`;
      this.logger.error(errorMessage);
      throw new InternalServerErrorException(errorMessage);
    }
  }

  /**
   * Add a participant to a poll.
   *
   * @param {AddParticipantData} data - Object containing the pollID, userID, and name of the participant to add.
   * @returns {Promise<Poll>} The updated poll object with the added participant.
   */
  async addParticipant({
    pollID,
    userID,
    name,
  }: AddParticipantData): Promise<Poll> {
    // Log that we are attempting to add a participant to the poll with the provided userID and name.
    this.logger.log(
      `Attempting to add a participant with userID/name: ${userID}/${name} to pollID: ${pollID}`,
    );

    // Generate the Redis key and participant path strings for the poll and participant, respectively.
    const key = `polls:${pollID}`;
    const participantPath = `.participants.${userID}`;

    try {
      // Use the JSON.SET command to set the value of a specific JSON path within a Redis key.
      // This command sets the name of the participant at the path ".participants.<userID>" within the poll object.
      await this.redisClient.send_command(
        'JSON.SET',
        key,
        participantPath,
        JSON.stringify(name),
      );
      // Get an existing poll from Redis
      return this.getPoll(pollID);
    } catch (error) {
      // If an error occurred while adding the participant, log the error and re-throw it.
      const errorMessage = `Failed to add a participant with userID/name: ${userID}/${name} to pollID: ${pollID}`;
      this.logger.error(errorMessage);
      throw new InternalServerErrorException(errorMessage);
    }
  }

  /**
  Remove a participant from a poll in Redis and returns the updated poll.
  @param {RemoveParticipantData} data - The data required to remove a participant from a poll.
  @param {string} data.pollID - The ID of the poll.
  @param {string} data.userID - The ID of the user to remove from the poll participants.
  @returns {Promise<Poll>} - The updated poll with the participant removed.
  @throws {Error} - Throws an error if removing the participant from the poll fails.
  */
  async removeParticipant({
    pollID,
    userID,
  }: RemoveParticipantData): Promise<Poll> {
    // Log the removal of the participant.
    this.logger.log(`removing userID: ${userID} from poll: ${pollID}`);

    // Construct the Redis key and JSON path for the participant.
    const key = `polls:${pollID}`;
    const participantPath = `.participants.${userID}`;

    try {
      // Remove the participant from the poll using the Redis JSON.DEL command.
      await this.redisClient.send_command('JSON.DEL', key, participantPath);

      // Return the updated poll without the removed participant.
      return this.getPoll(pollID);
    } catch (error) {
      // Log an error if the participant removal fails.
      const errorMessage = `Failed to remove userID: ${userID} from poll: ${pollID}`;
      this.logger.error(errorMessage);
      throw new InternalServerErrorException(errorMessage);
    }
  }

  async addNomination({
    pollID,
    nominationID,
    nomination,
  }: AddNominationData): Promise<Poll> {
    this.logger.log(
      `Attempting to add a nomination with nominationID/nomination: ${nominationID}/${nomination.text} to pollID: ${pollID}`,
    );
    const key = `polls:${pollID}`;
    const nominationPath = `.nominations.${nominationID}`;

    try {
      await this.redisClient.send_command(
        'JSON.SET',
        key,
        nominationPath,
        JSON.stringify(nomination),
      );
      return this.getPoll(pollID);
    } catch (error) {
      const errorMessage = `Failed to add a nomination with nominationID/text: ${nominationID}/${nomination.text} to pollID: ${pollID}`;
      this.logger.error(errorMessage, error);
      throw new InternalServerErrorException(errorMessage);
    }
  }

  async removeNomination({
    pollID,
    nominationID,
  }: RemoveNominationFields): Promise<Poll> {
    this.logger.log(
      `removing nominationID; ${nominationID} from poll: ${pollID}`,
    );

    const key = `polls:${pollID}`;
    const nominationPath = `.nominations.${nominationID}`;

    try {
      await this.redisClient.send_command('JSON.DEL', key, nominationPath);
      return this.getPoll(pollID);
    } catch (error) {
      const errorMessage = `Failed to remove nominationID: ${nominationID} from poll: ${pollID}`;
      throw new InternalServerErrorException(errorMessage);
    }
  }

  // async startPoll(){}

  // async addParticipantRankings(){}

  // async addResults(){}

  // async deletePoll() {}
}
