# 🤖 Linus PR Bot

A GitHub PR bot that reviews pull requests and comments in the legendary style of Linus Torvalds. Built with TypeScript, this bot provides intelligent, AI-powered technical feedback with the characteristic directness and wit that made Linus famous.

## 🚀 Features

- **🧠 AI-Powered Code Analysis**: Uses OpenAI to intelligently analyze actual code changes and identify real issues
- **🎭 Linus-Style Comments**: Generates comments in Linus Torvalds' distinctive direct and technical style
- **⚡ Smart Analysis**: Deep inspection of code quality, security vulnerabilities, performance issues, and best practices
- **🔍 Context-Aware Reviews**: Understands code context and provides line-specific feedback
- **🪝 Webhook Support**: Real-time PR monitoring via GitHub webhooks with instant response (no timeouts)
- **🎯 Manual Triggers**: REST API endpoints for manual PR reviews and testing
- **🛡️ Robust Fallback**: Works with or without OpenAI - graceful degradation to rule-based analysis
- **🚫 Duplicate Prevention**: Avoids commenting multiple times on the same PR
- **⏰ Timeout Protection**: 45-second safety timeouts prevent hanging operations
- **📊 Detailed Logging**: Performance metrics and debugging information

## 📋 Requirements

- Node.js 18.x or higher
- GitHub Personal Access Token or GitHub App
- Optional: OpenAI API key for enhanced comment generation

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd linus-pr-bot
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:
   ```bash
   # Required
   GITHUB_TOKEN=your_github_personal_access_token

   # Optional but recommended
   OPENAI_API_KEY=your_openai_api_key
   GITHUB_WEBHOOK_SECRET=your_webhook_secret

   # Server configuration
   PORT=3000
   NODE_ENV=development
   ```

4. **Build the project:**
   ```bash
   npm run build
   ```

## 🔧 Configuration

### GitHub Token Setup

1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Create a new token with these permissions:
   - `repo` (for private repositories)
   - `public_repo` (for public repositories)
   - `pull_requests:write` (to comment on PRs)

### GitHub Webhook Setup (Optional)

1. Go to your repository → Settings → Webhooks
2. Add webhook with:
   - **Payload URL**: `https://your-domain.com/webhook`
   - **Content type**: `application/json`
   - **Secret**: Your webhook secret from `.env`
   - **Events**: Select "Pull requests"

### OpenAI Setup (Highly Recommended)

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Add it to your `.env` file as `OPENAI_API_KEY`
3. **With OpenAI**: Bot uses intelligent AI analysis of actual code changes
4. **Without OpenAI**: Bot falls back to basic rule-based analysis
5. **Cost**: Typically $5-20/month for moderate usage (very cost-effective)

**Note**: The AI-powered analysis is significantly more intelligent and catches issues that rule-based systems miss.

## 🚀 Usage

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Manual PR Review

You can manually trigger a review via the REST API:

```bash
curl -X POST http://localhost:3000/review/owner/repo/123
```

Replace `owner`, `repo`, and `123` with actual values.

### Health Check

