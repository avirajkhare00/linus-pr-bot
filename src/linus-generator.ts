import OpenAI from 'openai';
import { PRAnalysis, Issue } from './pr-analyzer';
import { config } from './config';

export class LinusGenerator {
  private openai?: OpenAI;
  private fallbackEnabled = true;

  constructor() {
    if (config.openai.apiKey) {
      this.openai = new OpenAI({
        apiKey: config.openai.apiKey,
      });
    } else {
      console.warn('OpenAI API key not provided, using fallback comment generation');
    }
  }

  /**
   * Generate a Linus Torvalds style comment based on PR analysis
   */
  async generateComment(analysis: PRAnalysis): Promise<string> {
    // Try OpenAI first if available
    if (this.openai) {
      try {
        return await this.generateAIComment(analysis);
      } catch (error) {
        console.error('OpenAI generation failed, falling back to template:', error);
      }
    }

    // Fallback to template-based generation
    return this.generateTemplateComment(analysis);
  }

  /**
   * Generate comment using OpenAI
   */
  private async generateAIComment(analysis: PRAnalysis): Promise<string> {
    if (!this.openai) throw new Error('OpenAI not initialized');

    const prompt = this.buildPrompt(analysis);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are Linus Torvalds reviewing a GitHub pull request. Generate a code review comment in his characteristic style:
- Direct and blunt, but not unnecessarily rude
- Technically focused and precise
- Often mentions specific technical details
- Uses his typical phrases and expressions
- Sometimes appreciates good work, but always points out problems
- Ends comments with a signature like "- Linus" or similar
- Keeps it concise but impactful
- Uses markdown formatting for code and emphasis
- Include the hidden comment identifier: <!-- linus-pr-bot -->`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.8,
    });

    const comment = response.choices[0]?.message?.content || '';
    return this.addBotSignature(comment);
  }

  /**
   * Build prompt for OpenAI
   */
  private buildPrompt(analysis: PRAnalysis): string {
    const { prData, summary, issues, positives, concerns } = analysis;

    let prompt = `Review this pull request:

**PR Details:**
- Title: "${prData.title}"
- Author: ${prData.user.login}
- Changes: +${summary.linesAdded}/-${summary.linesDeleted} lines across ${summary.filesChanged} files
- Commits: ${summary.commits}
- Draft: ${summary.isDraft ? 'Yes' : 'No'}

**Description:**
${prData.body || 'No description provided'}

`;

    if (issues.length > 0) {
      prompt += `**Issues Found:**\n`;
      issues.forEach(issue => {
        prompt += `- [${issue.type.toUpperCase()}] ${issue.message}`;
        if (issue.file) prompt += ` (${issue.file})`;
        prompt += '\n';
      });
      prompt += '\n';
    }

    if (positives.length > 0) {
      prompt += `**Positive Aspects:**\n`;
      positives.forEach(positive => {
        prompt += `- ${positive}\n`;
      });
      prompt += '\n';
    }

    if (concerns.length > 0) {
      prompt += `**Concerns:**\n`;
      concerns.forEach(concern => {
        prompt += `- ${concern}\n`;
      });
      prompt += '\n';
    }

    prompt += `Generate a Linus Torvalds style review comment for this PR.`;

    return prompt;
  }

  /**
   * Generate comment using templates (fallback)
   */
  private generateTemplateComment(analysis: PRAnalysis): string {
    const { prData, summary, issues, positives, concerns } = analysis;

    let comment = `<!-- linus-pr-bot -->\n`;
    comment += `## Code Review\n\n`;

    // Opening based on overall assessment
    const criticalIssues = issues.filter(i => i.type === 'critical').length;
    const majorIssues = issues.filter(i => i.type === 'major').length;

    if (criticalIssues > 0) {
      comment += this.getRandomOpening('critical');
    } else if (majorIssues > 2) {
      comment += this.getRandomOpening('major');
    } else if (positives.length > issues.length) {
      comment += this.getRandomOpening('positive');
    } else {
      comment += this.getRandomOpening('neutral');
    }

    comment += `\n\n`;

    // PR Statistics
    comment += `**Stats:** +${summary.linesAdded}/-${summary.linesDeleted} lines across ${summary.filesChanged} files\n\n`;

    // Positives first (if any)
    if (positives.length > 0) {
      comment += `**What's Good:**\n`;
      positives.forEach(positive => {
        comment += `- ${positive}\n`;
      });
      comment += `\n`;
    }

    // Issues
    if (issues.length > 0) {
      comment += `**Issues:**\n`;

      const criticalIssues = issues.filter(i => i.type === 'critical');
      const majorIssues = issues.filter(i => i.type === 'major');
      const minorIssues = issues.filter(i => i.type === 'minor');
      const styleIssues = issues.filter(i => i.type === 'style');

      if (criticalIssues.length > 0) {
        comment += `\n🔥 **Critical Issues:**\n`;
        criticalIssues.forEach(issue => {
          comment += `- ${issue.message}`;
          if (issue.file) comment += ` (\`${issue.file}\`)`;
          comment += `\n`;
        });
      }

      if (majorIssues.length > 0) {
        comment += `\n⚠️ **Major Issues:**\n`;
        majorIssues.forEach(issue => {
          comment += `- ${issue.message}`;
          if (issue.file) comment += ` (\`${issue.file}\`)`;
          comment += `\n`;
        });
      }

      if (minorIssues.length > 0) {
        comment += `\n📝 **Minor Issues:**\n`;
        minorIssues.forEach(issue => {
          comment += `- ${issue.message}`;
          if (issue.file) comment += ` (\`${issue.file}\`)`;
          comment += `\n`;
        });
      }

      if (styleIssues.length > 0) {
        comment += `\n🎨 **Style Issues:**\n`;
        styleIssues.forEach(issue => {
          comment += `- ${issue.message}`;
          if (issue.file) comment += ` (\`${issue.file}\`)`;
          comment += `\n`;
        });
      }

      comment += `\n`;
    }

    // Concerns
    if (concerns.length > 0) {
      comment += `**Concerns:**\n`;
      concerns.forEach(concern => {
        comment += `- ${concern}\n`;
      });
      comment += `\n`;
    }

    // Closing
    comment += this.getRandomClosing(issues.length, majorIssues, positives.length);

    comment += `\n\n*- Linus (Bot)*`;

    return comment;
  }

