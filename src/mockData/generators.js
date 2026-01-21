/**
 * Mock Data Generators for Lumist Analytics Demo
 *
 * Company Context:
 * - Company: "Lumist" - SAT prep platform in Vietnam
 * - Date range: January 1, 2025 to June 30, 2025 (6 months)
 * - Total users: ~1,500 signups
 * - Paid users: ~50
 * - Target audience: Vietnamese high school students preparing for SAT
 */

// Helper to format date as YYYY-MM-DD
const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to parse YYYY-MM-DD to Date (local timezone)
const parseDate = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// SAT test dates in 2025
const SAT_DATES = [
  '2025-03-08',
  '2025-05-03',
  '2025-06-07',
];

// Lunar New Year (Tet) dates for dip
const TET_START = '2025-01-28';
const TET_END = '2025-02-03';

// Check if date is during Tet holiday
const isDuringTet = (dateString) => {
  return dateString >= TET_START && dateString <= TET_END;
};

// Check if date is near SAT (within 14 days)
const isNearSAT = (dateString) => {
  const date = parseDate(dateString);
  for (const satDate of SAT_DATES) {
    const sat = parseDate(satDate);
    const diffDays = (sat - date) / (1000 * 60 * 60 * 24);
    if (diffDays >= 0 && diffDays <= 14) return true;
  }
  return false;
};

// Get day of week (0 = Sunday, 6 = Saturday)
const getDayOfWeek = (dateString) => {
  return parseDate(dateString).getDay();
};

// Random number between min and max with optional variance
const randomInRange = (min, max, variance = 0) => {
  const base = Math.floor(Math.random() * (max - min + 1)) + min;
  const v = Math.floor(Math.random() * variance * 2) - variance;
  return Math.max(min, base + v);
};

// Generate seeded random for reproducibility
const seededRandom = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

/**
 * 1. DAU (Daily Active Users) Generator
 * 180 days of data (Jan 1 - Jun 30, 2025)
 */
export const generateDAU = () => {
  const data = [];
  const startDate = new Date(2025, 0, 1); // Jan 1, 2025
  const endDate = new Date(2025, 5, 30); // Jun 30, 2025

  let currentDate = new Date(startDate);
  let dayIndex = 0;

  while (currentDate <= endDate) {
    const dateString = formatDate(currentDate);
    const dayOfWeek = getDayOfWeek(dateString);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Base growth: Start ~60 DAU in Jan, grow to ~150 by June
    const monthProgress = (currentDate - startDate) / (endDate - startDate);
    const baseDAU = 60 + (90 * monthProgress);

    // Weekend dip (40-70 vs 80-120 weekday)
    let dau = isWeekend
      ? baseDAU * 0.55 + randomInRange(-10, 10)
      : baseDAU + randomInRange(-15, 15);

    // Tet holiday dip (-30%)
    if (isDuringTet(dateString)) {
      dau *= 0.7;
    }

    // SAT proximity spike (+50%)
    if (isNearSAT(dateString)) {
      dau *= 1.5;
    }

    // Add some natural variance based on seed
    const variance = seededRandom(dayIndex) * 10 - 5;
    dau = Math.round(Math.max(20, dau + variance));

    // Sessions: roughly 1.3-1.5x DAU
    const sessions = Math.round(dau * (1.3 + seededRandom(dayIndex + 1000) * 0.2));

    data.push({
      activity_date: dateString,
      active_users: dau,
      sessions: sessions
    });

    currentDate.setDate(currentDate.getDate() + 1);
    dayIndex++;
  }

  return data;
};

/**
 * 2. Monthly Active Users (MAU) Generator
 */
export const generateMAU = () => {
  return [
    { month_start: '2025-01-01', mau: 420 },
    { month_start: '2025-02-01', mau: 580 },
    { month_start: '2025-03-01', mau: 820 },
    { month_start: '2025-04-01', mau: 950 },
    { month_start: '2025-05-01', mau: 1150 },
    { month_start: '2025-06-01', mau: 1350 },
  ];
};

/**
 * 3. Retention Cohorts Generator
 * Monthly cohorts with week-over-week retention
 */
