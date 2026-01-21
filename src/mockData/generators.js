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
 * Returns data matching monthly_cohort_retention view format
 */
export const generateRetentionCohorts = () => {
  const cohorts = [
    { cohort_month: '2025-01', cohort_size: 180, retention: [100, 45, 32, 25, 20, 17, 15] },
    { cohort_month: '2025-02', cohort_size: 220, retention: [100, 48, 35, 27, 22, 18, 16] },
    { cohort_month: '2025-03', cohort_size: 310, retention: [100, 52, 38, 30, 24, 20, 17] },
    { cohort_month: '2025-04', cohort_size: 280, retention: [100, 50, 36, 28, 23, 19, 16] },
    { cohort_month: '2025-05', cohort_size: 290, retention: [100, 55, 40, 32, 26, 22, 19] },
    { cohort_month: '2025-06', cohort_size: 220, retention: [100, 53, 38, null, null, null, null] },
  ];

  // Flatten to monthly_cohort_retention format
  const data = [];
  cohorts.forEach(cohort => {
    cohort.retention.forEach((rate, weekIndex) => {
      if (rate !== null) {
        data.push({
          cohort_month: cohort.cohort_month,  // YYYY-MM format expected by RetentionHeatmap
          cohort_size: cohort.cohort_size,
          week_number: weekIndex,
          retention_rate: rate,  // Percentage (e.g., 45 for 45%), not decimal
          retained_users: Math.round(cohort.cohort_size * rate / 100)
        });
      }
    });
  });

  return data;
};

/**
 * 4. Retention Summary (D1/D7/D30)
 * Returns data matching retention_summary view format
 * Note: retention values are percentages (e.g., 42.0 for 42%), not decimals
 */
export const generateRetentionSummary = () => {
  return {
    total_users: 1500,
    d1_retention: 42.0,          // Percentage format
    d1_eligible_users: 1420,     // Users eligible for D1 measurement
    d7_retention: 28.0,          // Percentage format
    d7_eligible_users: 1280,     // Users eligible for D7 measurement
    d30_retention: 16.0,         // Percentage format
    d30_eligible_users: 980,     // Users eligible for D30 measurement
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
 * Returns data with usage_date and feature_type fields to match daily_feature_adoption view
 */
export const generateFeatureAdoption = () => {
  // Features matching the original component's FEATURE_CONFIG
  const features = [
    { name: 'Assessment', baseAdoption: 0.78, trend: 'stable' },
    { name: 'Brain Teaser', baseAdoption: 0.35, trend: 'growing', growthRate: 0.08 },
    { name: 'Ask AI', baseAdoption: 0.15, trend: 'growing', growthRate: 0.127 },
    { name: 'Session Review', baseAdoption: 0.40, trend: 'growing', growthRate: 0.05 },
    { name: 'Collection Import', baseAdoption: 0.25, trend: 'stable' },
    { name: 'Word Added', baseAdoption: 0.45, trend: 'stable' },
    { name: 'Study Plan (Gen)', baseAdoption: 0.20, trend: 'growing', growthRate: 0.06 },
    { name: 'Study Plan (Comp)', baseAdoption: 0.15, trend: 'growing', growthRate: 0.05 },
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
        usage_date: dateString,  // Matches daily_feature_adoption view
        feature_type: feature.name,  // Matches daily_feature_adoption view
        unique_users: Math.round(dayDAU * adoption),
        total_usage: Math.round(dayDAU * adoption * (1.5 + seededRandom(dayIndex) * 0.5))
      });
    });

    currentDate.setDate(currentDate.getDate() + 1);
    dayIndex++;
  }

  return data;
};

/**
 * 7. Feature Usage Summary (Lifetime stats)
 * Matches daily_feature_usage view with feature_type field
 */
