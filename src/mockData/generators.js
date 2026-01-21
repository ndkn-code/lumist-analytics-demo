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
  const plans = ['1month', '3months', '6months'];

  // Vietnamese-style customer names
  const customerNames = [
    'Minh Hoang', 'Linh Tran', 'Duc Pham', 'Anh Le', 'Hoa Nguyen',
    'Khoa Vo', 'Mai Ly', 'Tuan Dinh', 'Thao Bui', 'Nam Do',
    'Lan Dang', 'Hung Trinh', 'Chi Ha', 'Long Hoang', 'Vy Lam',
    'Quang Phan', 'Nhung Truong', 'Duy Ngo', 'Thu Duong', 'Hieu Vu',
    'My Le', 'Khanh Tran', 'An Nguyen', 'Trung Pham', 'Ngoc Do',
    'Phong Bui', 'Tam Vo', 'Hanh Ly', 'Son Dinh', 'Uyen Dang'
  ];

  // VND to USD exchange rate
  const VND_RATE = 26100;

  // VND pricing (local pricing - cheaper)
  // 1 month: ~47,000 VND ($1.80), 3 months: ~95,000 VND ($3.64), 6 months: ~143,000 VND ($5.48)
  const vndPricing = {
    '1month': 1225000,   // ~$47 equivalent but in VND
    '3months': 2475000,  // ~$95 equivalent but in VND
    '6months': 3725000,  // ~$143 equivalent but in VND
  };

  // USD pricing via Stripe (international pricing - ~4.3x more expensive)
  // These are the actual USD amounts charged via Stripe
  const usdPricing = {
    '1month': 49,     // $49 USD
    '3months': 99,    // $99 USD
    '6months': 149,   // $149 USD
  };

  const transactions = [];

  for (let i = 0; i < 60; i++) {
    const dayOffset = Math.floor(i * 3);
    const date = new Date(2025, 0, 1);
    date.setDate(date.getDate() + dayOffset);

    const provider = providers[Math.floor(seededRandom(i) * providers.length)];
    const isVND = provider === 'vnpay' || provider === 'zalopay';
    const plan = plans[Math.floor(seededRandom(i + 25) * plans.length)];

    // Get amount based on provider and plan
    // Stripe charges in USD, VNPay/ZaloPay charge in VND
    const amount = isVND ? vndPricing[plan] : usdPricing[plan];
    const currency = isVND ? 'VND' : 'USD';

    // Generate realistic transaction ID based on provider
    let transactionId;
    if (provider === 'stripe') {
      transactionId = `pi_mknpaemt001${String(i).padStart(4, '0')}`;
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
      amount: amount,
      currency: currency,
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
 * Returns array of records matching demographic_metrics_daily view format
 * with demographic_type and breakdown_values fields
 */
export const generateDemographics = () => {
  // Total followers ~8,900 for Facebook
  const fbTotalFollowers = 8900;

  return [
    // Facebook Country Demographics (user-specified data)
    {
      id: 'fb-demo-country',
      account_id: 'fb-demo-account',
      demographic_type: 'country',
      metric_date: '2025-06-30',
      breakdown_values: {
        'VN': 8010,    // Vietnam - 90%
        'US': 445,     // USA - 5%
        'AU': 178,     // Australia - 2%
        'SG': 133,     // Singapore - 1.5%
        'TH': 67,      // Thailand - 0.75%
        'MY': 67       // Malaysia - 0.75%
      }
    },
    // Facebook City Demographics (user-specified data)
    {
      id: 'fb-demo-city',
      account_id: 'fb-demo-account',
      demographic_type: 'city',
      metric_date: '2025-06-30',
      breakdown_values: {
        'Ho Chi Minh City, Vietnam': 3560,   // 40%
        'Hanoi, Vietnam': 2670,              // 30%
        'Da Nang, Vietnam': 890,             // 10%
        'Can Tho, Vietnam': 445,             // 5%
        'Hai Phong, Vietnam': 356,           // 4%
        'Nha Trang, Vietnam': 267,           // 3%
        'Hue, Vietnam': 178,                 // 2%
        'Bien Hoa, Vietnam': 178,            // 2%
        'Da Lat, Vietnam': 133,              // 1.5%
        'Vung Tau, Vietnam': 89,             // 1%
        'Sydney, AU': 89,                    // 1%
        'Tampa, FL': 45                      // 0.5%
      }
    },
    // Facebook Age/Gender Demographics
    {
      id: 'fb-demo-age',
      account_id: 'fb-demo-account',
      demographic_type: 'age',
      metric_date: '2025-06-30',
      breakdown_values: {
        '13-17_M': Math.round(fbTotalFollowers * 0.12),
        '13-17_F': Math.round(fbTotalFollowers * 0.15),
        '18-24_M': Math.round(fbTotalFollowers * 0.25),
        '18-24_F': Math.round(fbTotalFollowers * 0.28),
        '25-34_M': Math.round(fbTotalFollowers * 0.08),
        '25-34_F': Math.round(fbTotalFollowers * 0.07),
        '35-44_M': Math.round(fbTotalFollowers * 0.02),
        '35-44_F': Math.round(fbTotalFollowers * 0.02),
        '45+_M': Math.round(fbTotalFollowers * 0.005),
        '45+_F': Math.round(fbTotalFollowers * 0.005)
      }
    },
    // Threads Country Demographics (user-specified data)
    {
      id: 'th-demo-country',
      account_id: 'th-demo-account',
      demographic_type: 'country',
      metric_date: '2025-06-30',
      breakdown_values: {
        'VN': 2800,    // Vietnam - 88%
        'US': 190,     // USA - 6%
        'SG': 95,      // Singapore - 3%
        'AU': 48,      // Australia - 1.5%
        'TH': 48       // Thailand - 1.5%
      }
    },
    // Threads City Demographics (user-specified data)
    {
      id: 'th-demo-city',
      account_id: 'th-demo-account',
      demographic_type: 'city',
      metric_date: '2025-06-30',
      breakdown_values: {
        'Ho Chi Minh City, Vietnam': 1270,   // 40%
        'Hanoi, Vietnam': 950,               // 30%
        'Da Nang, Vietnam': 320,             // 10%
        'Can Tho, Vietnam': 160,             // 5%
        'Hai Phong, Vietnam': 127,           // 4%
        'Nha Trang, Vietnam': 95,            // 3%
        'Hue, Vietnam': 63,                  // 2%
        'Sydney, AU': 48,                    // 1.5%
        'San Francisco, CA': 48              // 1.5%
      }
    },
    // Threads Age Demographics
    {
      id: 'th-demo-age',
      account_id: 'th-demo-account',
      demographic_type: 'age',
      metric_date: '2025-06-30',
      breakdown_values: {
        '13-17_M': 380,
        '13-17_F': 445,
        '18-24_M': 730,
        '18-24_F': 825,
        '25-34_M': 200,
        '25-34_F': 175,
        '35-44_M': 65,
        '35-44_F': 65,
        '45+_M': 48,
        '45+_F': 47
      }
    },
    // Instagram Country Demographics
    {
      id: 'ig-demo-country',
      account_id: 'ig-demo-account',
      demographic_type: 'country',
      metric_date: '2025-06-30',
      breakdown_values: {
        'VN': 3825,    // Vietnam - 85%
        'US': 360,     // USA - 8%
        'SG': 135,     // Singapore - 3%
        'AU': 90,      // Australia - 2%
        'TH': 90       // Thailand - 2%
      }
    },
    // Instagram City Demographics
    {
      id: 'ig-demo-city',
      account_id: 'ig-demo-account',
      demographic_type: 'city',
      metric_date: '2025-06-30',
      breakdown_values: {
        'Ho Chi Minh City, Vietnam': 1575,   // 35%
        'Hanoi, Vietnam': 1350,              // 30%
        'Da Nang, Vietnam': 450,             // 10%
        'Can Tho, Vietnam': 225,             // 5%
        'Hai Phong, Vietnam': 180,           // 4%
        'Los Angeles, CA': 135,              // 3%
        'Sydney, AU': 90,                    // 2%
        'Singapore, SG': 90,                 // 2%
        'San Francisco, CA': 68,             // 1.5%
        'New York, NY': 68                   // 1.5%
      }
    },
    // Instagram Age Demographics (younger skew)
    {
      id: 'ig-demo-age',
      account_id: 'ig-demo-account',
      demographic_type: 'age',
      metric_date: '2025-06-30',
      breakdown_values: {
        '13-17_M': 630,   // 14%
        '13-17_F': 765,   // 17%
        '18-24_M': 900,   // 20%
        '18-24_F': 1080,  // 24%
        '25-34_M': 315,   // 7%
        '25-34_F': 360,   // 8%
        '35-44_M': 135,   // 3%
        '35-44_F': 180,   // 4%
        '45+_M': 68,      // 1.5%
        '45+_F': 68       // 1.5%
      }
    },
    // TikTok Country Demographics
    {
      id: 'tt-demo-country',
      account_id: 'tt-demo-account',
      demographic_type: 'country',
      metric_date: '2025-06-30',
      breakdown_values: {
        'VN': 9840,    // Vietnam - 82%
        'US': 1200,    // USA - 10%
        'SG': 360,     // Singapore - 3%
        'AU': 240,     // Australia - 2%
        'TH': 180,     // Thailand - 1.5%
        'MY': 180      // Malaysia - 1.5%
      }
    },
    // TikTok City Demographics
    {
      id: 'tt-demo-city',
      account_id: 'tt-demo-account',
      demographic_type: 'city',
      metric_date: '2025-06-30',
      breakdown_values: {
        'Ho Chi Minh City, Vietnam': 4200,   // 35%
        'Hanoi, Vietnam': 3600,              // 30%
        'Da Nang, Vietnam': 1200,            // 10%
        'Can Tho, Vietnam': 600,             // 5%
        'Hai Phong, Vietnam': 480,           // 4%
        'Los Angeles, CA': 360,              // 3%
        'San Francisco, CA': 240,            // 2%
        'Sydney, AU': 240,                   // 2%
        'Singapore, SG': 240,                // 2%
        'New York, NY': 180                  // 1.5%
      }
    },
    // TikTok Age Demographics (youngest skew)
    {
      id: 'tt-demo-age',
      account_id: 'tt-demo-account',
      demographic_type: 'age',
      metric_date: '2025-06-30',
      breakdown_values: {
        '13-17_M': 1800,  // 15%
        '13-17_F': 2040,  // 17%
        '18-24_M': 2400,  // 20%
        '18-24_F': 2760,  // 23%
        '25-34_M': 960,   // 8%
        '25-34_F': 1080,  // 9%
        '35-44_M': 360,   // 3%
        '35-44_F': 360,   // 3%
        '45+_M': 120,     // 1%
        '45+_F': 120      // 1%
      }
    }
  ];
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
 * Returns individual session records matching attempt_durations view
 * Fields: attempt_date, net_seconds, gross_seconds, paused_seconds, student_profile_id
 */
export const generateAttemptDurations = () => {
  const sessions = [];
  const startDate = new Date(2025, 0, 1);
  const endDate = new Date(2025, 5, 30);

  // Generate ~50 unique student IDs
  const studentIds = Array.from({ length: 50 }, (_, i) => `student-${i + 1}`);

  // Duration distribution weights (simulating the bucket distribution)
  const durationRanges = [
    { min: 60, max: 600, weight: 0.10 },     // 1-10 minutes
    { min: 600, max: 1200, weight: 0.18 },   // 10-20 minutes
    { min: 1200, max: 1800, weight: 0.25 },  // 20-30 minutes (peak)
    { min: 1800, max: 2700, weight: 0.22 },  // 30-45 minutes
    { min: 2700, max: 3600, weight: 0.14 },  // 45-60 minutes
    { min: 3600, max: 5400, weight: 0.08 },  // 60-90 minutes
    { min: 5400, max: 7200, weight: 0.03 },  // 90-120 minutes
  ];

  let sessionId = 1;
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateString = formatDate(currentDate);
    const dayOfWeek = getDayOfWeek(dateString);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Base sessions per day: 30-60 weekday, 15-35 weekend
    // More sessions closer to SAT dates
    let baseSessions = isWeekend ? randomInRange(15, 35) : randomInRange(30, 60);

    // Boost near SAT dates
    if (isNearSAT(dateString)) {
      baseSessions = Math.round(baseSessions * 1.6);
    }

    // Reduce during Tet
    if (isDuringTet(dateString)) {
      baseSessions = Math.round(baseSessions * 0.4);
    }

    // Generate sessions for this day
    for (let i = 0; i < baseSessions; i++) {
      // Pick a random student (some students study more than others)
      const studentIndex = Math.floor(Math.pow(seededRandom(sessionId), 1.5) * studentIds.length);
      const studentId = studentIds[studentIndex];

      // Pick duration based on weighted distribution
      const rand = seededRandom(sessionId + 1000);
      let cumWeight = 0;
      let selectedRange = durationRanges[0];
      for (const range of durationRanges) {
        cumWeight += range.weight;
        if (rand < cumWeight) {
          selectedRange = range;
          break;
        }
      }

      // Generate net_seconds within the selected range
      const netSeconds = randomInRange(selectedRange.min, selectedRange.max);

      // Paused time: 5-30% of net time
      const pausedPercent = 0.05 + seededRandom(sessionId + 2000) * 0.25;
      const pausedSeconds = Math.round(netSeconds * pausedPercent);

      // Gross = net + paused
      const grossSeconds = netSeconds + pausedSeconds;

      sessions.push({
        id: `attempt-${sessionId}`,
        attempt_date: dateString,
        student_profile_id: studentId,
        net_seconds: netSeconds,
        gross_seconds: grossSeconds,
        paused_seconds: pausedSeconds
      });

      sessionId++;
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return sessions;
};

/**
 * 23. Daily Exchange Rates
 * Stripe transactions are in USD, VNPay/ZaloPay are in VND
 * Rate: 1 USD = 26,100 VND
 * Format matches the query: currency_code, rate_to_usd
 */
export const generateExchangeRates = () => {
  return [
    { rate_date: '2025-06-30', currency_code: 'VND', rate_to_usd: 26100 },
    { rate_date: '2025-06-30', currency_code: 'EUR', rate_to_usd: 0.92 },
    { rate_date: '2025-06-30', currency_code: 'GBP', rate_to_usd: 0.79 }
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
    },
    {
      id: 'tt-demo-account',
      platform: 'tiktok',
      platform_account_id: '444555666',
      account_name: 'Lumist TikTok',
      profile_picture: '/logo-icon.png'
    }
  ];
};

/**
 * 25. Daily Metrics Summary (for social)
 */
export const generateDailyMetricsSummary = (platform) => {
  const data = [];
  const startDate = platform === 'facebook' || platform === 'threads'
    ? new Date(2024, 11, 5)
    : new Date(2025, 0, 1);
  const endDate = new Date(2025, 5, 30);

  let currentDate = new Date(startDate);
  let dayIndex = 0;

  const platformConfig = {
    facebook: { id: '123456789', startFollowers: 2400, endFollowers: 8900 },
    threads: { id: '987654321', startFollowers: 1200, endFollowers: 4500 },
    instagram: { id: '111222333', startFollowers: 1200, endFollowers: 4500 },
    tiktok: { id: '444555666', startFollowers: 500, endFollowers: 12000 }
  };

  const config = platformConfig[platform] || platformConfig.facebook;
  const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));

  while (currentDate <= endDate) {
    const dateString = formatDate(currentDate);

    const dailyGrowth = (config.endFollowers - config.startFollowers) / totalDays;
    const followers = Math.round(config.startFollowers + (dailyGrowth * dayIndex) + (seededRandom(dayIndex) * 50 - 25));

    data.push({
      date: dateString,
      platform_id: config.id,
      platform: platform,
      followers: followers,
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

/**
 * 28. Instagram Metrics (account_metrics_daily format)
 * Followers: 1,200 -> 4,500 (Jan-Jun 2025)
 */
export const generateInstagramMetrics = () => {
  const data = [];
  const startDate = new Date(2025, 0, 1);  // Jan 1, 2025
  const endDate = new Date(2025, 5, 30);

  let followers = 1200;
  let currentDate = new Date(startDate);
  let dayIndex = 0;

  while (currentDate <= endDate) {
    const dateString = formatDate(currentDate);

    // Follower growth: 1200 -> 4500 over 180 days
    const dailyGrowth = (4500 - 1200) / 180;
    followers = Math.round(1200 + (dailyGrowth * dayIndex) + (seededRandom(dayIndex + 700) * 40 - 20));

    const reach = randomInRange(2000, 8000);
    const engagements = randomInRange(120, 450);

    data.push({
      metric_date: dateString,
      account_id: 'ig-demo-account',
      followers_count: followers,
      daily_follows: randomInRange(8, 35),
      reach: reach,
      impressions: Math.round(reach * 1.4),
      engagements: engagements,
      page_views: randomInRange(40, 150),
      engagement_rate: ((engagements / followers) * 100).toFixed(2)
    });

    currentDate.setDate(currentDate.getDate() + 1);
    dayIndex++;
  }

  return data;
};

/**
 * 29. Instagram Posts (posts table format)
 * Mix of reels (perform 3x better) and static posts
 */
export const generateInstagramPosts = () => {
  const posts = [];
  const postTypes = ['reel', 'image', 'carousel', 'reel', 'reel'];  // More reels
  const captions = [
    '5 SAT math shortcuts you NEED to know 🧮 #SATPrep',
    'POV: You finally understand that grammar rule 😭✨',
    'Study tips that actually work (thread) 📚',
    'Real talk: How I went from 1200 to 1500+ 📈',
    'When the SAT is in 2 weeks... 😅 #StudentLife',
    'Your sign to start studying today! 💪',
    'SAT vocab made easy (save for later!) 📖',
    'Day in my life: SAT prep edition 🎯',
  ];

  for (let i = 0; i < 40; i++) {
    const daysAgo = i * 4;
    const date = new Date(2025, 5, 30);
    date.setDate(date.getDate() - daysAgo);

    const postType = postTypes[i % postTypes.length];
    const isReel = postType === 'reel';
    const baseMultiplier = isReel ? 3 : 1;  // Reels perform 3x better

    posts.push({
      id: `ig-post-${i + 1}`,
      account_id: 'ig-demo-account',
      platform_post_id: `ig-${Date.now() - i * 100000}`,
      content_text: captions[i % captions.length],
      post_type: postType,
      media_type: postType,
      reach: Math.round(randomInRange(2000, 6000) * baseMultiplier),
      impressions: Math.round(randomInRange(3000, 9000) * baseMultiplier),
      likes: Math.round(randomInRange(80, 300) * baseMultiplier),
      comments: Math.round(randomInRange(10, 60) * baseMultiplier),
      shares: Math.round(randomInRange(5, 40) * baseMultiplier),
      saves: Math.round(randomInRange(20, 100) * baseMultiplier),
      clicks: Math.round(randomInRange(30, 120) * baseMultiplier),
      reactions_breakdown: {
        like: Math.round(randomInRange(80, 300) * baseMultiplier),
        love: Math.round(randomInRange(15, 60) * baseMultiplier)
      },
      published_at: formatDate(date) + 'T12:00:00Z',
      permalink: `https://instagram.com/p/${i + 1}`
    });
  }

  return posts;
};

/**
 * 30. TikTok Metrics (account_metrics_daily format)
 * Fastest growing: 500 -> 12,000 followers (Jan-Jun 2025)
 */
export const generateTikTokMetrics = () => {
  const data = [];
  const startDate = new Date(2025, 0, 1);
  const endDate = new Date(2025, 5, 30);

  let followers = 500;
  let currentDate = new Date(startDate);
  let dayIndex = 0;

  while (currentDate <= endDate) {
    const dateString = formatDate(currentDate);

    // Exponential-ish growth: 500 -> 12000 over 180 days (fastest growing)
    const growthFactor = Math.pow(24, dayIndex / 180);  // 24x growth
    followers = Math.round(500 * growthFactor + (seededRandom(dayIndex + 900) * 100 - 50));
    followers = Math.min(followers, 12500);

    const views = randomInRange(5000, 50000);
    const likes = Math.round(views * (0.02 + seededRandom(dayIndex) * 0.05));

    data.push({
      metric_date: dateString,
      account_id: 'tt-demo-account',
      followers_count: followers,
      daily_follows: randomInRange(20, 150),
      video_views: views,
      likes: likes,
      comments: Math.round(likes * 0.08),
      shares: Math.round(likes * 0.15),
      profile_views: randomInRange(100, 800),
      engagement_rate: ((likes / views) * 100).toFixed(2)
    });

    currentDate.setDate(currentDate.getDate() + 1);
    dayIndex++;
  }

  return data;
};

/**
 * 31. TikTok Posts/Videos (posts table format)
 * Including viral video data per user specs
 */
export const generateTikTokPosts = () => {
  const posts = [];

  // Top videos as specified by user
  const topVideos = [
    { title: 'SAT Math Hack #1', views: 250000, likes: 18500, comments: 1200, shares: 3400 },
    { title: 'Study With Me (10 hrs)', views: 85000, likes: 6200, comments: 450, shares: 890 },
    { title: 'SAT Vocab in 60 Seconds', views: 62000, likes: 4800, comments: 380, shares: 720 },
    { title: 'Reading Tips That Work', views: 45000, likes: 3100, comments: 290, shares: 510 },
    { title: 'My SAT Score Reveal', views: 38000, likes: 5200, comments: 890, shares: 340 },
  ];

  // Add top videos first
  topVideos.forEach((video, i) => {
    const date = new Date(2025, 5, 30);
    date.setDate(date.getDate() - (i * 15));  // Spread over time

    posts.push({
      id: `tt-post-${i + 1}`,
      account_id: 'tt-demo-account',
      platform_post_id: `tt-${Date.now() - i * 100000}`,
      content_text: `${video.title} #SATPrep #StudyTok #LearnOnTikTok`,
      post_type: 'video',
      media_type: 'video',
      views: video.views,
      reach: Math.round(video.views * 0.85),
      likes: video.likes,
      comments: video.comments,
      shares: video.shares,
      saves: Math.round(video.likes * 0.4),
      watch_time_seconds: randomInRange(8000, 25000),
      avg_watch_time: randomInRange(12, 35),
      reactions_breakdown: { like: video.likes },
      published_at: formatDate(date) + 'T16:00:00Z',
      permalink: `https://tiktok.com/@lumist/video/${i + 1}`,
      is_viral: video.views > 100000
    });
  });

  // Add regular videos
  const regularCaptions = [
    'Quick tip: Read the question twice before answering 📝',
    'That feeling when you ace a practice test 🎉',
    'Grammar rules simplified (Part 1) ✏️',
    'Math formulas you MUST memorize 🧠',
    'How to stay focused while studying 🎯',
    'SAT reading strategy that changed everything 📖',
    'Answering your SAT questions! Q&A 💬',
    'My study setup tour 🖥️',
  ];

  for (let i = 5; i < 35; i++) {
    const daysAgo = (i - 5) * 5 + 3;
    const date = new Date(2025, 5, 30);
    date.setDate(date.getDate() - daysAgo);

    const views = randomInRange(3000, 25000);
    const likes = Math.round(views * (0.04 + seededRandom(i) * 0.08));

    posts.push({
      id: `tt-post-${i + 1}`,
      account_id: 'tt-demo-account',
      platform_post_id: `tt-${Date.now() - i * 100000}`,
      content_text: `${regularCaptions[(i - 5) % regularCaptions.length]} #SATPrep #StudyTok`,
      post_type: 'video',
      media_type: 'video',
      views: views,
      reach: Math.round(views * 0.85),
      likes: likes,
      comments: Math.round(likes * 0.06),
      shares: Math.round(likes * 0.12),
      saves: Math.round(likes * 0.25),
      watch_time_seconds: randomInRange(2000, 8000),
      avg_watch_time: randomInRange(8, 20),
      reactions_breakdown: { like: likes },
      published_at: formatDate(date) + 'T17:00:00Z',
      permalink: `https://tiktok.com/@lumist/video/${i + 1}`,
      is_viral: false
    });
  }

  return posts;
};

/**
 * 32. Discord Server Stats (discord_latest_stats view)
 */
export const generateDiscordLatestStats = () => {
  return {
    total_members: 850,
    online_members: 145,
    member_role_count: 680,  // Onboarded
    verified_count: 520,
    premium_count: 45,
    server_boost_level: 2,
    server_boost_count: 12,
    created_at: '2024-09-15T00:00:00Z'
  };
};

/**
 * 33. Discord Member Growth (discord_member_growth view)
 */
export const generateDiscordMemberGrowth = () => {
  const data = [];
  const startDate = new Date(2024, 8, 15);  // Sep 15, 2024
  const endDate = new Date(2025, 5, 30);

  let members = 50;  // Started with 50
  let currentDate = new Date(startDate);
  let dayIndex = 0;

  while (currentDate <= endDate) {
    const dateString = formatDate(currentDate);

    // Growth: 50 -> 850 over ~9 months
    const dailyGrowth = (850 - 50) / 290;
    members = Math.round(50 + (dailyGrowth * dayIndex) + (seededRandom(dayIndex + 1100) * 10 - 5));
    members = Math.min(members, 870);

    data.push({
      date: dateString,
      total_members: members
    });

    currentDate.setDate(currentDate.getDate() + 1);
    dayIndex++;
  }

  return data;
};

/**
 * 34. Discord Daily Summary (discord_daily_summary view)
 */
export const generateDiscordDailySummary = () => {
  const data = [];
  const startDate = new Date(2024, 8, 15);
  const endDate = new Date(2025, 5, 30);

  let currentDate = new Date(startDate);
  let dayIndex = 0;

  while (currentDate <= endDate) {
    const dateString = formatDate(currentDate);
    const dayOfWeek = getDayOfWeek(dateString);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Messages per day: 200-400 weekday, 100-250 weekend
    const messages = isWeekend ? randomInRange(100, 250) : randomInRange(200, 400);

    // Active members: 120-180 weekday, 80-130 weekend
    const activeMembers = isWeekend ? randomInRange(80, 130) : randomInRange(120, 180);

    data.push({
      date: dateString,
      messages: messages,
      active_members: activeMembers,
      joins: randomInRange(1, 8),
      leaves: randomInRange(0, 3),
      voice_minutes: randomInRange(200, 1200)
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
  generateThreadsMetrics,
  generateThreadsPosts,
  generateDemographics,
  generateInsights,
  generateAttemptDurations,
  generateExchangeRates,
  generateSocialAccounts,
  generateDailyMetricsSummary,
  generateInstagramMetrics,
  generateInstagramPosts,
  generateTikTokMetrics,
  generateTikTokPosts,
  generateDiscordLatestStats,
  generateDiscordMemberGrowth,
  generateDiscordDailySummary,
};
