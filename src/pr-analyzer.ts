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

    const issues = await this.analyzeIssues(prData, files, commits);
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
  private async analyzeIssues(prData: PullRequestData, files: FileChange[], commits: Array<{ message: string; sha: string }>): Promise<Issue[]> {
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

    // Check for potential code smells and analyze actual code changes
    for (const file of files) {
      if (file.patch) {
        const codeIssues = await this.analyzeCodeChanges(file);
        issues.push(...codeIssues);
      }
    }

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

  /**
 * Analyze actual code changes using AI or fallback to basic rules
 */
  private async analyzeCodeChanges(file: FileChange): Promise<Issue[]> {
    // Try AI analysis first if OpenAI is available
    const aiIssues = await this.analyzeCodeWithAI(file);
    if (aiIssues.length > 0) {
      return aiIssues;
    }

    // Fallback to basic rule-based analysis
    return this.analyzeCodeWithRules(file);
  }

  /**
   * Use AI to analyze code changes intelligently
   */
  private async analyzeCodeWithAI(file: FileChange): Promise<Issue[]> {
    try {
      const { config } = await import('./config');

      // Skip if no OpenAI key or no patch
      if (!config.openai.apiKey || !file.patch) {
        return [];
      }

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: config.openai.apiKey });

      const prompt = `Analyze this code diff for a file "${file.filename}" and identify issues:

\`\`\`diff
${file.patch}
\`\`\`

Return a JSON array of issues found in the NEW CODE (lines starting with +). Each issue should have:
- type: "critical" | "major" | "minor" | "style"
- message: A brief, direct critique (like Linus Torvalds would write)
- line: Line number in the diff (optional)

Focus on:
- Security vulnerabilities
- Error handling problems
- Poor code quality
- Performance issues
- Bad practices
- TypeScript/JavaScript specific issues
- Logic errors

Example response:
[
  {"type": "major", "message": "Missing error handling on async operation", "line": 15},
  {"type": "minor", "message": "Variable name 'data' is not descriptive", "line": 23}
]

Return empty array [] if no significant issues found.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000,
        temperature: 0.3, // Lower temperature for more consistent analysis
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) return [];

      // Parse AI response
      const aiIssues = JSON.parse(content);

      // Convert to our Issue format
      return aiIssues.map((issue: any) => ({
        type: issue.type || 'minor',
        file: file.filename,
        line: issue.line,
        message: issue.message || 'Code issue detected',
      }));

    } catch (error) {
      console.error('AI code analysis failed:', error);
      return []; // Fallback to rule-based analysis
    }
  }

  /**
   * Basic rule-based code analysis (fallback)
   */
  private analyzeCodeWithRules(file: FileChange): Issue[] {
    const issues: Issue[] = [];
    const patch = file.patch || '';

    // Basic checks only
    if (patch.includes('console.log')) {
      issues.push({
        type: 'minor',
        file: file.filename,
        message: 'Console statements found. Clean up your debugging mess.',
      });
    }

    if (patch.includes('TODO') || patch.includes('FIXME')) {
      issues.push({
        type: 'minor',
        file: file.filename,
        message: 'TODO/FIXME comments. Either fix it now or create an issue.',
      });
    }

    if (patch.includes('eval(') || patch.includes('innerHTML')) {
      issues.push({
        type: 'critical',
        file: file.filename,
        message: 'Potential security vulnerability detected.',
      });
    }

    return issues;
  }
}
