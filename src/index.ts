import express from 'express';
import dotenv from 'dotenv';
import { WebhookHandler } from './webhook-handler';
import { GitHubClient } from './github-client';
import { LinusGenerator } from './linus-generator';
import { PRAnalyzer } from './pr-analyzer';
import { config, validateConfig } from './config';

// Load environment variables
dotenv.config();

// Validate configuration
validateConfig();

class LinusPRBot {
  private app: express.Application;
  private githubClient: GitHubClient;
  private linusGenerator: LinusGenerator;
  private prAnalyzer: PRAnalyzer;
  private webhookHandler: WebhookHandler;

  constructor() {
    this.app = express();
    this.githubClient = new GitHubClient();
    this.linusGenerator = new LinusGenerator();
    this.prAnalyzer = new PRAnalyzer();
    this.webhookHandler = new WebhookHandler(
      this.githubClient,
      this.prAnalyzer,
      this.linusGenerator
    );

    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(express.json());
    this.app.use(express.raw({ type: 'application/json' }));
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'OK', timestamp: new Date().toISOString() });
    });

    // Webhook endpoint
    this.app.post('/webhook', (req, res) => {
      this.webhookHandler.handleWebhook(req, res);
    });

    // Manual trigger endpoint for testing
    this.app.post('/review/:owner/:repo/:pull_number', async (req, res) => {
      try {
        const { owner, repo, pull_number } = req.params;
        await this.reviewPR(owner, repo, parseInt(pull_number));
        res.json({ message: 'PR review completed' });
      } catch (error) {
        console.error('Error reviewing PR:', error);
        res.status(500).json({ error: 'Failed to review PR' });
      }
    });
  }

  private async reviewPR(owner: string, repo: string, pullNumber: number): Promise<void> {
    try {
      console.log(`Reviewing PR #${pullNumber} in ${owner}/${repo}`);

      // Get PR data
      const prData = await this.githubClient.getPullRequest(owner, repo, pullNumber);

      // Analyze the PR
      const analysis = await this.prAnalyzer.analyzePR(prData, owner, repo);

      // Generate Linus-style comment
      const comment = await this.linusGenerator.generateComment(analysis);

      // Post comment
      await this.githubClient.postComment(owner, repo, pullNumber, comment);

      console.log(`Successfully reviewed and commented on PR #${pullNumber}`);
    } catch (error) {
      console.error(`Error reviewing PR #${pullNumber}:`, error);
      throw error;
    }
  }

  public start(): void {
    const port = config.server.port || 3000;
    this.app.listen(port, () => {
      console.log(`🤖 Linus PR Bot is running on port ${port}`);
      console.log(`💬 Webhook endpoint: http://localhost:${port}/webhook`);
      console.log(`❤️  Health check: http://localhost:${port}/health`);
    });
  }
}

// Start the bot
const bot = new LinusPRBot();
bot.start();
