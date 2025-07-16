import { PullRequestData, FileChange, GitHubClient } from './github-client';

export interface PRAnalysis {
  prData: PullRequestData;
  files: FileChange[];
  commits: Array<{ message: string; sha: string }>;
  summary: {
    totalChanges: number;
    linesAdded: number;
    linesDeleted: number;
    filesChanged: number;
    commits: number;
    isDraft: boolean;
    isMergeable: boolean | null;
  };
  issues: Issue[];
  positives: string[];
  concerns: string[];
}

export interface Issue {
  type: 'critical' | 'major' | 'minor' | 'style';
  file?: string;
  message: string;
  line?: number;
}

export class PRAnalyzer {
  private githubClient: GitHubClient;

  constructor() {
    this.githubClient = new GitHubClient();
  }

  /**
 * Analyze a pull request and return comprehensive analysis
 */
  async analyzePR(prData: PullRequestData, owner?: string, repo?: string): Promise<PRAnalysis> {
    // Use provided owner/repo or attempt to derive from context
    const repoOwner = owner || 'owner';
    const repoName = repo || 'repo';

    const files = await this.githubClient.getPullRequestFiles(
      repoOwner,
      repoName,
      prData.number
    );

    const commits = await this.githubClient.getCommits(
      repoOwner,
      repoName,
      prData.number
    );

    const summary = {
      totalChanges: prData.additions + prData.deletions,
      linesAdded: prData.additions,
      linesDeleted: prData.deletions,
      filesChanged: prData.changed_files,
      commits: prData.commits,
      isDraft: prData.draft,
      isMergeable: prData.mergeable,
    };

    const issues = this.analyzeIssues(prData, files, commits);
    const positives = this.analyzePositives(prData, files, commits);
    const concerns = this.analyzeConcerns(prData, files, commits);

    return {
      prData,
      files,
      commits,
      summary,
      issues,
      positives,
      concerns,
    };
  }

  /**
   * Analyze potential issues in the PR
   */
  private analyzeIssues(prData: PullRequestData, files: FileChange[], commits: Array<{ message: string; sha: string }>): Issue[] {
    const issues: Issue[] = [];

    // Check for large PRs
    if (prData.changed_files > 20) {
      issues.push({
        type: 'major',
        message: `This PR touches ${prData.changed_files} files. That's a lot. Did you consider breaking this down?`,
      });
    }

    if (prData.additions + prData.deletions > 1000) {
      issues.push({
        type: 'major',
        message: `${prData.additions + prData.deletions} line changes. This is getting unwieldy.`,
      });
    }

    // Check commit messages
    commits.forEach(commit => {
      if (commit.message.length < 10) {
        issues.push({
          type: 'minor',
          message: `Commit message "${commit.message}" is too short. Be more descriptive.`,
        });
      }

      if (commit.message.toLowerCase().includes('fix') && commit.message.length < 20) {
        issues.push({
          type: 'minor',
          message: `"${commit.message}" - what exactly did you fix? Be specific.`,
        });
      }
    });

    // Check for missing tests
    const hasTestFiles = files.some(file =>
      file.filename.includes('test') ||
      file.filename.includes('spec') ||
      file.filename.endsWith('.test.ts') ||
      file.filename.endsWith('.spec.ts')
    );

    const hasCodeFiles = files.some(file =>
      !file.filename.includes('test') &&
      !file.filename.includes('spec') &&
      (file.filename.endsWith('.ts') || file.filename.endsWith('.js'))
    );

    if (hasCodeFiles && !hasTestFiles) {
      issues.push({
        type: 'major',
        message: 'No tests? Really? How do you know this actually works?',
      });
    }

    // Check for potential code smells
    files.forEach(file => {
      if (file.patch) {
        // Check for console.log
        if (file.patch.includes('console.log')) {
          issues.push({
            type: 'minor',
            file: file.filename,
            message: 'console.log statements found. Clean up your debugging mess.',
          });
        }

        // Check for TODO comments
        if (file.patch.includes('TODO') || file.patch.includes('FIXME')) {
          issues.push({
            type: 'minor',
            file: file.filename,
            message: 'TODO/FIXME comments. Either fix it now or create an issue.',
          });
        }

        // Check for very long lines (basic check)
        const lines = file.patch.split('\n');
        lines.forEach((line, index) => {
          if (line.length > 120 && line.startsWith('+')) {
            issues.push({
              type: 'style',
              file: file.filename,
              line: index + 1,
              message: 'Line too long. Break it up.',
            });
          }
        });
      }
    });

    // Check title and description
    if (!prData.title || prData.title.length < 10) {
      issues.push({
        type: 'minor',
        message: 'PR title is too short. Be more descriptive.',
      });
    }

    if (!prData.body || prData.body.length < 20) {
      issues.push({
        type: 'minor',
        message: 'PR description is lacking. What does this actually do?',
      });
    }

    return issues;
  }

