import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ExceptionFilter,
} from '@nestjs/common';
import { SocketWithAuth } from 'src/polls/types';
import {
  WsBadRequestException,
  WsTypeException,
  WsUnknownException,
} from './ws-exceptions';

/**
 * Exception filter for WebSocket connections that handles all types of exceptions.
 */
@Catch()
export class WsCatchAllFilter implements ExceptionFilter {
  /**
   * Method that handles exceptions and sends them to the WebSocket client.
   *
   * @param exception The exception that was thrown.
   * @param host The arguments host object containing the WebSocket client.
   */
  catch(exception: Error, host: ArgumentsHost) {
    const socket: SocketWithAuth = host.switchToWs().getClient(); // Get the WebSocket client from the host

    if (exception instanceof BadRequestException) {
      // If the exception is a BadRequestException
      const exceptionData = exception.getResponse(); // Get the exception data
      const exceptionMessage = // Extract the exception message from the data
        exceptionData['message'] ?? exceptionData ?? exception.name;

      const wsException = new WsBadRequestException(exceptionMessage); // Create a WebSocket-specific exception
      socket.emit('exception', wsException.getError()); // Send the exception to the client
      return; // End the method execution
    }

    if (exception instanceof WsTypeException) {
      // If the Exception is a WsTypeException
      socket.emit('exception', exception.getError()); // Send the exception to the client
      return; // End the method execution
    }

    const wsException = new WsUnknownException(exception.message); // Create a generic WebSocket exception
    socket.emit('exception', wsException.getError()); // Send the exception to the client
  }
}
