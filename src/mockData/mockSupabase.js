/**
 * Mock Supabase Client for Demo Mode
 *
 * Replaces all Supabase calls with mock data returns.
 * Maintains the same API interface for drop-in replacement.
 */

import {
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
} from './generators';

// Cache generated data for consistency across queries
let dataCache = {};

const getOrGenerateData = (key, generator) => {
  if (!dataCache[key]) {
    dataCache[key] = generator();
  }
  return dataCache[key];
};

// Helper to filter data by date range
const filterByDateRange = (data, startDate, endDate, dateField = 'date') => {
  if (!startDate && !endDate) return data;

  return data.filter(item => {
    const itemDate = item[dateField];
    if (startDate && itemDate < startDate) return false;
    if (endDate && itemDate > endDate) return false;
    return true;
  });
};

// Mock query builder that chains methods
class MockQueryBuilder {
  constructor(tableName, data) {
    this.tableName = tableName;
    this.data = data;
    this.filters = [];
    this.selectFields = '*';
    this.orderField = null;
    this.orderAsc = true;
    this.limitCount = null;
    this.singleResult = false;
  }

  select(fields = '*') {
    this.selectFields = fields;
    return this;
  }

  eq(field, value) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  neq(field, value) {
    this.filters.push({ type: 'neq', field, value });
    return this;
  }

  gte(field, value) {
    this.filters.push({ type: 'gte', field, value });
    return this;
  }

  lte(field, value) {
    this.filters.push({ type: 'lte', field, value });
    return this;
  }

  gt(field, value) {
    this.filters.push({ type: 'gt', field, value });
    return this;
  }

  lt(field, value) {
    this.filters.push({ type: 'lt', field, value });
    return this;
  }

  in(field, values) {
    this.filters.push({ type: 'in', field, values });
    return this;
  }

  ilike(field, pattern) {
    this.filters.push({ type: 'ilike', field, pattern });
    return this;
  }

  order(field, options = {}) {
    this.orderField = field;
    this.orderAsc = options.ascending !== false;
    return this;
  }

  limit(count) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.singleResult = true;
    return this;
  }

  maybeSingle() {
    this.singleResult = true;
    return this;
  }

  // Execute the query and return results
  async then(resolve) {
    // Simulate async delay (50-150ms)
    await new Promise(r => setTimeout(r, 50 + Math.random() * 100));

    let result = [...this.data];

    // Apply filters
    for (const filter of this.filters) {
      result = result.filter(item => {
        const value = item[filter.field];

        switch (filter.type) {
          case 'eq':
            return value === filter.value;
          case 'neq':
            return value !== filter.value;
          case 'gte':
            return value >= filter.value;
          case 'lte':
            return value <= filter.value;
          case 'gt':
            return value > filter.value;
          case 'lt':
            return value < filter.value;
          case 'in':
            return filter.values.includes(value);
          case 'ilike':
            const pattern = filter.pattern.replace(/%/g, '.*').toLowerCase();
            return new RegExp(pattern).test(String(value).toLowerCase());
          default:
            return true;
        }
      });
    }

    // Apply ordering
    if (this.orderField) {
      result.sort((a, b) => {
        const aVal = a[this.orderField];
        const bVal = b[this.orderField];
        if (aVal < bVal) return this.orderAsc ? -1 : 1;
        if (aVal > bVal) return this.orderAsc ? 1 : -1;
        return 0;
      });
    }

    // Apply limit
    if (this.limitCount) {
      result = result.slice(0, this.limitCount);
    }

    // Return single or array
    if (this.singleResult) {
      resolve({ data: result[0] || null, error: null });
    } else {
      resolve({ data: result, error: null });
    }
  }
}