export const generateFeatureUsage = () => {
  return [
    { feature_type: 'vocabularyWordsLimit', total_usage: 12500, unique_users: 850 },
    { feature_type: 'errorBankCapacity', total_usage: 3800, unique_users: 620 },
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
 * Field names match what AcquisitionOverview expects
 */
export const generateMonthlyConversionStats = () => {
  return [
    { signup_month: '2025-01', total_signups: 180, total_conversions: 5, conversion_rate: 2.8, avg_days_to_convert: 18.2 },
    { signup_month: '2025-02', total_signups: 220, total_conversions: 7, conversion_rate: 3.2, avg_days_to_convert: 15.4 },
    { signup_month: '2025-03', total_signups: 310, total_conversions: 12, conversion_rate: 3.9, avg_days_to_convert: 11.8 },
    { signup_month: '2025-04', total_signups: 280, total_conversions: 10, conversion_rate: 3.6, avg_days_to_convert: 13.1 },
    { signup_month: '2025-05', total_signups: 290, total_conversions: 11, conversion_rate: 3.8, avg_days_to_convert: 10.5 },
    { signup_month: '2025-06', total_signups: 220, total_conversions: 7, conversion_rate: 3.2, avg_days_to_convert: 9.2 },
  ];
};

/**
 * 10. Referral Source Performance
 * Field names match what AcquisitionOverview expects (total_users, converted_users, etc.)
 */
export const generateReferralSourcePerformance = () => {
  return [
    { referral_source: 'TikTok', total_users: 525, converted_users: 27, conversion_rate: 5.2 },
    { referral_source: 'Facebook', total_users: 420, converted_users: 13, conversion_rate: 3.1 },
    { referral_source: 'Google', total_users: 270, converted_users: 8, conversion_rate: 2.8 },
    { referral_source: 'Word of Mouth', total_users: 180, converted_users: 11, conversion_rate: 6.1 },
    { referral_source: 'Instagram', total_users: 105, converted_users: 2, conversion_rate: 2.2 },
  ];
};

/**
 * 11. Geography Conversion Stats
 * Field names match what AcquisitionOverview expects (geography, converted_users, etc.)
 */
export const generateGeographyStats = () => {
  return [
    { geography: 'Vietnam', total_users: 1380, converted_users: 48, conversion_rate: 3.8, total_revenue_usd: 4320 },
    { geography: 'Global', total_users: 120, converted_users: 4, conversion_rate: 2.1, total_revenue_usd: 360 },
    { geography: 'Not Converted', total_users: 1448, converted_users: 0, conversion_rate: 0, total_revenue_usd: 0 },
  ];
};

/**
 * 12. Signup Cohort Conversion
 * Field names match what AcquisitionCohorts expects
 */
export const generateSignupCohortConversion = () => {
  return [
    { cohort: '2025-01', cohort_size: 180, total_converted: 5, conversion_rate: 2.8, converted_day_0: 1, converted_within_7d: 2, converted_within_30d: 3, converted_after_30d: 4, avg_days_to_convert: 18.2, vietnam_conversions: 4, global_conversions: 1 },
    { cohort: '2025-02', cohort_size: 220, total_converted: 7, conversion_rate: 3.2, converted_day_0: 1, converted_within_7d: 3, converted_within_30d: 5, converted_after_30d: 6, avg_days_to_convert: 15.4, vietnam_conversions: 6, global_conversions: 1 },
    { cohort: '2025-03', cohort_size: 310, total_converted: 12, conversion_rate: 3.9, converted_day_0: 2, converted_within_7d: 5, converted_within_30d: 9, converted_after_30d: 10, avg_days_to_convert: 11.8, vietnam_conversions: 10, global_conversions: 2 },
    { cohort: '2025-04', cohort_size: 280, total_converted: 10, conversion_rate: 3.6, converted_day_0: 2, converted_within_7d: 4, converted_within_30d: 7, converted_after_30d: 9, avg_days_to_convert: 13.1, vietnam_conversions: 8, global_conversions: 2 },
    { cohort: '2025-05', cohort_size: 290, total_converted: 11, conversion_rate: 3.8, converted_day_0: 2, converted_within_7d: 5, converted_within_30d: 8, converted_after_30d: 10, avg_days_to_convert: 10.5, vietnam_conversions: 9, global_conversions: 2 },
    { cohort: '2025-06', cohort_size: 220, total_converted: 7, conversion_rate: 3.2, converted_day_0: 1, converted_within_7d: 3, converted_within_30d: 5, converted_after_30d: 6, avg_days_to_convert: 9.2, vietnam_conversions: 6, global_conversions: 1 },
  ];
};

/**
 * 13. Top Referrers Leaderboard
 * Field names match what AcquisitionCohorts expects (referral_code_performance view)
 */
export const generateTopReferrers = () => {
  return [
    { referrer_id: 'ref-1', referrer_name: 'Sarah Chen', referrer_email: 'sarah.chen@email.com', referral_code: 'SARAH25', total_referrals: 45, converted_referrals: 8, conversion_rate: 17.8, total_revenue_usd: 720 },
    { referrer_id: 'ref-2', referrer_name: 'Michael Tran', referrer_email: 'michael.tran@email.com', referral_code: 'MIKE99', total_referrals: 38, converted_referrals: 6, conversion_rate: 15.8, total_revenue_usd: 540 },
    { referrer_id: 'ref-3', referrer_name: 'Emily Nguyen', referrer_email: 'emily.nguyen@email.com', referral_code: 'EMILY2025', total_referrals: 32, converted_referrals: 5, conversion_rate: 15.6, total_revenue_usd: 450 },
    { referrer_id: 'ref-4', referrer_name: 'David Lee', referrer_email: 'david.lee@email.com', referral_code: 'DAVID', total_referrals: 28, converted_referrals: 4, conversion_rate: 14.3, total_revenue_usd: 360 },
    { referrer_id: 'ref-5', referrer_name: 'Jessica Wang', referrer_email: 'jessica.wang@email.com', referral_code: 'JESSICA', total_referrals: 24, converted_referrals: 3, conversion_rate: 12.5, total_revenue_usd: 270 },
  ];
};

/**
 * 14. Revenue - Monthly Revenue Summary (matches monthly_revenue_summary view)
 */
export const generateMonthlyRevenue = () => {
  return [
    { month: '2025-06', net_revenue: 2340, transaction_count: 8, unique_customers: 8 },
    { month: '2025-05', net_revenue: 1890, transaction_count: 8, unique_customers: 7 },
    { month: '2025-04', net_revenue: 1350, transaction_count: 5, unique_customers: 5 },
    { month: '2025-03', net_revenue: 1080, transaction_count: 5, unique_customers: 4 },
    { month: '2025-02', net_revenue: 720, transaction_count: 3, unique_customers: 3 },
    { month: '2025-01', net_revenue: 450, transaction_count: 5, unique_customers: 5 },
  ];
};

/**
 * 15. Churn Summary (matches churn_summary view format)
 */
export const generateChurnSummary = () => {
  return {
    total_subscribers: 32,
    active_subscribers: 26,
    churned_subscribers: 6,
    churn_rate_percent: 18.8,
    expiring_7_days: 2,
    expiring_30_days: 5
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
  const firstNames = ['Sarah', 'Michael', 'Emily', 'David', 'Jessica', 'James', 'Lisa', 'Robert', 'Jennifer', 'William'];
  const lastNames = ['Chen', 'Tran', 'Nguyen', 'Lee', 'Wang', 'Kim', 'Park', 'Liu', 'Zhang', 'Huang'];

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
 * 17. Transactions (unified_transactions view format)
 * With proper Vietnamese customer names and transaction IDs
 */
export const generateTransactions = () => {
  const providers = ['stripe', 'vnpay', 'zalopay'];
  const plans = ['1month', '3months', '6months', 'lifetime'];

  // Vietnamese-style customer names
  const customerNames = [
    'Minh Hoang', 'Linh Tran', 'Duc Pham', 'Anh Le', 'Hoa Nguyen',
    'Khoa Vo', 'Mai Ly', 'Tuan Dinh', 'Thao Bui', 'Nam Do',
    'Lan Dang', 'Hung Trinh', 'Chi Ha', 'Long Hoang', 'Vy Lam',
    'Quang Phan', 'Nhung Truong', 'Duy Ngo', 'Thu Duong', 'Hieu Vu',
    'My Le', 'Khanh Tran', 'An Nguyen', 'Trung Pham', 'Ngoc Do',
    'Phong Bui', 'Tam Vo', 'Hanh Ly', 'Son Dinh', 'Uyen Dang'
  ];

  const transactions = [];

  for (let i = 0; i < 60; i++) {
    const dayOffset = Math.floor(i * 3);
    const date = new Date(2025, 0, 1);
    date.setDate(date.getDate() + dayOffset);

    const provider = providers[Math.floor(seededRandom(i) * providers.length)];
    const isVND = provider === 'vnpay' || provider === 'zalopay';
    const plan = plans[Math.floor(seededRandom(i + 25) * plans.length)];
    const baseAmount = plan === '1month' ? 49 : plan === '3months' ? 99 : plan === '6months' ? 149 : 299;

    // Generate realistic transaction ID based on provider
    let transactionId;
    if (provider === 'stripe') {
      transactionId = `pi_${Date.now().toString(36)}${i.toString(36).padStart(4, '0')}`;
    } else if (provider === 'vnpay') {
      transactionId = `VNP${formatDate(date).replace(/-/g, '')}${String(i + 1000).padStart(6, '0')}`;
    } else {
      transactionId = `ZLP${Date.now().toString().slice(-10)}${String(i).padStart(4, '0')}`;
    }

    const customerName = customerNames[i % customerNames.length];
    const customerEmail = customerName.toLowerCase().replace(' ', '.') + '@email.com';

    transactions.push({
      id: `txn-${i + 1}`,
      transaction_id: transactionId,
      user_id: customerName,
      email: customerEmail,
      amount: isVND ? baseAmount * 25000 : baseAmount,
      currency: isVND ? 'VND' : 'USD',
      payment_provider: provider,
      subscription_plan: plan,
      status: i < 52 ? 'success' : i < 57 ? 'pending' : 'failed',
      transaction_date: formatDate(date),
      created_at: formatDate(date) + 'T' + String(10 + (i % 12)).padStart(2, '0') + ':30:00Z',
      processing_seconds: Math.floor(seededRandom(i + 50) * 10) + 2
    });
  }

  return transactions;
};

/**
 * 18. Social Media - Facebook Page Metrics (account_metrics_daily format)
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
    const engagements = randomInRange(150, 600);

    data.push({
      metric_date: dateString,
      account_id: 'fb-demo-account',
      followers_count: followers,
      daily_follows: randomInRange(5, 40),
      reach: reach,
      engagements: engagements,
      page_views: randomInRange(50, 200)
    });

    currentDate.setDate(currentDate.getDate() + 1);
    dayIndex++;
  }

  return data;
};

/**
 * 19. Social Media - Facebook Posts (posts table format)
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
      platform_post_id: `${Date.now() - i * 100000}`,
      content_text: getPostCaption(type, i),
      post_type: type,
      reach: randomInRange(3000, 12000),
      clicks: Math.round(randomInRange(50, 200) * baseEngagement),
      reactions_breakdown: {
        like: Math.round(randomInRange(100, 400) * baseEngagement),
        love: Math.round(randomInRange(20, 80) * baseEngagement),
        haha: Math.round(randomInRange(5, 30) * baseEngagement),
        wow: Math.round(randomInRange(2, 15) * baseEngagement),
        sad: Math.round(randomInRange(0, 5)),
        angry: Math.round(randomInRange(0, 3))
      },
      published_at: formatDate(date) + 'T14:00:00Z',
      permalink: `https://facebook.com/lumist/posts/${i + 1}`
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
      profile_picture: '/logo-icon.png'
    },
    {
      id: 'th-demo-account',
      platform: 'threads',
      platform_account_id: '987654321',
      account_name: 'Lumist Threads',
      profile_picture: '/logo-icon.png'
    },
    {
      id: 'ig-demo-account',
      platform: 'instagram',
      platform_account_id: '111222333',
      account_name: 'Lumist Instagram',
      profile_picture: '/logo-icon.png'
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

/**
 * 26. Threads Metrics (account_metrics_daily format)
 */
export const generateThreadsMetrics = () => {
  const data = [];
  const startDate = new Date(2024, 11, 5);
  const endDate = new Date(2025, 5, 30);

  let followers = 1200;
  let currentDate = new Date(startDate);
  let dayIndex = 0;

  while (currentDate <= endDate) {
    const dateString = formatDate(currentDate);

    // Follower growth: 1200 -> 4500 over ~7 months
    const dailyGrowth = (4500 - 1200) / 210;
    followers = Math.round(1200 + (dailyGrowth * dayIndex) + (seededRandom(dayIndex + 500) * 30 - 15));

    const reach = randomInRange(2000, 8000);
    const engagements = randomInRange(100, 400);

    data.push({
      metric_date: dateString,
      account_id: 'th-demo-account',
      followers_count: followers,
      daily_follows: randomInRange(3, 25),
      reach: reach,
      engagements: engagements,
      page_views: randomInRange(30, 120)
    });

    currentDate.setDate(currentDate.getDate() + 1);
    dayIndex++;
  }

  return data;
};

/**
 * 27. Threads Posts (posts table format)
 */
export const generateThreadsPosts = () => {
  const posts = [];

  for (let i = 0; i < 30; i++) {
    const daysAgo = i * 6;
    const date = new Date(2025, 5, 30);
    date.setDate(date.getDate() - daysAgo);

    posts.push({
      id: `th-post-${i + 1}`,
      account_id: 'th-demo-account',
      platform_post_id: `th-${Date.now() - i * 100000}`,
      content_text: `SAT prep tip #${i + 1}: Focus on understanding concepts, not just memorizing answers. 📚 #SATPrep #StudyTips`,
      reach: randomInRange(1500, 6000),
      clicks: randomInRange(20, 100),
      reactions_breakdown: {
        like: randomInRange(50, 200),
        love: randomInRange(10, 50),
        haha: randomInRange(2, 15)
      },
      published_at: formatDate(date) + 'T10:00:00Z',
      permalink: `https://threads.net/lumist/post/${i + 1}`
    });
  }

  return posts;
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
  generateThreadsMetrics,
  generateThreadsPosts,
  generateDemographics,
  generateInsights,
  generateAttemptDurations,
  generateExchangeRates,
  generateSocialAccounts,
  generateDailyMetricsSummary,
};
