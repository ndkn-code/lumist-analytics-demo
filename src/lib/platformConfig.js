/**
 * Platform configuration for social media analytics - Demo Version
 *
 * Returns static mock account configurations without database queries.
 */

// Static demo accounts
const DEMO_ACCOUNTS = {
    facebook: [
        {
            id: 'fb-demo-account',
            account_name: 'Lumist SAT Prep',
            platform_account_id: '123456789',
            profile_picture: null
        }
    ],
    threads: [
        {
            id: 'th-demo-account',
            account_name: 'Lumist Threads',
            platform_account_id: '987654321',
            profile_picture: null
        }
    ],
    instagram: [
        {
            id: 'ig-demo-account',
            account_name: 'Lumist Instagram',
            platform_account_id: '111222333',
            profile_picture: null
        }
    ],
    tiktok: [
        {
            id: 'tt-demo-account',
            account_name: 'Lumist TikTok',
            platform_account_id: '444555666',
            profile_picture: null
        }
    ]
};

// Legacy single-account format
const DEMO_ACCOUNT_MAP = {
    facebook: 'fb-demo-account',
    facebook_info: DEMO_ACCOUNTS.facebook[0],
    threads: 'th-demo-account',
    threads_info: DEMO_ACCOUNTS.threads[0],
    instagram: 'ig-demo-account',
    instagram_info: DEMO_ACCOUNTS.instagram[0],
    tiktok: 'tt-demo-account',
    tiktok_info: DEMO_ACCOUNTS.tiktok[0]
};

/**
 * Fetch all social accounts (returns static demo data)
 */
export const fetchPlatformAccounts = async () => {
    // Simulate async delay for realism
    await new Promise(r => setTimeout(r, 50));
    return DEMO_ACCOUNT_MAP;
};

/**
 * Get account_id for a specific platform
 */
export const getAccountId = async (platform) => {
    await new Promise(r => setTimeout(r, 50));
    return DEMO_ACCOUNT_MAP[platform] || null;
};

/**
 * Get full account info for a platform
 */
export const getAccountInfo = async (platform) => {
    await new Promise(r => setTimeout(r, 50));
    return DEMO_ACCOUNT_MAP[`${platform}_info`] || null;
};

/**
 * Clear the cache (no-op in demo)
 */
export const clearAccountCache = () => {
    // No-op in demo mode
};

/**
 * Fetch all accounts for a specific platform (supports multiple accounts)
 */
export const getAccountsForPlatform = async (platform) => {
    await new Promise(r => setTimeout(r, 50));
    return DEMO_ACCOUNTS[platform] || [];
};

// Platform display names and branding
export const PLATFORM_CONFIG = {
    facebook: {
        name: 'Facebook',
        color: '#1877F2',
        icon: 'Facebook'
    },
    threads: {
        name: 'Threads',
        color: '#000000',
        icon: 'AtSign'
    },
    instagram: {
        name: 'Instagram',
        color: '#E4405F',
        icon: 'Instagram'
    },
    tiktok: {
        name: 'TikTok',
        color: '#000000',
        icon: 'Video'
    }
};
