import { config } from '../config/env.config';

export const isClerkConfigured = Boolean(config.clerkSecretKey);
