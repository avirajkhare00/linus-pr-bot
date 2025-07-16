import { Request, Response } from 'express';
import crypto from 'crypto';
import { GitHubClient } from './github-client';
import { PRAnalyzer } from './pr-analyzer';
import { LinusGenerator } from './linus-generator';
import { config } from './config';

interface WebhookPayload {
  action: string;
  pull_request?: {
    number: number;
    state: string;
    draft: boolean;
    user: {
      login: string;
      type: string;
    };
  };
  repository?: {
    name: string;
    owner: {
      login: string;
    };
  };
}

export class WebhookHandler {
  private githubClient: GitHubClient;
  private prAnalyzer: PRAnalyzer;
  private linusGenerator: LinusGenerator;

  constructor(
    githubClient: GitHubClient,
    prAnalyzer: PRAnalyzer,
    linusGenerator: LinusGenerator
  ) {
    this.githubClient = githubClient;
    this.prAnalyzer = prAnalyzer;
    this.linusGenerator = linusGenerator;
  }

  /**
   * Handle GitHub webhook requests
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      // Verify webhook signature if secret is configured
      if (config.github.webhookSecret) {
        const isValid = this.verifySignature(req);
        if (!isValid) {
          console.warn('Invalid webhook signature');
          res.status(401).json({ error: 'Invalid signature' });
          return;
        }
      }

      const event = req.headers['x-github-event'] as string;
      const payload = req.body as WebhookPayload;

      console.log(`Received webhook: ${event} - ${payload.action}`);

      // Handle pull request events
      if (event === 'pull_request') {
        await this.handlePullRequestEvent(payload);
      }

      res.status(200).json({ message: 'Webhook processed' });
    } catch (error) {
      console.error('Error handling webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle pull request webhook events
   */
  private async handlePullRequestEvent(payload: WebhookPayload): Promise<void> {
    const { action, pull_request, repository } = payload;

    if (!pull_request || !repository) {
      console.log('Missing pull request or repository data');
      return;
    }

    const { number, state, draft, user } = pull_request;
    const { name: repo, owner } = repository;

    // Skip if PR is closed
    if (state === 'closed') {
      console.log(`Skipping closed PR #${number}`);
      return;
    }

    // Skip if it's a bot (avoid infinite loops)
    if (user.type === 'Bot' || user.login.includes('bot')) {
      console.log(`Skipping bot PR from ${user.login}`);
      return;
    }

    // Handle relevant actions
    const relevantActions = ['opened', 'ready_for_review', 'synchronize'];

    if (!relevantActions.includes(action)) {
      console.log(`Skipping action: ${action}`);
      return;
    }

    // Skip draft PRs unless they're ready for review
    if (draft && action !== 'ready_for_review') {
      console.log(`Skipping draft PR #${number}`);
      return;
    }

    // Check if we've already commented on this PR
    const hasCommented = await this.githubClient.hasAlreadyCommented(
      owner.login,
      repo,
      number
    );

    if (hasCommented && action !== 'synchronize') {
      console.log(`Already commented on PR #${number}`);
      return;
    }

    // Review the PR
    await this.reviewPullRequest(owner.login, repo, number);
  }

  /**
   * Review a pull request and post comment
   */
  private async reviewPullRequest(owner: string, repo: string, pullNumber: number): Promise<void> {
    try {
      console.log(`🔍 Reviewing PR #${pullNumber} in ${owner}/${repo}`);

      // Get PR data
      const prData = await this.githubClient.getPullRequest(owner, repo, pullNumber);

      // Analyze the PR
      const analysis = await this.prAnalyzer.analyzePR(prData, owner, repo);

      // Generate Linus-style comment
      const comment = await this.linusGenerator.generateComment(analysis);

      // Post comment
      await this.githubClient.postComment(owner, repo, pullNumber, comment);

      console.log(`✅ Successfully reviewed and commented on PR #${pullNumber}`);
    } catch (error) {
      console.error(`❌ Error reviewing PR #${pullNumber}:`, error);
      throw error;
    }
  }

  /**
   * Verify GitHub webhook signature
   */
  private verifySignature(req: Request): boolean {
    const signature = req.headers['x-hub-signature-256'] as string;
    const payload = JSON.stringify(req.body);
    const secret = config.github.webhookSecret;

    if (!signature || !secret) {
      return false;
    }

    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex')}`;

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Process pending webhooks (for manual testing)
   */
  async processPendingReviews(owner: string, repo: string): Promise<void> {
    try {
      console.log(`🔍 Checking for unreviewed PRs in ${owner}/${repo}`);

      // This would require additional GitHub API calls to list open PRs
      // and check which ones need review. Implementation depends on specific needs.

      console.log('Manual review processing completed');
    } catch (error) {
      console.error('Error processing pending reviews:', error);
      throw error;
    }
  }
}
