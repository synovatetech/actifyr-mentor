# Free Hosting Guide - Deploy to Vercel

## Option 1: Vercel (Recommended - Best for Next.js)

Vercel is created by the Next.js team and offers the best free hosting for Next.js applications.

### Steps to Deploy:

1. **Push your code to GitHub** (if not already):
   ```bash
   # Create a new repository on GitHub, then:
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

2. **Sign up for Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up with your GitHub account (free)

3. **Deploy your project**:
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js
   - Click "Deploy"

4. **Your app will be live** at: `https://your-project-name.vercel.app`

### Vercel Free Tier Includes:
- ✅ Unlimited deployments
- ✅ Custom domains
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Serverless functions
- ✅ Preview deployments for every push

---

## Option 2: Netlify (Alternative)

### Steps to Deploy:

1. **Push code to GitHub** (same as above)

2. **Sign up for Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub

3. **Deploy**:
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repo
   - Build settings:
     - Build command: `npm run build`
     - Publish directory: `.next`
   - Click "Deploy"

---

## Option 3: Railway (Alternative)

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Create new project → Deploy from GitHub
4. Select your repository
5. Railway auto-detects Next.js and deploys

---

## Quick Deploy Commands (Vercel CLI)

You can also deploy directly from your terminal:

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to your project
cd actifyr_client

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name? actifyr-client
# - Directory? ./
# - Override settings? N
```

---

## Important Notes:

1. **Environment Variables**: If you have any API keys or secrets, add them in Vercel dashboard → Settings → Environment Variables

2. **Build Settings**: Vercel auto-detects Next.js, but you can customize in:
   - Project Settings → General → Build & Development Settings

3. **Custom Domain**: 
   - Go to Project Settings → Domains
   - Add your custom domain (free SSL included)

4. **Automatic Deployments**: 
   - Every push to `main` branch = production deployment
   - Every pull request = preview deployment

---

## Recommended: Vercel

**Why Vercel?**
- Made by Next.js creators
- Zero configuration needed
- Fastest deployments
- Best Next.js optimization
- Free tier is very generous
- Easy custom domains

Your app will be live in under 2 minutes! 🚀
