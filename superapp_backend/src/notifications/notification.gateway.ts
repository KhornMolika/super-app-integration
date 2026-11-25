import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  handleConnection(client: Socket) {
    this.logger.log('Client connected: ' + client.id);
    const userId = client.handshake?.auth?.userId;
    if (typeof userId === 'string' && userId.trim()) {
      void client.join(`user:${userId.trim()}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log('Client disconnected: ' + client.id);
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { userId?: string },
  ) {
    const userId = payload?.userId?.trim();
    if (userId) {
      void client.join(`user:${userId}`);
    }
  }

  emitNotification(notification: any) {
    if (!this.server) return;
    const targetUserId = notification?.data?.userId || notification?.userId;
    if (targetUserId) {
      this.server
        .to(`user:${targetUserId}`)
        .emit('notification.created', notification);
    }
  }

  emitStageUpdate(data: any) {
    if (this.server) {
      this.server.emit('miniapp.stage_updated', data);
    }
  }

  emitBuildStageUpdate(data: any) {
    if (this.server) {
      this.server.emit('miniapp.build_stage_updated', data);
    }
  }

  emitBuildCompleted(data: any) {
    if (this.server) {
      this.server.emit('miniapp.build_completed', data);
    }
  }

  emitSandboxBuildUpdated(data: any) {
    if (this.server) {
      this.server.emit('superapp.sandbox_build_updated', data);
    }
  }

  emitSuperAppWebUpdated(data: any) {
    if (this.server) {
      this.server.emit('superapp.web_updated', data);
    }
  }
}
