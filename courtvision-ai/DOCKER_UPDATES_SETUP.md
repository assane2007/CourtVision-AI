# Docker Image Update Monitoring Setup

Your Dependabot configuration is now active. Here's what's been set up:

## 📋 What's Configured

### 1. **Dependabot** (Automated via GitHub)
- **Docker images**: Checked weekly (Mondays, 03:00 UTC)
- **npm dependencies**: Checked weekly (Mondays, 04:00 UTC)
- **GitHub Actions**: Checked weekly (Mondays, 05:00 UTC)

**For your project:**
- `redis:7-alpine` → Updates when `redis:7-*` releases
- `postgres:15-alpine` → Updates when `postgres:15-*` releases
- All npm packages in `package.json`

### 2. **GitHub Actions Workflow**
- Validates `docker-compose.yml` on every PR
- Auto-comments on Docker update PRs with security notes
- Ensures compose files remain valid

### 3. **Manual Update Script**
- Located: `scripts/check-docker-updates.sh`
- Run anytime to check for new versions
- Usage: `bash scripts/check-docker-updates.sh`

---

## 🚀 Getting Started

### Step 1: Enable Dependabot (if not already enabled)
1. Go to your GitHub repository
2. Navigate to **Settings** → **Code security and analysis**
3. Enable **Dependabot alerts** and **Dependabot security updates**

### Step 2: Configure Branch Protection (Recommended)
1. Go to **Settings** → **Branches**
2. Add a branch protection rule for `main`:
   - ✅ Require pull request reviews before merging
   - ✅ Dismiss stale pull request approvals
   - ✅ Require status checks to pass (includes compose validation)

### Step 3: Monitor Pull Requests
Dependabot will automatically create PRs for:
- Docker image tag updates (e.g., `redis:7.4.7` → `redis:7.4.8`)
- Npm package updates
- GitHub Actions updates

---

## 📊 Update Frequency

| Ecosystem | Interval | Day | Time |
|-----------|----------|-----|------|
| Docker | Weekly | Monday | 03:00 UTC |
| npm | Weekly | Monday | 04:00 UTC |
| GitHub Actions | Weekly | Monday | 05:00 UTC |

**Adjust in `.github/dependabot.yml`** if needed.

---

## 🔔 Notification Options

### GitHub Native
- Enable in repo **Settings** → **Notifications**
- Watch for Dependabot PRs

### Email
- GitHub sends notifications for:
  - PR created
  - PR reviews needed
  - Merge conflicts

### Slack (Optional)
Integrate GitHub with Slack:
1. Install GitHub App in your Slack workspace
2. Subscribe to repository updates
3. Get notified on new Dependabot PRs

---

## 🛡️ Security Best Practices

### For Docker Images
1. **Always review PRs** before merging
2. **Check changelogs** for breaking changes
3. **Test locally** before merging:
   ```bash
   docker compose pull
   docker compose up --pull always
   docker compose down
   ```

### For Redis Updates
- Check [Redis release notes](https://github.com/redis/redis/releases)
- Verify compatibility with your API code
- Test with your actual data

### For npm Updates
- Review dependencies for security advisories
- Run tests before merging:
  ```bash
   npm test
  ```

---

## 📝 Custom Rules (if needed)

Edit `.github/dependabot.yml` to:

### Ignore specific versions
```yaml
ignore:
  - dependency-name: "redis"
    versions: ["8.0"]  # Don't auto-update to v8
```

### Allow only patch updates
```yaml
allow:
  - dependency-type: "direct"
    update-types: ["version-update:semver-patch"]
```

### Require manual approval for minor/major updates
```yaml
reviewers:
  - "owner"
  - "security-team"
```

---

## 🔍 Manual Checking

Run the update checker script anytime:
```bash
bash scripts/check-docker-updates.sh
```

Output example:
```
🔍 Checking for Docker image updates...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📦 redis:7-alpine
  Current:  7.4.7
  Latest:   7.4.8 ⬆️

📦 postgres:15-alpine
  Current:  15.3
  Latest:   15.4 ⬆️

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✨ Check complete!
```

---

## 📧 PR Template (Optional)

Add this to `.github/pull_request_template.md` for consistency:
```markdown
## Docker Image Updates

- [ ] Reviewed changelog/release notes
- [ ] Tested with `docker compose up --pull always`
- [ ] Verified no breaking changes
- [ ] Updated documentation if needed
```

---

## 🆘 Troubleshooting

### Dependabot PRs not appearing
1. Check **Settings** → **Code security and analysis** → Dependabot is enabled
2. Verify `.github/dependabot.yml` is on `main` branch
3. Wait up to 24 hours for first run
4. Manually trigger: **Settings** → **Code security and analysis** → "Check for updates"

### Compose validation failing
1. Verify `docker-compose.yml` syntax: `docker compose config`
2. Check for invalid image references
3. Ensure all required files exist

### Script permission issues
```bash
chmod +x scripts/check-docker-updates.sh
bash scripts/check-docker-updates.sh
```

---

## 📚 Resources

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/about-dependabot-version-updates)
- [Docker Hub API](https://docs.docker.com/docker-hub/api/)
- [Redis Releases](https://github.com/redis/redis/releases)
- [PostgreSQL Releases](https://www.postgresql.org/support/versioning/)
