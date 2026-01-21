# Lumist Analytics Demo

A portfolio showcase of a premium SaaS analytics dashboard for **Lumist.ai**, a SAT preparation platform.

> **Demo Mode:** This version uses simulated data and does not require authentication or external APIs. All data is generated client-side for demonstration purposes.

## Live Demo

[View Live Demo](https://lumist-analytics-demo.vercel.app)

## Features Showcased

### User Engagement Analytics
- Daily Active Users (DAU) trends with 7-day moving average
- Monthly Active Users (MAU) tracking
- Weekly engagement patterns
- AI-powered insights (simulated)

### Retention Analysis
- D1/D7/D30 retention metrics with industry benchmarks
- Monthly cohort retention heatmap
- Retention decay curve analysis
- SAT cycle engagement impact

### Feature Adoption
- Multi-feature usage trends
- Feature distribution over time
- Feature share breakdown

### Acquisition Funnel
- Sankey diagram visualization
- Monthly/weekly conversion trends
- Referral source performance
- Cohort conversion analysis

### Revenue Analytics
- MRR tracking and trends
- Transaction management
- Subscription analytics
- Churn metrics

### Social Media Analytics
- Facebook page metrics
- Threads engagement tracking
- Audience demographics
- Content performance

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React 18.2 + Vite |
| **Styling** | Tailwind CSS 3.3 |
| **Routing** | React Router 7.9 |
| **Charts** | Recharts 2.10 |
| **Maps** | React Simple Maps |
| **Icons** | Lucide React |

## Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── auth/                 # Demo authentication (always authenticated)
├── components/           # Dashboard pages and UI components
│   ├── Acquisition/      # Acquisition funnel module
│   ├── Revenue/          # Revenue analytics module
│   ├── SocialMedia/      # Social media platforms
│   └── admin/            # Admin panel (read-only)
├── lib/                  # Mock Supabase client & config
├── mockData/             # Data generators for demo
└── pages/                # Page wrappers
```

## Demo Data Specifications

- **Date Range:** January 1, 2025 - June 30, 2025
- **Total Users:** ~1,500 signups
- **Paid Users:** ~50 subscribers
- **Target Audience:** Vietnamese high school students

## Original Project

This demo is based on a production analytics dashboard built for Lumist.ai. The original version includes:

- Google OAuth authentication
- Real-time Supabase database integration
- AI-powered insights via Google Gemini
- Live SAT test center finder (College Board API)
- Transaction email notifications via Resend

## Author

**Jack Nguyen**  
Full-stack developer specializing in React, Node.js, and data visualization.

## License

MIT - Feel free to use this code as a reference for your own projects.