export const generateRetentionCohorts = () => {
  const cohorts = [
    { cohort_date: '2025-01-01', cohort_size: 180, retention: [100, 45, 32, 25, 20, 17, 15] },
    { cohort_date: '2025-02-01', cohort_size: 220, retention: [100, 48, 35, 27, 22, 18, 16] },
    { cohort_date: '2025-03-01', cohort_size: 310, retention: [100, 52, 38, 30, 24, 20, 17] },
    { cohort_date: '2025-04-01', cohort_size: 280, retention: [100, 50, 36, 28, 23, 19, 16] },
    { cohort_date: '2025-05-01', cohort_size: 290, retention: [100, 55, 40, 32, 26, 22, 19] },
    { cohort_date: '2025-06-01', cohort_size: 220, retention: [100, 53, 38, null, null, null, null] },
  ];

  // Flatten to monthly_cohort_retention format
  const data = [];
  cohorts.forEach(cohort => {
    cohort.retention.forEach((rate, weekIndex) => {
      if (rate !== null) {
        data.push({
          cohort_date: cohort.cohort_date,
          cohort_size: cohort.cohort_size,
          week_number: weekIndex,
          retention_rate: rate / 100,
          retained_users: Math.round(cohort.cohort_size * rate / 100)
        });
      }
    });
  });

  return data;
};

/**
 * 4. Retention Summary (D1/D7/D30)
 */
export const generateRetentionSummary = () => {
  return {
    total_users: 1500,
    d1_retention: 0.42,
    d7_retention: 0.28,
    d30_retention: 0.16,
    avg_sessions_per_user: 4.2
  };
};

/**
 * 5. Weekly Calendar Retention
 */
export const generateWeeklyRetention = () => {
  const weeks = [];
  const startDate = new Date(2025, 0, 6); // First Monday

  for (let i = 0; i < 26; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + (i * 7));

    // Retention improves slightly over time
    const baseRetention = 0.25 + (i * 0.005);
    const variance = (seededRandom(i) * 0.1) - 0.05;

    weeks.push({
      week_start: formatDate(weekStart),
      retention_rate: Math.min(0.45, Math.max(0.15, baseRetention + variance)),
      active_users: randomInRange(400, 800),
      returning_users: randomInRange(100, 300)
    });
  }

  return weeks;
};

/**
 * 6. Feature Adoption Generator
 */
export const generateFeatureAdoption = () => {
  const features = [
    { name: 'practice_tests', baseAdoption: 0.78, trend: 'stable' },
    { name: 'ai_tutor', baseAdoption: 0.15, trend: 'growing', growthRate: 0.127 },
    { name: 'study_planner', baseAdoption: 0.40, trend: 'growing', growthRate: 0.05 },
    { name: 'flashcards', baseAdoption: 0.45, trend: 'stable' },
    { name: 'performance_analytics', baseAdoption: 0.61, trend: 'stable' },
    { name: 'community_forum', baseAdoption: 0.30, trend: 'declining', declineRate: 0.03 },
  ];

  const data = [];
  const startDate = new Date(2025, 0, 1);
  const endDate = new Date(2025, 5, 30);
  const dau = generateDAU();

  let currentDate = new Date(startDate);
  let dayIndex = 0;

  while (currentDate <= endDate) {
    const dateString = formatDate(currentDate);
    const dayDAU = dau.find(d => d.activity_date === dateString)?.active_users || 100;

    features.forEach(feature => {
      let adoption = feature.baseAdoption;

      // Apply trends
      const monthProgress = dayIndex / 180;
      if (feature.trend === 'growing') {
        adoption = feature.baseAdoption + (feature.growthRate * monthProgress * 5);
      } else if (feature.trend === 'declining') {
        adoption = feature.baseAdoption - (feature.declineRate * monthProgress * 2);
      }

      // Add daily variance
      const variance = (seededRandom(dayIndex + feature.name.length) * 0.1) - 0.05;
      adoption = Math.max(0.05, Math.min(0.95, adoption + variance));

      data.push({
        date: dateString,
        feature_name: feature.name,
        unique_users: Math.round(dayDAU * adoption),
        total_uses: Math.round(dayDAU * adoption * (1.5 + seededRandom(dayIndex) * 0.5))
      });
    });

    currentDate.setDate(currentDate.getDate() + 1);
    dayIndex++;
  }

  return data;
};

