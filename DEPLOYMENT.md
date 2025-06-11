# Deployment Guide - OB3.chat HR1 Assistant

## Quick Deploy to Vercel

### Prerequisites ✅

- [ ] GitHub repository with latest code
- [ ] OpenAI API key with sufficient credits
- [ ] Pinecone account with HR1 data ingested
- [ ] (Optional) Upstash Redis for rate limiting

### 1. Environment Variables Setup

Configure these in your Vercel dashboard:

#### Required Variables

```bash
OPENAI_API_KEY=sk-proj-...
PINECONE_API_KEY=pcsk_...
PINECONE_ENVIRONMENT=https://obbb-xxxxx.svc.aped-xxxx-xxxx.pinecone.io
PINECONE_INDEX_NAME=obbb
```

#### Optional Variables (Recommended for Production)

```bash
UPSTASH_REDIS_REST_URL=https://your-endpoint.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### 2. Vercel Deployment Steps

1. **Connect Repository**

   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js settings

2. **Configure Build Settings**

   - Build Command: `npm run build` (auto-detected)
   - Output Directory: `.next` (auto-detected)
   - Install Command: `npm install` (auto-detected)

3. **Add Environment Variables**

   - In project settings, go to "Environment Variables"
   - Add all required variables from above
   - Set them for "Production", "Preview", and "Development"

4. **Deploy**
   - Click "Deploy"
   - First deployment typically takes 2-3 minutes
   - Subsequent deployments are faster (~30 seconds)

### 3. Post-Deployment Verification

#### Test Checklist

- [ ] App loads without errors: `https://your-app.vercel.app`
- [ ] Chat interface renders correctly
- [ ] Ask a test question about HR1
- [ ] Verify AI response with citations
- [ ] Check browser console for errors
- [ ] Test on mobile device

#### Common Issues & Solutions

**Build Fails**

- Check environment variables are set
- Verify API keys are valid
- Check logs in Vercel dashboard

**App Loads but Chat Doesn't Work**

- Verify Pinecone index has data: `npm run ingest`
- Check API route at `/api/chat`
- Verify OpenAI API key has credits

**Rate Limiting Errors**

- Set up Upstash Redis (optional)
- Or remove rate limiting code temporarily

### 4. Production Optimizations

#### Performance

- [ ] Enable Vercel Analytics
- [ ] Set up monitoring (optional)
- [ ] Configure custom domain (optional)

#### Security

- [ ] Review CORS settings if needed
- [ ] Enable Vercel Web Application Firewall
- [ ] Monitor API usage and costs

#### Monitoring

- [ ] Set up error tracking (Sentry, etc.)
- [ ] Monitor OpenAI API usage
- [ ] Track Pinecone query volume

### 5. Maintenance

#### Regular Tasks

- Monitor API costs (OpenAI + Pinecone)
- Update HR1 data if bill changes
- Review and update dependencies monthly

#### Scaling

- Upgrade Pinecone plan if needed
- Consider implementing caching for frequent queries
- Monitor response times and optimize if needed

### 6. Troubleshooting

#### Logs Access

```bash
# View deployment logs
vercel logs your-app-url

# View function logs
vercel logs your-app-url --since=1h
```

#### Debug Mode

Set `DEBUG=true` in environment variables for verbose logging.

#### Support Contacts

- Vercel Support: [vercel.com/support](https://vercel.com/support)
- OpenAI Support: [help.openai.com](https://help.openai.com)
- Pinecone Support: [pinecone.io/support](https://pinecone.io/support)

---

## Alternative Deployment Platforms

### Netlify

- Use `npm run build` command
- Output directory: `.next`
- Add same environment variables

### Railway

- Connect GitHub repository
- Railway auto-detects Next.js
- Add environment variables in dashboard

### Render

- Build command: `npm run build`
- Start command: `npm start`
- Environment: Node.js

---

**🎉 Your OB3.chat HR1 Assistant should now be live!**

**✨ Now powered by OpenAI's o3 model** - the latest reasoning model for enhanced accuracy and deeper analysis of HR1 legislation!

Share your deployment URL and start helping people understand the One Big Beautiful Bill Act!