// Table name to data generator mapping
const tableDataMap = {
  // Main analytics (public_analytics schema)
  'dau': () => getOrGenerateData('dau', generateDAU),
  'monthly_active_users': () => getOrGenerateData('mau', generateMAU),
  'monthly_cohort_retention': () => getOrGenerateData('retention_cohorts', generateRetentionCohorts),
  'retention_summary': () => [getOrGenerateData('retention_summary', generateRetentionSummary)],
  'weekly_calendar_retention': () => getOrGenerateData('weekly_retention', generateWeeklyRetention),
  'daily_feature_adoption': () => getOrGenerateData('feature_adoption', generateFeatureAdoption),
  'daily_feature_usage': () => getOrGenerateData('feature_usage', generateFeatureUsage),
  'sat_cycle_engagement': () => getOrGenerateData('sat_cycle', generateSATCycleEngagement),
  'monthly_conversion_stats': () => getOrGenerateData('monthly_conversion', generateMonthlyConversionStats),
  'weekly_conversion_stats': () => getOrGenerateData('monthly_conversion', generateMonthlyConversionStats), // Reuse monthly
  'referral_source_performance': () => getOrGenerateData('referral_source', generateReferralSourcePerformance),
  'geography_conversion_stats': () => getOrGenerateData('geography', generateGeographyStats),
  'signup_cohort_conversion': () => getOrGenerateData('signup_cohort', generateSignupCohortConversion),
  'referral_code_performance': () => getOrGenerateData('top_referrers', generateTopReferrers),
  'monthly_revenue_summary': () => getOrGenerateData('monthly_revenue', generateMonthlyRevenue),
  'monthly_revenue': () => getOrGenerateData('monthly_revenue', generateMonthlyRevenue),
  'churn_summary': () => [getOrGenerateData('churn_summary', generateChurnSummary)],
  'user_subscriptions': () => getOrGenerateData('subscriptions', generateUserSubscriptions),
  'unified_transactions': () => getOrGenerateData('transactions', generateTransactions),
  'attempt_durations': () => getOrGenerateData('attempt_durations', generateAttemptDurations),
  'daily_exchange_rates': () => getOrGenerateData('exchange_rates', generateExchangeRates),
  'ai_insights_cache': () => [], // Will be handled specially

  // Social analytics (social_analytics schema)
  'social_accounts': () => getOrGenerateData('social_accounts', generateSocialAccounts),
  'account_metrics_daily': () => {
    // Combine FB and Threads metrics
    const fb = getOrGenerateData('fb_metrics', generateFacebookMetrics);
    const th = getOrGenerateData('th_metrics', generateThreadsMetrics);
    return [...fb, ...th];
  },
  'posts': () => {
    // Combine FB and Threads posts
    const fb = getOrGenerateData('fb_posts', generateFacebookPosts);
    const th = getOrGenerateData('th_posts', generateThreadsPosts);
    return [...fb, ...th];
  },
  'post_metrics_daily': () => {
    // Post metrics - reuse posts data with metric fields
    const fb = getOrGenerateData('fb_posts', generateFacebookPosts);
    const th = getOrGenerateData('th_posts', generateThreadsPosts);
    return [...fb, ...th].map(post => ({
      post_id: post.id,
      metric_date: post.published_at?.split('T')[0] || '2025-06-01',
      reach: post.reach,
      clicks: post.clicks,
      reactions_breakdown: post.reactions_breakdown
    }));
  },
  'demographic_metrics_daily': () => [getOrGenerateData('demographics', generateDemographics)],
  'daily_metrics_summary': () => {
    // Combine FB and Threads metrics
    const fb = generateDailyMetricsSummary('facebook');
    const th = generateDailyMetricsSummary('threads');
    return [...fb, ...th];
  },

  // Identity schema (for admin - read-only in demo)
  'user_profiles': () => generateUserSubscriptions().map((s, i) => ({
    id: s.user_id,
    email: s.email,
    display_name: s.user_name,
    role: i === 0 ? 'super_admin' : i < 3 ? 'admin' : 'viewer',
    is_active: true,
    organization_id: 'org-demo',
    team_id: 'team-demo',
    avatar_url: null,
    created_at: '2025-01-01T00:00:00Z'
  })),
  'organizations': () => [{ id: 'org-demo', name: 'Lumist Demo', created_at: '2025-01-01T00:00:00Z' }],
  'teams': () => [{ id: 'team-demo', name: 'Demo Team', allowed_routes: ['*'], organization_id: 'org-demo' }],
  'user_invites': () => [],
  'login_logs': () => [],
  'activity_logs': () => [],
  'notification_settings': () => [],
  'notification_logs': () => [],
};