  /**
   * Analyze positive aspects of the PR
   */
  private analyzePositives(prData: PullRequestData, files: FileChange[], commits: Array<{ message: string; sha: string }>): string[] {
    const positives: string[] = [];

    // Check for good practices
    if (prData.changed_files <= 5 && prData.additions + prData.deletions <= 200) {
      positives.push('Reasonably sized PR. Good.');
    }

    const hasTestFiles = files.some(file =>
      file.filename.includes('test') || file.filename.includes('spec')
    );
    if (hasTestFiles) {
      positives.push('Tests included. Finally, someone who gets it.');
    }

    // Check for documentation updates
    const hasDocFiles = files.some(file =>
      file.filename.endsWith('.md') || file.filename.includes('doc')
    );
    if (hasDocFiles) {
      positives.push('Documentation updated. Rare sight these days.');
    }

    // Check for good commit messages
    const goodCommits = commits.filter(commit =>
      commit.message.length >= 20 && commit.message.includes(':')
    );
    if (goodCommits.length > 0) {
      positives.push('Decent commit messages. You can actually tell what was done.');
    }

    // Check for type definitions
    const hasTypeFiles = files.some(file =>
      file.filename.endsWith('.d.ts') || file.patch?.includes('interface ') || file.patch?.includes('type ')
    );
    if (hasTypeFiles) {
      positives.push('Type definitions. TypeScript appreciation noted.');
    }

    return positives;
  }

  /**
   * Analyze concerns about the PR
   */
  private analyzeConcerns(prData: PullRequestData, files: FileChange[], commits: Array<{ message: string; sha: string }>): string[] {
    const concerns: string[] = [];

    // Check for risky changes
    const hasConfigChanges = files.some(file =>
      file.filename.includes('config') ||
      file.filename.endsWith('.json') ||
      file.filename.endsWith('.env')
    );
    if (hasConfigChanges) {
      concerns.push('Configuration changes detected. Double-check these.');
    }

    // Check for package.json changes
    const hasPackageChanges = files.some(file => file.filename === 'package.json');
    if (hasPackageChanges) {
      concerns.push('Dependency changes. Hope you know what you\'re doing.');
    }

    // Check for database migrations
    const hasMigrations = files.some(file =>
      file.filename.includes('migration') || file.filename.includes('schema')
    );
    if (hasMigrations) {
      concerns.push('Database changes. This better be backwards compatible.');
    }

    // Check for security-related files
    const hasSecurityFiles = files.some(file =>
      file.filename.includes('auth') ||
      file.filename.includes('security') ||
      file.filename.includes('password')
    );
    if (hasSecurityFiles) {
      concerns.push('Security-related changes. Have these been properly reviewed?');
    }

    // Check draft status
    if (prData.draft) {
      concerns.push('This is a draft. Why am I reviewing unfinished work?');
    }

    return concerns;
  }
}
