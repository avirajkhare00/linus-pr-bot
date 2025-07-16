export interface Config {
  github: {
    token: string;
    webhookSecret?: string;
    appId?: string;
    privateKeyPath?: string;
    owner?: string;
    repo?: string;
  };
  openai: {
    apiKey?: string;
  };
  server: {
    port: number;
    nodeEnv: string;
  };
  bot: {
    name: string;
    email: string;
  };
  webhook: {
    url?: string;
    path: string;
  };
}

export const config: Config = {
  github: {
    token: process.env.GITHUB_TOKEN || '',
    webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    appId: process.env.GITHUB_APP_ID,
    privateKeyPath: process.env.GITHUB_PRIVATE_KEY_PATH,
    owner: process.env.GITHUB_OWNER,
    repo: process.env.GITHUB_REPO,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  bot: {
    name: process.env.BOT_NAME || 'linus-pr-bot',
    email: process.env.BOT_EMAIL || 'bot@example.com',
  },
  webhook: {
    url: process.env.WEBHOOK_URL,
    path: process.env.WEBHOOK_PATH || '/webhook',
  },
};

// Validate required configuration
export function validateConfig(): void {
  if (!config.github.token) {
    throw new Error('GITHUB_TOKEN is required');
  }

  if (config.server.nodeEnv === 'production' && !config.github.webhookSecret) {
    console.warn('GITHUB_WEBHOOK_SECRET is recommended for production');
  }

  console.log('✅ Configuration validated');
}