/**
 * 7. Feature Usage Summary
 */
export const generateFeatureUsage = () => {
  return [
    { feature_name: 'practice_tests', active_users: 1170, total_uses: 8450, adoption_rate: 0.78 },
    { feature_name: 'ai_tutor', active_users: 510, total_uses: 2380, adoption_rate: 0.34 },
    { feature_name: 'study_planner', active_users: 780, total_uses: 4200, adoption_rate: 0.52 },
    { feature_name: 'flashcards', active_users: 675, total_uses: 12500, adoption_rate: 0.45 },
    { feature_name: 'performance_analytics', active_users: 915, total_uses: 3800, adoption_rate: 0.61 },
    { feature_name: 'community_forum', active_users: 345, total_uses: 1890, adoption_rate: 0.23 },
  ];
};

/**
 * 8. SAT Cycle Engagement
 */
export const generateSATCycleEngagement = () => {
  return [
    { days_until_sat: '0-7', avg_dau: 180, engagement_multiplier: 1.8, label: 'Cramming' },
    { days_until_sat: '8-14', avg_dau: 145, engagement_multiplier: 1.45, label: 'Final prep' },
    { days_until_sat: '15-21', avg_dau: 125, engagement_multiplier: 1.25, label: 'Intensive' },
    { days_until_sat: '22-30', avg_dau: 110, engagement_multiplier: 1.1, label: 'Building' },
    { days_until_sat: '30+', avg_dau: 100, engagement_multiplier: 1.0, label: 'Baseline' },
  ];
};

/**
 * 9. Acquisition Funnel - Monthly Conversion Stats
 */
export const generateMonthlyConversionStats = () => {
  return [
    { month: '2025-01', signups: 180, activated: 145, conversions: 5, conversion_rate: 0.028, avg_days_to_convert: 12 },
    { month: '2025-02', signups: 220, activated: 182, conversions: 7, conversion_rate: 0.032, avg_days_to_convert: 10 },
    { month: '2025-03', signups: 310, activated: 265, conversions: 12, conversion_rate: 0.039, avg_days_to_convert: 8 },
    { month: '2025-04', signups: 280, activated: 238, conversions: 10, conversion_rate: 0.036, avg_days_to_convert: 9 },
    { month: '2025-05', signups: 290, activated: 255, conversions: 11, conversion_rate: 0.038, avg_days_to_convert: 7 },
    { month: '2025-06', signups: 220, activated: 189, conversions: 7, conversion_rate: 0.032, avg_days_to_convert: 11 },
  ];
};

/**
 * 10. Referral Source Performance
 */
export const generateReferralSourcePerformance = () => {
  return [
    { source: 'TikTok', signups: 525, conversions: 27, conversion_rate: 0.052, revenue: 2430, color: '#ff0050' },
    { source: 'Facebook', signups: 420, conversions: 13, conversion_rate: 0.031, revenue: 1170, color: '#1877F2' },
    { source: 'Google', signups: 270, conversions: 8, conversion_rate: 0.028, revenue: 720, color: '#4285F4' },
    { source: 'Word of Mouth', signups: 180, conversions: 11, conversion_rate: 0.061, revenue: 990, color: '#10B981' },
    { source: 'Instagram', signups: 105, conversions: 2, conversion_rate: 0.022, revenue: 180, color: '#E4405F' },
  ];
};

/**
 * 11. Geography Conversion Stats
 */
export const generateGeographyStats = () => {
  return [
    { region: 'Vietnam', signups: 1200, conversions: 48, conversion_rate: 0.04, revenue: 4320 },
    { region: 'Global', signups: 300, conversions: 4, conversion_rate: 0.013, revenue: 360 },
  ];
};

/**
 * 12. Signup Cohort Conversion
 */
