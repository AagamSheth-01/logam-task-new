# Vercel Deployment Guide for Notification System

## 📋 Step-by-Step Setup

### 1. **Add Environment Variables**

Go to your Vercel project dashboard → Settings → Environment Variables and add:

```env
# Required - Generate a random secret for cron job authentication
CRON_SECRET=your-random-secret-here-use-something-like-uuid

# Example: CRON_SECRET=a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6
```

**How to generate a secure secret:**
```bash
# Option 1: Use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Option 2: Use OpenSSL
openssl rand -hex 32

# Option 3: Use online UUID generator
# Visit: https://www.uuidgenerator.net/version4
```

### 2. **Deploy Your Code**

The `vercel.json` file has been created with:
- ✅ Cron job configuration (runs every 15 minutes)
- ✅ Service Worker headers
- ✅ SSE stream headers

Just push your code to your Git repository:

```bash
git add .
git commit -m "Add enhanced notification system with Vercel Cron"
git push
```

Vercel will automatically deploy!

### 3. **Verify Cron Job Setup**

After deployment:

1. Go to Vercel Dashboard → Your Project
2. Click on **Cron Jobs** tab (in the left sidebar)
3. You should see:
   ```
   Path: /api/reminders/check
   Schedule: */15 * * * * (Every 15 minutes)
   Status: Active ✅
   ```

### 4. **Test the Cron Job**

You can manually trigger it from Vercel dashboard or test locally:

```bash
# Test with admin token (manual trigger)
curl -X POST https://your-app.vercel.app/api/reminders/check \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Vercel Cron will use the CRON_SECRET automatically
```

### 5. **Monitor Logs**

Check if it's working:

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on your latest deployment
3. Go to **Functions** → **Edge Network** or **Serverless Functions**
4. Click on `/api/reminders/check`
5. View logs to see:
   ```
   ✅ Vercel Cron authenticated
   🔔 Checking for deadline reminders...
   ✅ Reminder sent for task "..." to username
   ```

## 🎯 What Happens Automatically

### Every 15 Minutes:
1. Vercel Cron calls `/api/reminders/check`
2. API checks all active tasks with deadlines
3. Sends reminders based on time remaining:
   - 3 days before → Low priority
   - 24 hours before → Medium priority
   - 3 hours before → High priority
   - 1 hour before → Critical priority
   - 15 minutes before → Critical priority

4. Users receive notifications via:
   - Real-time in-app notification (if online)
   - Browser push notification
   - Email (if configured)

## 🔧 Customizing the Schedule

Edit `vercel.json` to change the frequency:

```json
{
  "crons": [
    {
      "path": "/api/reminders/check",
      "schedule": "*/30 * * * *"  // Every 30 minutes
    }
  ]
}
```

**Common Cron Schedules:**
- `*/5 * * * *` - Every 5 minutes
- `*/15 * * * *` - Every 15 minutes (recommended)
- `*/30 * * * *` - Every 30 minutes
- `0 * * * *` - Every hour
- `0 9 * * *` - Every day at 9 AM UTC
- `0 9,17 * * *` - Twice daily at 9 AM and 5 PM UTC

## 🚨 Troubleshooting

### Cron Job Not Running?

**Check 1: Environment Variable**
```bash
# Verify CRON_SECRET is set in Vercel
vercel env ls
```

**Check 2: Vercel Cron Limits**
- Free tier: Limited cron executions
- Pro tier: More generous limits
- Check your plan: https://vercel.com/docs/cron-jobs

**Check 3: Function Timeout**
```json
// Add to vercel.json if needed
{
  "functions": {
    "api/reminders/check.js": {
      "maxDuration": 30
    }
  }
}
```

### Service Worker Not Loading?

**Check 1: HTTPS Required**
- Service Workers only work on HTTPS
- Vercel provides HTTPS by default ✅

**Check 2: Scope Issues**
```javascript
// Verify in browser console
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Registered SWs:', registrations);
});
```

**Check 3: Clear Cache**
- Chrome DevTools → Application → Service Workers → Unregister
- Clear site data and refresh

### SSE Not Connecting?

**Check 1: Vercel Timeout**
- Serverless functions timeout after 10s (Hobby) or 60s (Pro)
- SSE connections may be limited on Hobby tier
- Consider upgrading to Pro for persistent connections

**Check 2: Fallback Strategy**
If SSE fails, implement polling:
```javascript
// Fallback to polling every 30 seconds
if (!eventSource || eventSource.readyState === EventSource.CLOSED) {
  setInterval(fetchNotifications, 30000);
}
```

## 📊 Production Checklist

Before going live, verify:

- [ ] `CRON_SECRET` environment variable set
- [ ] `vercel.json` file committed to repo
- [ ] All Firebase credentials configured
- [ ] Email service configured (if using email notifications)
- [ ] Service Worker registered successfully
- [ ] Test notification on production URL
- [ ] Monitor Vercel function logs
- [ ] Set up error monitoring (Sentry, LogRocket, etc.)

## 🔒 Security Notes

1. **Never commit CRON_SECRET to Git**
   - Use environment variables only
   - Rotate the secret periodically

2. **Validate All Inputs**
   - Already implemented in the API
   - Checks admin role for manual triggers

3. **Rate Limiting**
   - Consider adding rate limiting for manual triggers
   - Vercel Cron is automatically rate-limited

## 💰 Cost Considerations

### Vercel Cron (Free Tier):
- Limited cron executions per month
- Check: https://vercel.com/docs/cron-jobs/usage-and-pricing

### Vercel Pro:
- More generous limits
- Better suited for production apps
- Longer function execution times

### Firebase:
- Free tier: 50,000 reads/day
- Monitor your usage in Firebase Console

## 🎓 Additional Resources

- [Vercel Cron Jobs Docs](https://vercel.com/docs/cron-jobs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

## 🚀 Next Steps

1. **Deploy to Vercel** ✅
2. **Add CRON_SECRET** ✅
3. **Verify cron job runs** ✅
4. **Test end-to-end** ✅
5. **Monitor logs** ✅
6. **Set up error tracking** (recommended)
7. **Configure custom domain** (optional)

---

**Questions?** Check the logs in Vercel Dashboard → Functions → `/api/reminders/check`

**Working?** You should see reminders in your notification center every 15 minutes (for tasks with upcoming deadlines)! 🎉
