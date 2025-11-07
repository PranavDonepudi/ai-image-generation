# ✨ AI Postcard Generator

A beautiful web application that generates AI-powered postcards for any city in the world. Built with Cloudflare Workers, Hono framework, and powered by Unsplash's stunning photography.

![Postcard Generator Demo](https://img.shields.io/badge/Status-Live-success) ![Hono](https://img.shields.io/badge/Hono-Framework-blue)

## 🎯 Features

- 🌍 Generate beautiful postcards for any city worldwide
- 🎨 Stunning real photography from Unsplash
- ⚡ Lightning-fast generation with Cloudflare Workers
- 🖼️ Dynamic postcard gallery
- 📍 Real-time Cloudflare datacenter location display
- 🎭 Beautiful animated gradient backgrounds
- 📱 Fully responsive design

## 🚀 Live Demo

[Here is the Deployed URL - e.g., https://image-generation-api.pd53.workers.dev]

## 🛠️ Tech Stack

### Backend
- **[Cloudflare Workers](https://workers.cloudflare.com/)** - Serverless edge computing platform
- **[Hono](https://hono.dev/)** - Lightweight, ultrafast web framework for the edge
- **[Unsplash API](https://unsplash.com/developers)** - High-quality, royalty-free images
- **Node.js** - JavaScript runtime (for development)

### Frontend
- **HTML5** - Markup
- **CSS3** - Styling with animations
- **Vanilla JavaScript** - Client-side interactivity

### Why These Technologies?

#### Cloudflare Workers
- **Edge Computing**: Code runs at Cloudflare's 300+ datacenters worldwide
- **Zero Cold Starts**: Instant response times
- **Cost-Effective**: Generous free tier (100,000 requests/day)
- **Scalability**: Automatically scales to handle any traffic

#### Hono Framework
- **Lightweight**: Only 13KB, ultra-fast routing
- **TypeScript**: Full type safety
- **Edge-First**: Built specifically for edge runtimes
- **Developer Experience**: Clean, Express-like API

#### Unsplash API
- **Quality**: Professional, high-resolution photography
- **Free Tier**: 50 requests/hour for development
- **Legal**: All images are free to use
- **Diverse**: Millions of images covering every location

## 📋 Prerequisites

Before you begin, ensure you have:

- Node.js (v16 or higher)
- npm or yarn
- A Cloudflare account (free tier works!)
- An Unsplash API account (free)

## 🔧 Installation & Setup

### Step 1: Clone the Repository
```bash
git clone https://github.com/yourusername/postcard-generator.git
cd postcard-generator
```

### Step 2: Install Dependencies
```bash
npm install
```

This will install:
- `wrangler` - Cloudflare Workers CLI
- `hono` - Web framework
- Other necessary dependencies

### Step 3: Get Unsplash API Key

1. Go to [Unsplash Developers](https://unsplash.com/oauth/applications)
2. Click **"New Application"**
3. Accept the terms and conditions
4. Name your application (e.g., "Postcard Generator")
5. Copy your **Access Key** (starts with a long alphanumeric string)

### Step 4: Configure Secrets

Add your Unsplash API key to Cloudflare:
```bash
npx wrangler secret put UNSPLASH_ACCESS_KEY
```

When prompted, paste your Unsplash Access Key and press Enter.

### Step 5: Verify Configuration

Check that your secret was added:
```bash
npx wrangler secret list
```

You should see:
```json
[
  {
    "name": "UNSPLASH_ACCESS_KEY",
    "type": "secret_text"
  }
]
```

### Step 6: Test Locally

Run the development server:
```bash
npx wrangler dev
```

Open your browser to `http://localhost:8787`

You should see the postcard generator interface!

### Step 7: Deploy to Production

Deploy your application to Cloudflare's edge network:
```bash
npx wrangler deploy
```

After deployment, you'll receive a URL like:
```
https://your-app-name.your-subdomain.workers.dev
```

🎉 **Your app is now live!**

## 📁 Project Structure
```
postcard-generator/
├── src/
│   └── index.ts           # Main application code (backend API)
├── public/
│   └── index.html         # Frontend UI (if separated)
├── wrangler.jsonc         # Cloudflare Workers configuration
├── package.json           # Node.js dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## 🔑 Environment Variables

The application uses Cloudflare Workers secrets:

| Variable | Description | Required |
|----------|-------------|----------|
| `UNSPLASH_ACCESS_KEY` | Your Unsplash API access key | Yes |

## 🎨 API Endpoints

### `GET /`
Returns the main HTML interface

### `GET /api/colo`
Returns Cloudflare datacenter information
```json
{
  "city": "San Francisco",
  "country": "US",
  "colo": "SFO"
}
```

### `POST /api/image/prompt`
Generates an optimized image prompt for a city
```json
// Request
{
  "city": "Paris"
}

// Response
{
  "city": "Paris",
  "imagePrompt": "A beautiful vintage postcard depicting Paris..."
}
```

### `POST /api/image/generation`
Generates a postcard image
```json
// Request
{
  "imagePrompt": "A beautiful vintage postcard...",
  "city": "Paris",
  "name": "John"
}

// Response
{
  "success": true,
  "image": "base64_encoded_image_data",
  "city": "Paris",
  "name": "John",
  "timestamp": "2025-11-07T20:00:00.000Z",
  "photographer": "Photographer Name",
  "service": "Unsplash"
}
```

### `GET /api/images`
Lists all postcards (currently returns empty array)
```json
{
  "images": []
}
```

## 🎯 How It Works

1. **User Input**: User enters a city name and recipient name
2. **Prompt Generation**: Backend creates an optimized search query
3. **Image Fetch**: Application queries Unsplash API for relevant city photos
4. **Image Processing**: Photo is fetched and converted to base64
5. **Display**: Postcard is rendered in the gallery with smooth animations

## 🧪 Testing

### Test Endpoints Manually
```bash
# Test colo endpoint
curl https://your-app.workers.dev/api/colo

# Test prompt generation
curl -X POST https://your-app.workers.dev/api/image/prompt \
  -H "Content-Type: application/json" \
  -d '{"city":"Tokyo"}'

# Test image generation
curl -X POST https://your-app.workers.dev/api/image/generation \
  -H "Content-Type: application/json" \
  -d '{"city":"Tokyo","name":"Test"}' \
  --output postcard.png
```

### View Live Logs

Monitor your application in real-time:
```bash
npx wrangler tail
```

This shows all console.log statements and errors as they happen.

## 🚨 Troubleshooting

### Issue: "UNSPLASH_ACCESS_KEY not configured"
**Solution**: Run `npx wrangler secret put UNSPLASH_ACCESS_KEY` and add your key

### Issue: 401 Unauthorized from Unsplash
**Solution**: 
- Verify your API key is correct
- Check your Unsplash app is activated
- Ensure you copied the Access Key (not Secret Key)

### Issue: Rate Limiting (429 errors)
**Solution**: 
- Unsplash free tier: 50 requests/hour
- Wait before making more requests
- Consider upgrading Unsplash plan for production

### Issue: "Failed to fetch image"
**Solution**:
- Check your internet connection
- Verify Unsplash API is accessible
- Check wrangler tail for detailed error messages

## 📊 API Rate Limits

### Cloudflare Workers (Free Tier)
- 100,000 requests per day
- 10ms CPU time per request

### Unsplash API (Free Tier)
- 50 requests per hour
- Demo applications: Unlimited during development
- Production: Apply for higher limits

## 🔮 Future Enhancements

### Planned Features

#### 1. **Database Integration (R2 Storage)**
- Store generated postcards permanently
- Implement persistent gallery across sessions
- Add postcard history and search
```typescript
// Future implementation
app.post("/api/save-postcard", async (c) => {
  const { image, city, name } = await c.req.json();
  const key = `postcards/${Date.now()}-${city}.png`;
  await c.env.R2_BUCKET.put(key, Buffer.from(image, 'base64'));
  return c.json({ success: true, key });
});
```

#### 2. **AI-Generated Images**
- Integrate Stable Diffusion for custom artwork
- Use DALL-E or Midjourney for unique postcards
- Fallback to Unsplash when AI capacity is exceeded
```typescript
// Planned upgrade
const models = [
  "Stable Diffusion XL",
  "DALL-E 3",
  "Unsplash Fallback"
];
```

#### 3. **User Accounts & Authentication**
- User registration and login
- Personal postcard collections
- Sharing capabilities

#### 4. **Advanced Customization**
- Add text overlays to postcards
- Custom fonts and colors
- Stickers and decorations
- Filter effects

#### 5. **Social Features**
- Share postcards via email
- Generate shareable links
- Export to social media
- Send physical postcards (print-on-demand integration)

#### 6. **Enhanced AI Features**
- Better prompt engineering with GPT-4
- Location-aware suggestions
- Seasonal recommendations
- Famous landmark detection

#### 7. **Analytics Dashboard**
- Track popular cities
- User engagement metrics
- API usage statistics
- Performance monitoring

#### 8. **Performance Optimizations**
- Image caching with Cloudflare CDN
- Lazy loading for gallery
- Progressive image loading
- WebP format support

#### 9. **Mobile App**
- React Native mobile app
- Push notifications
- Offline mode
- Camera integration

#### 10. **Premium Features**
- Ad-free experience
- Unlimited generations
- Priority queue for AI models
- Higher resolution images
- Custom branding

### Technical Debt & Improvements

- [ ] Add comprehensive error handling
- [ ] Implement request validation with Zod
- [ ] Add unit tests (Vitest)
- [ ] Add integration tests
- [ ] Implement CI/CD pipeline
- [ ] Add monitoring and alerting
- [ ] Optimize bundle size
- [ ] Add OpenAPI documentation
- [ ] Implement rate limiting per user
- [ ] Add CAPTCHA for abuse prevention

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Unsplash](https://unsplash.com/) - For beautiful, free images
- [Cloudflare](https://cloudflare.com/) - For edge computing platform
- [Hono](https://hono.dev/) - For the amazing web framework
- All the photographers on Unsplash who contribute their work

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/PranavDonepudi/ai-image-generation/issues)
- **Email**: donepudipranav04@gmail.com

## 🌟 Star History

If you like this project, please give it a ⭐ on GitHub!

---

**Built with ❤️ using Cloudflare Workers and Hono**

*Generating beautiful postcards, one city at a time* ✨🌍📮
📝 Additional Files to Create
.gitignore
gitignorenode_modules/
.wrangler/
dist/
.dev.vars
.env
*.log
.DS_Store
```

### `LICENSE`
```
MIT License

Copyright (c) 2025 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.