export const generateSignupCohortConversion = () => {
  return [
    { cohort_month: '2025-01', cohort_size: 180, day_0: 1, within_7d: 2, within_30d: 4, after_30d: 5, total_conversions: 5 },
    { cohort_month: '2025-02', cohort_size: 220, day_0: 1, within_7d: 3, within_30d: 5, after_30d: 7, total_conversions: 7 },
    { cohort_month: '2025-03', cohort_size: 310, day_0: 2, within_7d: 5, within_30d: 9, after_30d: 12, total_conversions: 12 },
    { cohort_month: '2025-04', cohort_size: 280, day_0: 2, within_7d: 4, within_30d: 7, after_30d: 10, total_conversions: 10 },
    { cohort_month: '2025-05', cohort_size: 290, day_0: 2, within_7d: 5, within_30d: 8, after_30d: 11, total_conversions: 11 },
    { cohort_month: '2025-06', cohort_size: 220, day_0: 1, within_7d: 3, within_30d: 5, after_30d: 7, total_conversions: 7 },
  ];
};

/**
 * 13. Top Referrers Leaderboard
 */
export const generateTopReferrers = () => {
  return [
    { referrer_name: 'Nguyen Minh Anh', referral_code: 'MINHANH25', referred_users: 28, conversions: 8, revenue: 720 },
    { referrer_name: 'Tran Van Duc', referral_code: 'VANDUC99', referred_users: 22, conversions: 6, revenue: 540 },
    { referrer_name: 'Le Thi Mai', referral_code: 'THIMAI2025', referred_users: 19, conversions: 5, revenue: 450 },
    { referrer_name: 'Pham Hoang Nam', referral_code: 'HOANGNAM', referred_users: 15, conversions: 4, revenue: 360 },
    { referrer_name: 'Vo Thanh Hien', referral_code: 'THANHHIEN', referred_users: 12, conversions: 3, revenue: 270 },
  ];
};

/**
 * 14. Revenue - Monthly Revenue Summary
 */
export const generateMonthlyRevenue = () => {
  return [
    { month: '2025-01', mrr: 450, subscribers: 5, churn_count: 0, new_subscribers: 5 },
    { month: '2025-02', mrr: 720, subscribers: 8, churn_count: 0, new_subscribers: 3 },
    { month: '2025-03', mrr: 1080, subscribers: 12, churn_count: 1, new_subscribers: 5 },
    { month: '2025-04', mrr: 1350, subscribers: 15, churn_count: 2, new_subscribers: 5 },
    { month: '2025-05', mrr: 1890, subscribers: 21, churn_count: 2, new_subscribers: 8 },
    { month: '2025-06', mrr: 2340, subscribers: 26, churn_count: 3, new_subscribers: 8 },
  ];
};

/**
 * 15. Churn Summary
 */
export const generateChurnSummary = () => {
  return {
    active_subscribers: 26,
    churned_this_month: 3,
    at_risk_users: 5,
    churn_rate: 0.103,
    avg_lifetime_months: 4.2
  };
};

/**
 * 16. User Subscriptions
 */
export const generateUserSubscriptions = () => {
  const plans = [
    { name: 'Basic', price: 49 },
    { name: 'Premium', price: 99 },
    { name: 'Family', price: 149 },
  ];

  const statuses = ['active', 'active', 'active', 'active', 'expiring_soon', 'at_risk', 'expired'];
  const firstNames = ['Minh', 'Anh', 'Duc', 'Mai', 'Nam', 'Hien', 'Linh', 'Tuan', 'Huong', 'Khoa'];
  const lastNames = ['Nguyen', 'Tran', 'Le', 'Pham', 'Vo', 'Hoang', 'Dang', 'Bui', 'Do', 'Ngo'];

  const subscriptions = [];
  for (let i = 0; i < 30; i++) {
    const plan = plans[i < 12 ? 0 : i < 25 ? 1 : 2];
    const status = statuses[Math.floor(seededRandom(i) * statuses.length)];
    const startMonth = Math.floor(seededRandom(i + 100) * 5) + 1;

    subscriptions.push({
      id: `sub-${i + 1}`,
      user_id: `user-${i + 1}`,
      user_name: `${firstNames[i % 10]} ${lastNames[Math.floor(i / 10) % 10]}`,
      email: `user${i + 1}@example.com`,
      plan_name: plan.name,
      plan_price: plan.price,
      status: status,
      start_date: `2025-0${startMonth}-01`,
      end_date: status === 'expired' ? `2025-0${startMonth + 1}-01` : null,
      last_active: `2025-06-${String(Math.floor(seededRandom(i + 200) * 20) + 1).padStart(2, '0')}`
    });
  }

  return subscriptions;
};