```bash
curl http://localhost:3000/health
```

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/webhook` | GitHub webhook endpoint |
| `POST` | `/review/:owner/:repo/:pull_number` | Manual PR review trigger |

## 🎭 Linus Style Examples

The bot generates intelligent, context-aware comments in Linus's characteristic style:

**AI-Powered Code Analysis:**
> "Alright, let's review this.
>
> **Stats:** +127/-45 lines across 3 files
>
> **What's Good:**
> - Tests included. Finally, someone who gets it.
> - Documentation updated. Rare sight these days.
>
> **🔥 Critical Issues:**
> - SQL query construction without parameterization at line 23. This is a textbook injection vulnerability. Fix this immediately.
>
> **⚠️ Major Issues:**
> - Missing error handling on async database call at line 15. What happens when this fails?
> - Function `processUserData` is doing too many things at line 45. Single responsibility principle means something to you, right?
>
> **📝 Minor Issues:**
> - Variable name 'data' is not descriptive at line 31. Be more specific.
> - Console statements found at line 12. Clean up your debugging mess.
>
> Fix the critical issues and we'll talk.
>
> *- Linus (Bot)*"

**For excellent PRs:**
> "Not bad. Actually, not bad at all. Clean code, proper error handling, and you even included tests. This is more like it. Good work. Ship it."

**For problematic PRs:**
> "What were you thinking? This PR touches 47 files and has multiple security vulnerabilities. Did you consider breaking this down? And no tests? How do you know this actually works?"

## 🔍 Analysis Features

The bot intelligently analyzes PRs using AI-powered code review:

### 🧠 **AI-Powered Code Analysis**
- **Security Vulnerabilities**: SQL injection, XSS, unsafe eval usage
- **Error Handling**: Missing try-catch blocks, unhandled async operations
- **Code Quality**: Poor variable naming, complex conditions, code duplication
- **Performance Issues**: Inefficient loops, unnecessary API calls, memory leaks
- **Best Practices**: TypeScript usage, modern JavaScript patterns
- **Logic Errors**: Potential bugs and edge cases
- **Architecture Issues**: Single responsibility violations, tight coupling

### 📊 **Traditional Analysis**
- **PR Size**: Large PRs with too many files or lines
- **Missing Tests**: Code changes without corresponding tests
- **Commit Quality**: Poor or unclear commit messages
- **Documentation**: Missing documentation updates
- **Dependencies**: Risky dependency additions
- **Configuration**: Potentially dangerous config changes

### 🎯 **Context-Aware Detection**
- **Line-Specific Issues**: Pinpoints exact problematic lines
- **File-Type Awareness**: Different analysis for .ts, .js, .json, etc.
- **Framework Detection**: Recognizes React, Node.js, Express patterns
- **Smart Filtering**: Ignores comments, empty lines, and irrelevant changes

## 🤖 How AI Analysis Works

### 🔍 **Intelligent Code Review Process**

1. **Diff Analysis**: Bot receives the actual code diff (what changed)
2. **AI Processing**: Sends diff to OpenAI GPT-4 with specialized prompts
3. **Contextual Understanding**: AI understands the code's purpose and context
4. **Issue Detection**: AI identifies real problems, not just pattern matches
5. **Linus-Style Critique**: AI generates feedback in Linus's characteristic style
6. **Line-Specific Feedback**: Points to exact problematic lines with explanations

### 🎯 **What Makes It Smart**

- **Context-Aware**: Understands when console.log is debugging vs logging
- **Security-Focused**: Detects actual vulnerabilities, not false positives
- **Performance-Minded**: Identifies real bottlenecks and inefficiencies
- **Best Practices**: Enforces modern coding standards and patterns
- **Framework-Aware**: Understands React, Node.js, TypeScript idioms
- **Learning**: Gets better over time as OpenAI models improve

### 📊 **Analysis Examples**

**Traditional Rule-Based**: `code.includes('console.log')` → "Console found"

**AI-Powered**: Analyzes context → "Debug statement in production code path" vs "Legitimate error logging"

## 🐳 Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

Build and run:

```bash
docker build -t linus-pr-bot .
docker run -p 3000:3000 --env-file .env linus-pr-bot
```

## 🚀 Deployment Options

### Heroku
1. Create a Heroku app
2. Set environment variables in Heroku dashboard
3. Deploy via Git or GitHub integration

### Railway
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

### DigitalOcean/AWS/GCP
1. Deploy using Docker container
2. Set up reverse proxy (nginx)
3. Configure environment variables

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

## ⚠️ Disclaimer

This bot is intended for educational and entertainment purposes, though it provides real technical value through AI-powered code analysis. The "Linus style" comments are inspired by Linus Torvalds' communication style but are generated by AI. The code analysis, however, is genuinely helpful for identifying real issues.

**Use responsibly:**
- Ensure your team is comfortable with the direct feedback style
- The AI analysis is quite accurate but not infallible
- Always verify critical security issues identified by the bot
- Consider the bot as a helpful reviewer, not a replacement for human code review

## 🐛 Troubleshooting

### Common Issues

**"Invalid GitHub token"**
- Verify your token has the correct permissions (`repo`, `pull_requests`)
- Check that the token hasn't expired
- For fine-grained tokens, ensure repository access is granted

**"Webhook timeout / We couldn't deliver this payload"**
- ✅ **Fixed in latest version!** Bot now responds to webhooks instantly
- Check Railway/deployment logs for processing status
- Verify bot is running and accessible at webhook URL

**"OpenAI API error"**
- Check your OpenAI API key is valid
- Verify you have sufficient credits ($5-20/month typical)
- Bot gracefully falls back to rule-based analysis if OpenAI fails
- Monitor API usage in OpenAI dashboard

**"Bot commenting multiple times"**
- Bot includes signature `<!-- linus-pr-bot -->` to prevent duplicates
- Check if duplicate detection is working in logs
- Verify webhook isn't being triggered multiple times

**"AI analysis not working"**
- Ensure `OPENAI_API_KEY` is set correctly
- Check logs for "AI code analysis failed" messages
- Bot will use basic rule-based analysis as fallback
- Verify OpenAI account has API access enabled

**"Slow performance"**
- AI analysis adds 2-5 seconds per PR (normal)
- Large PRs with many files take longer to analyze
- Consider upgrading OpenAI plan for faster responses
- Check for timeout protection logs (45-second limit)

### Debug Mode

Set `NODE_ENV=development` for detailed logging:

```bash
NODE_ENV=development npm run dev
```

## 📈 Monitoring

Monitor your bot with:

### 🔍 **Application Monitoring**
- **Health Check**: `GET /health` - Bot status and uptime
- **Application Logs**: Deployment platform logs (Railway, Heroku, etc.)
- **Performance Metrics**: Processing duration logs for each PR
- **Error Tracking**: Failed webhook processing and timeouts

### 🤖 **AI Analysis Monitoring**
- **OpenAI Usage Dashboard**: Track API calls and costs
- **AI Success Rate**: Monitor "AI code analysis failed" logs
- **Fallback Usage**: When rule-based analysis is used
- **Token Consumption**: Typical usage: 500-2000 tokens per PR

### 📊 **GitHub Integration**
- **Webhook Deliveries**: Repo → Settings → Webhooks → Recent Deliveries
- **Comment Success**: Verify bot comments appear on PRs
- **Duplicate Detection**: Check for signature prevention logs
- **Rate Limiting**: Monitor GitHub API usage

### 🚨 **Key Metrics to Watch**
- **Response Time**: Webhook processing should be < 200ms
- **Success Rate**: PR analysis completion percentage
- **Error Rate**: Failed operations and timeouts
- **Cost**: OpenAI API usage (typically $5-20/month)

---

**Remember**: With great power comes great responsibility. Use the Linus style wisely! 😄
