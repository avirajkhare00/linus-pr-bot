import { Octokit } from '@octokit/rest';
import { config } from './config';

export interface PullRequestData {
  number: number;
  title: string;
  body: string;
  user: {
    login: string;
  };
  head: {
    sha: string;
    ref: string;
  };
  base: {
    sha: string;
    ref: string;
  };
  additions: number;
  deletions: number;
  changed_files: number;
  commits: number;
  mergeable: boolean | null;
  draft: boolean;
  created_at: string;
  updated_at: string;
}

export interface FileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
}

export class GitHubClient {
  private octokit: Octokit;

  constructor() {
    this.octokit = new Octokit({
      auth: config.github.token,
      userAgent: config.bot.name,
    });
  }

  /**
   * Get pull request data
   */
  async getPullRequest(owner: string, repo: string, pullNumber: number): Promise<PullRequestData> {
    try {
      const { data } = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: pullNumber,
      });

      return {
        number: data.number,
        title: data.title,
        body: data.body || '',
        user: {
          login: data.user?.login || 'unknown',
        },
        head: {
          sha: data.head.sha,
          ref: data.head.ref,
        },
        base: {
          sha: data.base.sha,
          ref: data.base.ref,
        },
        additions: data.additions || 0,
        deletions: data.deletions || 0,
        changed_files: data.changed_files || 0,
        commits: data.commits || 0,
        mergeable: data.mergeable,
        draft: data.draft || false,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };
    } catch (error) {
      console.error(`Error fetching PR #${pullNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get files changed in the pull request
   */
  async getPullRequestFiles(owner: string, repo: string, pullNumber: number): Promise<FileChange[]> {
    try {
      const { data } = await this.octokit.rest.pulls.listFiles({
        owner,
        repo,
        pull_number: pullNumber,
      });

      return data.map(file => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes,
        patch: file.patch,
      }));
    } catch (error) {
      console.error(`Error fetching PR files for #${pullNumber}:`, error);
      throw error;
    }
  }

  /**
   * Post a comment on the pull request
   */
  async postComment(owner: string, repo: string, pullNumber: number, body: string): Promise<void> {
    try {
      await this.octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pullNumber,
        body,
      });
      console.log(`✅ Posted comment on PR #${pullNumber}`);
    } catch (error) {
      console.error(`Error posting comment on PR #${pullNumber}:`, error);
      throw error;
    }
  }

  /**
   * Get existing comments on the pull request
   */
  async getComments(owner: string, repo: string, pullNumber: number): Promise<Array<{ id: number; body: string; user: { login: string } }>> {
    try {
      const { data } = await this.octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pullNumber,
      });

      return data.map(comment => ({
        id: comment.id,
        body: comment.body || '',
        user: {
          login: comment.user?.login || 'unknown',
        },
      }));
    } catch (error) {
      console.error(`Error fetching comments for PR #${pullNumber}:`, error);
      throw error;
    }
  }

  /**
   * Check if the bot has already commented on this PR
   */
  async hasAlreadyCommented(owner: string, repo: string, pullNumber: number): Promise<boolean> {
    try {
      const comments = await this.getComments(owner, repo, pullNumber);
      const botName = config.bot.name;

      return comments.some(comment =>
        comment.user.login.includes(botName) ||
        comment.body.includes('<!-- linus-pr-bot -->')
      );
    } catch (error) {
      console.error('Error checking existing comments:', error);
      return false;
    }
  }

  /**
   * Get commit messages for the pull request
   */
  async getCommits(owner: string, repo: string, pullNumber: number): Promise<Array<{ message: string; sha: string }>> {
    try {
      const { data } = await this.octokit.rest.pulls.listCommits({
        owner,
        repo,
        pull_number: pullNumber,
      });

      return data.map(commit => ({
        message: commit.commit.message,
        sha: commit.sha,
      }));
    } catch (error) {
      console.error(`Error fetching commits for PR #${pullNumber}:`, error);
      throw error;
    }
  }
}