/**
 * 17. Transactions
 */
export const generateTransactions = () => {
  const providers = ['stripe', 'paypal', 'vnpay', 'momo'];
  const transactions = [];

  for (let i = 0; i < 60; i++) {
    const dayOffset = Math.floor(i * 3);
    const date = new Date(2025, 0, 1);
    date.setDate(date.getDate() + dayOffset);

    const provider = providers[Math.floor(seededRandom(i) * providers.length)];
    const isVND = provider === 'vnpay' || provider === 'momo';
    const baseAmount = [49, 99, 149][Math.floor(seededRandom(i + 50) * 3)];

    transactions.push({
      id: `txn-${i + 1}`,
      user_id: `user-${(i % 30) + 1}`,
      amount: isVND ? baseAmount * 25000 : baseAmount,
      currency: isVND ? 'VND' : 'USD',
      provider: provider,
      status: i < 52 ? 'success' : i < 57 ? 'pending' : 'failed',
      created_at: formatDate(date) + 'T' + String(10 + (i % 12)).padStart(2, '0') + ':30:00Z'
    });
  }

  return transactions;
};

/**
 * 18. Social Media - Facebook Page Metrics
 */
export const generateFacebookMetrics = () => {
  const data = [];
  const startDate = new Date(2024, 11, 5); // Dec 5, 2024
  const endDate = new Date(2025, 5, 30);

  let followers = 2400;
  let currentDate = new Date(startDate);
  let dayIndex = 0;

  while (currentDate <= endDate) {
    const dateString = formatDate(currentDate);

    // Follower growth: 2400 -> 8900 over ~7 months
    const dailyGrowth = (8900 - 2400) / 210;
    followers = Math.round(2400 + (dailyGrowth * dayIndex) + (seededRandom(dayIndex) * 50 - 25));

    // Reach varies significantly
    const reach = randomInRange(5000, 15000);
    const impressions = Math.round(reach * (1.5 + seededRandom(dayIndex) * 0.5));

    data.push({
      date: dateString,
      account_id: 'fb-demo-account',
      followers: followers,
      reach: reach,
      impressions: impressions,
      engagement_rate: (3.5 + seededRandom(dayIndex) * 1.5) / 100,
      likes: Math.round(reach * 0.03),
      comments: Math.round(reach * 0.008),
      shares: Math.round(reach * 0.005)
    });

    currentDate.setDate(currentDate.getDate() + 1);
    dayIndex++;
  }

  return data;
};

/**
 * 19. Social Media - Facebook Posts
 */
export const generateFacebookPosts = () => {
  const postTypes = ['study_tips', 'meme', 'success_story', 'announcement', 'motivation'];
  const posts = [];

  for (let i = 0; i < 50; i++) {
    const daysAgo = i * 4;
    const date = new Date(2025, 5, 30);
    date.setDate(date.getDate() - daysAgo);

    const type = postTypes[i % postTypes.length];
    const baseEngagement = type === 'meme' ? 1.5 : type === 'success_story' ? 1.3 : 1;

    posts.push({
      id: `fb-post-${i + 1}`,
      account_id: 'fb-demo-account',
      post_id: `${Date.now() - i * 100000}`,
      caption: getPostCaption(type, i),
      post_type: type,
      likes: Math.round(randomInRange(200, 800) * baseEngagement),
      comments: Math.round(randomInRange(20, 100) * baseEngagement),
      shares: Math.round(randomInRange(10, 50) * baseEngagement),
      reach: randomInRange(3000, 12000),
      created_at: formatDate(date) + 'T14:00:00Z'
    });
  }

  return posts;
};