  /**
   * Get random opening based on severity
   */
  private getRandomOpening(type: string): string {
    const openings = {
      critical: [
        "Ok, this is problematic.",
        "What were you thinking?",
        "This needs serious work.",
        "Hold on. Let me understand what happened here.",
      ],
      major: [
        "Right, let's talk about this.",
        "I have some concerns.",
        "This needs attention.",
        "Well, this is... interesting.",
      ],
      positive: [
        "Not bad. Actually, not bad at all.",
        "Ok, this looks reasonable.",
        "Finally, someone who gets it.",
        "This is more like it.",
      ],
      neutral: [
        "Let me look at this.",
        "So, here's what I see.",
        "Alright, let's review this.",
        "Here's my take on this PR.",
      ]
    };

    const options = openings[type as keyof typeof openings] || openings.neutral;
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * Get random closing based on analysis
   */
  private getRandomClosing(totalIssues: number, majorIssues: number, positives: number): string {
    if (majorIssues > 3) {
      const closings = [
        "Fix these issues and we'll talk.",
        "Come back when you've addressed these problems.",
        "This needs work before it's ready.",
      ];
      return closings[Math.floor(Math.random() * closings.length)];
    }

    if (totalIssues === 0 && positives > 0) {
      const closings = [
        "Good work. Merging this makes sense.",
        "This is fine. Ship it.",
        "Looks good to me.",
      ];
      return closings[Math.floor(Math.random() * closings.length)];
    }

    if (totalIssues <= 2) {
      const closings = [
        "Address the minor issues and this should be good to go.",
        "Small fixes needed, but overall solid work.",
        "Clean up these details and we're good.",
      ];
      return closings[Math.floor(Math.random() * closings.length)];
    }

    const closings = [
      "Several things to address here.",
      "Multiple issues need attention.",
      "Let's get these problems sorted out.",
    ];
    return closings[Math.floor(Math.random() * closings.length)];
  }

  /**
   * Add bot signature to comment
   */
  private addBotSignature(comment: string): string {
    if (!comment.includes('<!-- linus-pr-bot -->')) {
      comment = `<!-- linus-pr-bot -->\n${comment}`;
    }

    if (!comment.includes('- Linus')) {
      comment += `\n\n*- Linus (Bot)*`;
    }

    return comment;
  }
}
