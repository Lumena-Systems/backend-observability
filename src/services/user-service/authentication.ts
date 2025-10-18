import { UserSession } from '../../types/user';
import { createLogger } from '../../lib/logger';
import cache from '../../lib/cache';

const logger = createLogger('authentication');

export class AuthenticationService {
  async createSession(userId: string, customerId: string): Promise<UserSession> {
    const session: UserSession = {
      sessionId: `sess_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      customerId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    await cache.set(`session:${session.sessionId}`, session, 86400);
    logger.info('Session created', { sessionId: session.sessionId, userId });

    return session;
  }

  async validateSession(sessionId: string): Promise<UserSession | null> {
    const session = await cache.get(`session:${sessionId}`);
    
    if (!session || new Date(session.expiresAt) < new Date()) {
      return null;
    }

    return session;
  }

  async destroySession(sessionId: string): Promise<void> {
    await cache.del(`session:${sessionId}`);
    logger.info('Session destroyed', { sessionId });
  }
}