// Helper for post captions
const getPostCaption = (type, index) => {
  const captions = {
    study_tips: [
      '5 tips to improve your SAT Reading score 📚',
      'The best time to study for SAT? Here\'s what research says ⏰',
      'How to tackle the hardest SAT Math problems 🧮',
    ],
    meme: [
      'When you finally understand that one SAT grammar rule 😂',
      'SAT prep students at 2am be like... 💀',
      'Me explaining SAT strategies to my parents 🤓',
    ],
    success_story: [
      'Congratulations to Minh Anh on scoring 1550! 🎉',
      'From 1200 to 1480 in 3 months - here\'s how 📈',
      'Our student just got accepted to MIT! 🏫',
    ],
    announcement: [
      'New AI Tutor feature is now live! 🚀',
      'SAT March 2025 registration deadline reminder ⏰',
      'We just hit 5,000 active learners! 🎊',
    ],
    motivation: [
      'Your SAT score doesn\'t define you, but your effort does 💪',
      'Every practice test gets you closer to your dream score ⭐',
      'Believe in yourself - you\'ve got this! 🌟',
    ],
  };
  return captions[type][index % 3];
};

/**
 * 20. Social Media - Demographics
 */
export const generateDemographics = () => {
  return {
    age_groups: [
      { range: '13-17', percentage: 45 },
      { range: '18-24', percentage: 35 },
      { range: '25-34', percentage: 12 },
      { range: '35-44', percentage: 5 },
      { range: '45+', percentage: 3 },
    ],
    gender: [
      { type: 'female', percentage: 58 },
      { type: 'male', percentage: 40 },
      { type: 'other', percentage: 2 },
    ],
    countries: [
      { country: 'Vietnam', percentage: 82 },
      { country: 'United States', percentage: 8 },
      { country: 'Singapore', percentage: 4 },
      { country: 'Australia', percentage: 3 },
      { country: 'Other', percentage: 3 },
    ],
    cities: [
      { city: 'Ho Chi Minh City', percentage: 42 },
      { city: 'Hanoi', percentage: 28 },
      { city: 'Da Nang', percentage: 8 },
      { city: 'Hai Phong', percentage: 5 },
      { city: 'Other', percentage: 17 },
    ],
  };
};

/**
 * 21. AI Insights (Pre-generated)
 */
export const generateInsights = (mode) => {
  const insights = {
    engagement: [
      {
        emoji: '📈',
        title: 'Strong DAU Growth',
        content: 'DAU increased 23% this month, driven by the March SAT prep surge. Peak engagement occurs Tuesday-Thursday.'
      },
      {
        emoji: '📅',
        title: 'Optimal Posting Times',
        content: 'Tuesday-Thursday shows highest engagement. Consider scheduling content drops and feature releases for these days.'
      },
      {
        emoji: '⚠️',
        title: 'Weekend Engagement Gap',
        content: 'Weekend engagement dropped 15% compared to weekdays. Consider gamification elements to boost weekend usage.'
      },
      {
        emoji: '🎯',
        title: 'SAT Proximity Effect',
        content: 'Users engage 80% more within 2 weeks of SAT dates. Capitalize with targeted push notifications during these windows.'
      }
    ],
    retention: [
      {
        emoji: '🚀',
        title: 'D7 Retention Improvement',
        content: 'D7 retention improved from 25% to 28% after the Study Planner redesign in March. Continue iterating on planning features.'
      },
      {
        emoji: '📉',
        title: 'Onboarding Drop-off Risk',
        content: 'Users who don\'t complete onboarding have 3x higher churn risk. Focus on reducing friction in the first session.'
      },
      {
        emoji: '🌟',
        title: 'March Cohort Excellence',
        content: 'March cohort shows best retention (52% Week 1) - correlates with SAT proximity and improved AI Tutor launch.'
      },
      {
        emoji: '💡',
        title: 'Feature Correlation',
        content: 'Users who use Study Planner within first 3 days have 2.3x higher D30 retention. Consider making it part of onboarding.'
      }
    ],
    features: [
      {
        emoji: '🚀',
        title: 'AI Tutor Growth',
        content: 'AI Tutor adoption grew 127% (15% → 34%) after UX improvements in February. Now the fastest-growing feature.'
      },
      {
        emoji: '💡',
        title: 'Study Planner Impact',
        content: 'Users who use Study Planner have 2.3x higher retention. Consider promoting it more prominently in onboarding.'
      },
      {
        emoji: '🔻',
        title: 'Community Forum Decline',
        content: 'Community Forum usage declining 3% month-over-month. Consider deprecating or pivoting to Discord integration.'
      },
      {
        emoji: '📊',
        title: 'Practice Tests Dominance',
        content: 'Practice Tests remain the core feature at 78% adoption. Ensure performance and add more SAT-aligned content.'
      }
    ]
  };

  return insights[mode] || insights.engagement;
};

