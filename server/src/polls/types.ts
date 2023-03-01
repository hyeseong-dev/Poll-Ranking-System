import { Request } from 'express';
import { Socket } from 'socket.io';

export type CreatePollFields = {
  topic: string;
  votesPerVoter: number;
  name: string;
};
export type JoinPollFields = {
  pollID: string;
  name: string;
};
export type ReJoinPollFields = {
  pollID: string;
  userID: string;
  name: string;
};

export interface AddParticipantFields {
  pollID: string;
  userID: string;
  name: string;
}
export interface RemoveParticipantFields {
  pollID: string;
  userID: string;
}

export type CreatePollData = {
  pollID: string;
  topic: string;
  votesPerVoter: number;
  userID: string;
};

export type AddParticipantData = {
  pollID: string;
  userID: string;
  name: string;
};

export type RemoveParticipantData = {
  pollID: string;
  userID: string;
};

// guard types
type AuthPayload = {
  userID: string;
  pollID: string;
  name: string;
};

export type RequestWithAuth = Request & AuthPayload;
export type SocketWithAuth = Socket & AuthPayload;
