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

      // ✅ RESPOND TO GITHUB IMMEDIATELY (prevents timeout)
      res.status(200).json({ message: 'Webhook received', event, action: payload.action });

      // ✅ PROCESS ASYNCHRONOUSLY (don't await - let it run in background)
      if (event === 'pull_request') {
        this.handlePullRequestEvent(payload).catch(error => {
          console.error('Background PR processing failed:', error);
        });
      }

    } catch (error) {
      console.error('Error handling webhook:', error);
      // Only send error response if we haven't responded yet
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
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
    const startTime = Date.now();
    try {
      console.log(`🔍 Reviewing PR #${pullNumber} in ${owner}/${repo}`);

      // Add timeout wrapper to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Review timeout after 45 seconds')), 45000);
      });

      const reviewPromise = this.performReview(owner, repo, pullNumber);

      // Race between review completion and timeout
      await Promise.race([reviewPromise, timeoutPromise]);

      const duration = Date.now() - startTime;
      console.log(`✅ Successfully reviewed PR #${pullNumber} in ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Error reviewing PR #${pullNumber} after ${duration}ms:`, error);
      // Don't re-throw - let it fail silently to avoid webhook issues
    }
  }

  /**
   * Perform the actual PR review (separated for timeout handling)
   */
  private async performReview(owner: string, repo: string, pullNumber: number): Promise<void> {
    // Get PR data
    const prData = await this.githubClient.getPullRequest(owner, repo, pullNumber);

    // Analyze the PR
    const analysis = await this.prAnalyzer.analyzePR(prData, owner, repo);

    // Generate Linus-style comment
    const comment = await this.linusGenerator.generateComment(analysis);

    // Post comment
    await this.githubClient.postComment(owner, repo, pullNumber, comment);
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