/**
 * 22. Assessment/Attempt Durations
 */
export const generateAttemptDurations = () => {
  const buckets = [
    { min_minutes: 0, max_minutes: 10, label: '0-10m', count: 1250 },
    { min_minutes: 10, max_minutes: 20, label: '10-20m', count: 2340 },
    { min_minutes: 20, max_minutes: 30, label: '20-30m', count: 3180 },
    { min_minutes: 30, max_minutes: 45, label: '30-45m', count: 2890 },
    { min_minutes: 45, max_minutes: 60, label: '45-60m', count: 1820 },
    { min_minutes: 60, max_minutes: 90, label: '60-90m', count: 980 },
    { min_minutes: 90, max_minutes: 120, label: '90-120m', count: 420 },
    { min_minutes: 120, max_minutes: 999, label: '120m+', count: 180 },
  ];

  return buckets;
};

/**
 * 23. Daily Exchange Rates
 */
export const generateExchangeRates = () => {
  return [
    { date: '2025-06-30', usd_to_vnd: 25000, source: 'mock' }
  ];
};

/**
 * 24. Social Accounts Configuration
 */
export const generateSocialAccounts = () => {
  return [
    {
      id: 'fb-demo-account',
      platform: 'facebook',
      platform_account_id: '123456789',
      account_name: 'Lumist SAT Prep',
      profile_picture: null
    },
    {
      id: 'th-demo-account',
      platform: 'threads',
      platform_account_id: '987654321',
      account_name: 'Lumist Threads',
      profile_picture: null
    },
    {
      id: 'ig-demo-account',
      platform: 'instagram',
      platform_account_id: '111222333',
      account_name: 'Lumist Instagram',
      profile_picture: null
    }
  ];
};

/**
 * 25. Daily Metrics Summary (for social)
 */
export const generateDailyMetricsSummary = (platform) => {
  const data = [];
  const startDate = new Date(2024, 11, 5);
  const endDate = new Date(2025, 5, 30);

  let currentDate = new Date(startDate);
  let dayIndex = 0;

  const platformId = platform === 'facebook' ? '123456789' : '987654321';

  while (currentDate <= endDate) {
    const dateString = formatDate(currentDate);

    data.push({
      date: dateString,
      platform_id: platformId,
      platform: platform,
      followers: Math.round(2400 + (dayIndex * 31) + (seededRandom(dayIndex) * 100 - 50)),
      reach: randomInRange(3000, 12000),
      impressions: randomInRange(5000, 18000),
      engagement: randomInRange(200, 800),
      profile_views: randomInRange(50, 200)
    });

    currentDate.setDate(currentDate.getDate() + 1);
    dayIndex++;
  }

  return data;
};

// Export all generators
export default {
  generateDAU,
  generateMAU,
  generateRetentionCohorts,
  generateRetentionSummary,
  generateWeeklyRetention,
  generateFeatureAdoption,
  generateFeatureUsage,
  generateSATCycleEngagement,
  generateMonthlyConversionStats,
  generateReferralSourcePerformance,
  generateGeographyStats,
  generateSignupCohortConversion,
  generateTopReferrers,
  generateMonthlyRevenue,
  generateChurnSummary,
  generateUserSubscriptions,
  generateTransactions,
  generateFacebookMetrics,
  generateFacebookPosts,
  generateDemographics,
  generateInsights,
  generateAttemptDurations,
  generateExchangeRates,
  generateSocialAccounts,
  generateDailyMetricsSummary,
};
