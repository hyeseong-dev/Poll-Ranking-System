import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Poll } from 'shared';
import { createNominationID, createPollID, createUserID } from 'src/ids';
import { PollsRepository } from './polls.repository';
import {
  AddNominationFields,
  AddParticipantFields,
  CreatePollFields,
  JoinPollFields,
  ReJoinPollFields,
  RemoveNominationFields,
  RemoveParticipantFields,
} from './types';

/**
 * Service for managing polls and their participants.
 */
@Injectable()
export class PollsService {
  // Create a logger instance to log information about the service.
  private readonly logger = new Logger(PollsService.name);

  /**
   * Create a new PollsService.
   * @param pollsRepository - The repository for managing polls.
   * @param jwtService - The JWT service for creating access tokens.
   */
  constructor(
    private readonly pollsRepository: PollsRepository,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Create a new poll with the given fields.
   * @param fields - The fields for the new poll.
   * @returns An object containing the created poll and an access token for the creator.
   */
  async createPoll(fields: CreatePollFields) {
    // Generate a unique ID for the poll and for the creator.
    const pollID = createPollID();
    const userID = createUserID();

    // Create the poll using the repository.
    const createdPoll = await this.pollsRepository.createPoll({
      ...fields,
      pollID,
      userID,
    });

    // Create a JWT access token for the creator.
    this.logger.debug(
      `Creating token string for pollID: ${createdPoll.id} and userID: ${userID}`,
    );
    const signedString = this.jwtService.sign(
      { pollID: createdPoll.id, name: fields.name },
      { subject: userID },
    );

    // Return the created poll and access token.
    return {
      poll: createdPoll,
      accessToken: signedString,
    };
  }

  /**
   * Join an existing poll with the given fields.
   * @param fields - The fields for joining the poll.
   * @returns An object containing the joined poll and an access token for the participant.
   */
  async joinPoll(fields: JoinPollFields) {
    // Generate a unique ID for the participant.
    const userID = createUserID();

    // Get the poll with the given ID.
    this.logger.debug(
      `Fetching poll with ID: ${fields.pollID} for user with ID: ${userID}`,
    );
    const joinedPoll = await this.pollsRepository.getPoll(fields.pollID);

    // Create a JWT access token for the participant.
    this.logger.debug(
      `Creating token string for pollID: ${joinedPoll.id} and userID: ${userID}`,
    );
    const signedString = this.jwtService.sign(
      { pollID: joinedPoll.id, name: fields.name },
      { subject: userID },
    );

    // Return the joined poll and access token.
    return {
      poll: joinedPoll,
      accessToken: signedString,
    };
  }

  /**
   * Rejoin an existing poll as a participant with the given fields.
   * @param fields - The fields for rejoining the poll.
   * @returns The joined poll.
   */
  async rejoinPoll(fields: ReJoinPollFields) {
    // Add the participant to the poll using the repository.
    this.logger.debug(
      `Rejoining poll with ID: ${fields.pollID} for user with ID: ${fields.userID} with name: ${fields.name}`,
    );
    const joinedPoll = await this.pollsRepository.addParticipant(fields);
    return joinedPoll;
  }

  /**
   * Adds a participant to an existing poll.
   * @async
   * @param addParticipant - An object containing fields to add a participant to a poll.
   * @returns Returns the updated poll.
   */
  async addParticipant(addParticipant: AddParticipantFields): Promise<Poll> {
    return this.pollsRepository.addParticipant(addParticipant);
  }

  /**
   * Removes a participant from an existing poll.
   * @async
   * @param removeParticipant - An object containing fields to remove a participant from a poll.
   * @returns Returns the updated poll or void if the poll has already started.
   */
  async removeParticipant(
    removeParticipant: RemoveParticipantFields,
  ): Promise<Poll | void> {
    // Get the poll with the given ID.
    const poll = await this.pollsRepository.getPoll(removeParticipant.pollID);

    // If the poll hasn't started, remove the participant using the repository.
    if (!poll.hasStarted) {
      const updatedPoll = await this.pollsRepository.removeParticipant(
        removeParticipant,
      );
      return updatedPoll;
    }
  }
  /**
   * Gets a poll with the given ID.
   * @async
   * @param pollID - The ID of the poll to get.
   * @returns Returns the poll with the given ID.
   */
  async getPoll(pollID: string): Promise<Poll> {
    return this.pollsRepository.getPoll(pollID);
  }

  async addNomination({
    pollID,
    userID,
    text,
  }: AddNominationFields): Promise<Poll> {
    return this.pollsRepository.addNomination({
      pollID,
      nominationID: createNominationID(),
      nomination: {
        userID,
        text,
      },
    });
  }

  async removeNomination(
    removeNomination: RemoveNominationFields,
  ): Promise<Poll> {
    return this.pollsRepository.removeNomination(removeNomination);
  }
}