// Create mock Supabase client
const createMockSupabaseClient = (schemaName = 'public_analytics') => {
  const client = {
    // Support .schema('name').from('table') pattern used by Revenue components
    schema: (name) => ({
      from: (tableName) => {
        const dataGenerator = tableDataMap[tableName];
        const data = dataGenerator ? dataGenerator() : [];
        return new MockQueryBuilder(tableName, data);
      }
    }),

    from: (tableName) => {
      const dataGenerator = tableDataMap[tableName];
      const data = dataGenerator ? dataGenerator() : [];
      return new MockQueryBuilder(tableName, data);
    },

    // Mock RPC calls
    rpc: async (functionName, params = {}) => {
      await new Promise(r => setTimeout(r, 100));

      switch (functionName) {
        case 'get_allowed_routes':
          return { data: ['*'], error: null };
        case 'log_login':
        case 'log_activity':
          return { data: null, error: null };
        default:
          return { data: null, error: null };
      }
    },

    // Mock Edge Functions
    functions: {
      invoke: async (functionName, options = {}) => {
        await new Promise(r => setTimeout(r, 200));

        switch (functionName) {
          case 'generate-insights':
            const mode = options.body?.mode || 'engagement';
            return {
              data: { insights: generateInsights(mode), cached: true },
              error: null
            };
          case 'get-sat-seats':
            return {
              data: { centers: [], message: 'Demo mode - SAT seat data unavailable' },
              error: null
            };
          default:
            return { data: null, error: null };
        }
      }
    },

    // Mock auth (always returns demo user)
    auth: {
      getSession: async () => ({
        data: {
          session: {
            user: {
              id: 'demo-user-id',
              email: 'demo@lumist.ai',
              user_metadata: { full_name: 'Demo User', avatar_url: null }
            },
            access_token: 'demo-token'
          }
        },
        error: null
      }),
      getUser: async () => ({
        data: {
          user: {
            id: 'demo-user-id',
            email: 'demo@lumist.ai',
            user_metadata: { full_name: 'Demo User', avatar_url: null }
          }
        },
        error: null
      }),
      signInWithOAuth: async () => ({ data: null, error: null }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: (callback) => {
        // Immediately trigger with demo session
        setTimeout(() => {
          callback('INITIAL_SESSION', {
            user: {
              id: 'demo-user-id',
              email: 'demo@lumist.ai',
              user_metadata: { full_name: 'Demo User', avatar_url: null }
            },
            access_token: 'demo-token'
          });
        }, 100);

        return {
          data: { subscription: { unsubscribe: () => {} } }
        };
      }
    },

    // Mock storage (not used in demo)
    storage: {
      from: () => ({
        upload: async () => ({ data: null, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    }
  };
};

// Export mock clients matching the original supabase.js structure
export const supabase = createMockSupabaseClient('public_analytics');
export const supabaseSocial = createMockSupabaseClient('identity');
export const supabaseSocialAnalytics = createMockSupabaseClient('social_analytics');

// Export constants that match original
export const PROXY_SUPABASE_URL = 'https://demo.supabase.co';
export const PROXY_SUPABASE_KEY = 'demo-key';

// Clear cache (useful for testing)
export const clearMockCache = () => {
  dataCache = {};
};

export default {
  supabase,
  supabaseSocial,
  supabaseSocialAnalytics,
  PROXY_SUPABASE_URL,
  PROXY_SUPABASE_KEY,
  clearMockCache
};
