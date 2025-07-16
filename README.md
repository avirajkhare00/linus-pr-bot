# 🤖 Linus PR Bot

A GitHub PR bot that reviews pull requests and comments in the legendary style of Linus Torvalds. Built with TypeScript, this bot provides technical feedback with the characteristic directness and wit that made Linus famous.

## 🚀 Features

- **Automated PR Review**: Analyzes pull requests for common issues and best practices
- **Linus-Style Comments**: Generates comments in Linus Torvalds' distinctive style
- **Smart Analysis**: Checks for code smells, missing tests, commit message quality, and more
- **Webhook Support**: Real-time PR monitoring via GitHub webhooks
- **Manual Triggers**: REST API endpoints for manual PR reviews
- **OpenAI Integration**: Optional AI-powered comment generation (falls back to templates)
- **Duplicate Prevention**: Avoids commenting multiple times on the same PR

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

### OpenAI Setup (Optional)

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Add it to your `.env` file
3. The bot will use AI-generated comments; otherwise, it falls back to templates

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

The bot generates comments in Linus's characteristic style:

**For good PRs:**
> "Not bad. Actually, not bad at all. Tests included. Finally, someone who gets it. Address the minor issues and this should be good to go."

**For problematic PRs:**
> "What were you thinking? This PR touches 47 files. That's a lot. Did you consider breaking this down? No tests? Really? How do you know this actually works?"

**For style issues:**
> "console.log statements found. Clean up your debugging mess. Line too long. Break it up."

## 🔍 Analysis Features

The bot analyzes PRs for:

- **Size Issues**: Large PRs with too many files or lines
- **Missing Tests**: Code changes without corresponding tests
- **Code Quality**: console.log statements, TODO comments, long lines
- **Commit Messages**: Poor or unclear commit messages
- **Documentation**: Missing documentation updates
- **Security**: Changes to auth/security-related files
- **Configuration**: Potentially risky config changes

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

This bot is intended for educational and entertainment purposes. The "Linus style" comments are inspired by Linus Torvalds' communication style but are generated by AI/templates. Use responsibly and ensure your team is comfortable with the direct feedback style.

## 🐛 Troubleshooting

### Common Issues

**"Invalid GitHub token"**
- Verify your token has the correct permissions
- Check that the token hasn't expired

**"Webhook signature invalid"**
- Ensure `GITHUB_WEBHOOK_SECRET` matches your webhook configuration
- Verify the webhook URL is correct

**"OpenAI API error"**
- Check your OpenAI API key
- Verify you have sufficient credits
- The bot will fall back to templates if OpenAI fails

**"Bot commenting multiple times"**
- The bot includes a signature to prevent duplicates
- Check if the signature detection is working correctly

### Debug Mode

Set `NODE_ENV=development` for detailed logging:

```bash
NODE_ENV=development npm run dev
```

## 📈 Monitoring

Monitor your bot with:
- GitHub webhook delivery logs
- Application logs
- Health check endpoint
- OpenAI usage dashboard (if using AI features)

---

**Remember**: With great power comes great responsibility. Use the Linus style wisely! 😄
