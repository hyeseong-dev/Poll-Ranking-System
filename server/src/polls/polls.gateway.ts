import {
  BadRequestException,
  Logger,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Namespace } from 'socket.io';
import { WsCatchAllFilter } from 'src/exceptions/ws-catch-all-filter';
import { NominationDto } from './dtos';
import { GatewayAdminGuard } from './gateway-admin.guard';
import { PollsService } from './polls.service';
import { SocketWithAuth } from './types';

/**
 * Validates incoming data from client and handles WebSocket connections
 * for Polls namespace
 */
@UsePipes(new ValidationPipe()) // Validate incoming data from client
@UseFilters(new WsCatchAllFilter()) // Handle exceptions that were not caught
@WebSocketGateway({ namespace: 'polls' }) // Set WebSocket namespace to "polls" // Implement WebSocket gateway interfaces // Implement WebSocket gateway interfaces // Implement WebSocket gateway interfaces
export class PollsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(PollsGateway.name); // Initialize logger with the gateway name

  constructor(private readonly pollsService: PollsService) {}

  @WebSocketServer() io: Namespace; // Initialize the WebSocket server instance

  /**
   * Called after gateway initialization
   */
  afterInit(): void {
    this.logger.log(`Websocket Gateway initialized.`);
  }

  /**
   * Handles WebSocket connection events
   * @param client The connected socket client
   */
  async handleConnection(client: SocketWithAuth) {
    const sockets = this.io.sockets; // Get all sockets connected to the server

    // Log details about the connected socket client
    this.logger.debug(
      `Socket connected with userID: ${client.userID}, pollID: ${client.pollID}, and name: "${client.name}"`,
    );

    this.logger.log(`WS Client with id: ${client.id} connected!`);
    this.logger.debug(`Number of connected sockets: ${sockets.size}`);

    const roomName = client.pollID; // Set the name of the room to the poll ID
    await client.join(roomName); // Add the socket client to the room with the given name

    const connectedClients = this.io.adapter.rooms?.get(roomName)?.size ?? 0; // Get the number of clients connected to the room

    this.logger.debug(
      `userID: ${client.userID} joined room with name: ${roomName}`,
    );
    this.logger.debug(
      `Total clients connected to room '${roomName}': ${connectedClients}`,
    );

    // Add the new participant to the poll and emit an update event to all clients in the room
    const updatedPoll = await this.pollsService.addParticipant({
      pollID: client.pollID,
      userID: client.userID,
      name: client.name,
    });
    this.io.to(roomName).emit('poll_updated', updatedPoll);
  }

  /**
   * Handles WebSocket disconnection events
   * @param client The disconnected socket client
   */
  async handleDisconnect(client: SocketWithAuth) {
    const sockets = this.io.sockets; // Get all sockets connected to the server

    const { pollID, userID } = client;
    const updatedPoll = await this.pollsService.removeParticipant({
      pollID,
      userID,
    }); // Remove the participant from the poll and get the updated poll state

    const roomName = client.pollID; // Get the name of the room to which the socket client was connected
    const clientCount = this.io.adapter.rooms?.get(roomName)?.size ?? 0; // Get the number of clients connected to the room

    this.logger.log(`Disconnected socket id: ${client.id}`);
    this.logger.debug(`Number of connected sockets: ${sockets.size}`);
    this.logger.debug(
      `Total clients connected to room '${roomName}': ${clientCount}`,
    );

    // updatedPoll could be undefined if the the poll already started
    // in this case, the socket is disconnected, but not the poll state
    if (updatedPoll) {
      this.io.to(pollID).emit('poll_updated', updatedPoll);
    }
  }

  @UseGuards(GatewayAdminGuard)
  @SubscribeMessage('remove_participant')
  async removeParticipant(
    @MessageBody('userID') userID: string,
    @ConnectedSocket() client: SocketWithAuth,
  ) {
    this.logger.debug(
      `Attempting to remove participant ${userID} from poll ${client.pollID}`,
    );

    const updatedPoll = await this.pollsService.removeParticipant({
      pollID: client.pollID,
      userID,
    });

    this.io.to(client.pollID).emit('poll_updated', updatedPoll);
  }

  @SubscribeMessage('nominate')
  async nominate(
    @MessageBody() nomination: NominationDto,
    @ConnectedSocket() client: SocketWithAuth,
  ): Promise<void> {
    this.logger.debug(`
    Attempting to add nomination for user ${client.userID} to poll ${client.pollID}\n ${nomination.text}`);

    const updatedPoll = await this.pollsService.addNomination({
      pollID: client.pollID,
      userID: client.userID,
      text: nomination.text,
    });

    this.io.to(client.pollID).emit('poll_updated', updatedPoll);
  }

  @UseGuards(GatewayAdminGuard)
  @SubscribeMessage('remove_nomination')
  async removeNomination(
    @MessageBody('nominationID') nominationID: string,
    @ConnectedSocket() client: SocketWithAuth,
  ): Promise<void> {
    this.logger.debug(
      `Attempting to remove nomination ${nominationID} from poll ${client.pollID}`,
    );

    const updatedPoll = await this.pollsService.removeNomination({
      pollID: client.pollID,
      nominationID,
    });

    this.io.to(client.pollID).emit('pol_updated', updatedPoll);
  }
}
