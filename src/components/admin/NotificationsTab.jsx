import React, { useState, useEffect } from 'react';
import { Bell, Mail, Plus, X, Save, RefreshCw, Check, AlertCircle, FileText } from 'lucide-react';
import { supabaseSocial, PROXY_SUPABASE_URL, PROXY_SUPABASE_KEY } from '../../lib/supabase';
import TransactionReportModal from './TransactionReportModal';

// Toggle Switch Component (iOS style)
const Toggle = ({ enabled, onChange, disabled }) => {
    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!enabled)}
            disabled={disabled}
            className={`
                relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2
                ${enabled ? 'bg-violet-600' : 'bg-slate-200'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            role="switch"
            aria-checked={enabled}
        >
            <span
                className={`
                    pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                    transition duration-200 ease-in-out
                    ${enabled ? 'translate-x-5' : 'translate-x-0'}
                `}
            />
        </button>
    );
};

// Status Badge Component
const StatusBadge = ({ status }) => {
    const isSuccess = status === 'sent';
    return (
        <span className={`
            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
            ${isSuccess ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}
        `}>
            {isSuccess ? <Check size={12} /> : <AlertCircle size={12} />}
            {status}
        </span>
    );
};

const NotificationsTab = () => {
    // Settings state
    const [settings, setSettings] = useState({
        enabled: false,
        recipients: [],
        min_amount_usd: 0
    });
    const [newEmail, setNewEmail] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    // Logs state
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);

    // Report modal state
    const [showReportModal, setShowReportModal] = useState(false);

    // Fetch settings on mount
    useEffect(() => {
        fetchSettings();
        fetchLogs();
    }, []);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const session = await supabaseSocial.auth.getSession();
            const accessToken = session.data.session?.access_token;

            const response = await fetch(
                `${PROXY_SUPABASE_URL}/rest/v1/notification_settings?setting_key=eq.transaction_emails&select=setting_value`,
                {
                    headers: {
                        'apikey': PROXY_SUPABASE_KEY,
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept-Profile': 'identity',
                    }
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                // 404 or empty is OK for first time
                if (response.status !== 404) {
                    throw new Error(errorData.message || 'Failed to fetch settings');
                }
            }

            const data = await response.json();
            if (data && data.length > 0 && data[0].setting_value) {
                setSettings({
                    enabled: data[0].setting_value.enabled || false,
                    recipients: data[0].setting_value.recipients || [],
                    min_amount_usd: data[0].setting_value.min_amount_usd || 0
                });
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
            setMessage({ type: 'error', text: 'Failed to load settings' });
        } finally {
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            const session = await supabaseSocial.auth.getSession();
            const accessToken = session.data.session?.access_token;

            const response = await fetch(
                `${PROXY_SUPABASE_URL}/rest/v1/notification_logs?select=*&order=created_at.desc&limit=20`,
                {
                    headers: {
                        'apikey': PROXY_SUPABASE_KEY,
                        'Authorization': `Bearer ${accessToken}`,
                        'Accept-Profile': 'identity',
                    }
                }
            );

            const data = await response.json();
            console.log('Logs fetch response:', response.status, data);

            if (!response.ok) throw new Error(`Failed to fetch logs: ${JSON.stringify(data)}`);
            setLogs(data || []);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLogsLoading(false);
        }
    };

    const saveSettings = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const session = await supabaseSocial.auth.getSession();
            const accessToken = session.data.session?.access_token;

            // Use upsert via POST with on_conflict parameter
            const response = await fetch(
                `${PROXY_SUPABASE_URL}/rest/v1/notification_settings?on_conflict=setting_key`,
                {
                    method: 'POST',
                    headers: {
                        'apikey': PROXY_SUPABASE_KEY,
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Profile': 'identity',
                        'Content-Type': 'application/json',
                        'Prefer': 'resolution=merge-duplicates',
                    },
                    body: JSON.stringify({
                        setting_key: 'transaction_emails',
                        setting_value: settings,
                        updated_at: new Date().toISOString()
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                console.error('Save error details:', errorData);
                throw new Error(errorData.message || errorData.hint || errorData.details || `HTTP ${response.status}`);
            }

            setMessage({ type: 'success', text: 'Settings saved successfully!' });
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: `Failed to save settings: ${error.message || error.code || 'Unknown error'}` });
        } finally {
            setSaving(false);
        }
    };

    const addEmail = () => {
        const email = newEmail.trim().toLowerCase();
        if (!email) return;

        // Simple email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setMessage({ type: 'error', text: 'Please enter a valid email address' });
            return;
        }

        if (settings.recipients.includes(email)) {
            setMessage({ type: 'error', text: 'Email already added' });
            return;
        }

        setSettings(prev => ({
            ...prev,
            recipients: [...prev.recipients, email]
        }));
        setNewEmail('');
        setMessage(null);
    };

    const removeEmail = (emailToRemove) => {
        setSettings(prev => ({
            ...prev,
            recipients: prev.recipients.filter(email => email !== emailToRemove)
        }));
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addEmail();
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="animate-spin text-violet-600" size={24} />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Send Report Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <FileText className="text-emerald-600" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">
                                Transaction Reports
                            </h3>
                            <p className="text-sm text-slate-500">
                                Generate and send custom transaction reports via email
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowReportModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white
                            rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors"
                    >
                        <FileText size={16} />
                        Send Report
                    </button>
                </div>
            </div>

            {/* Settings Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-50 rounded-lg">
                            <Bell className="text-violet-600" size={20} />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">
                                Transaction Email Notifications
                            </h3>
                            <p className="text-sm text-slate-500">
                                Send email alerts when new payments are received
                            </p>
                        </div>
                    </div>
                    <Toggle
                        enabled={settings.enabled}
                        onChange={(enabled) => setSettings(prev => ({ ...prev, enabled }))}
                    />
                </div>

                {/* Settings Content */}
                {settings.enabled && (
                    <div className="p-6 space-y-6">
                        {/* Email Recipients */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3">
                                <Mail size={16} />
                                Email Recipients
                            </label>
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="email"
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="email@example.com"
                                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm
                                        focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
                                        placeholder:text-slate-400"
                                />
                                <button
                                    onClick={addEmail}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 text-violet-700
                                        rounded-lg font-medium text-sm hover:bg-violet-100 transition-colors"
                                >
                                    <Plus size={16} />
                                    Add
                                </button>
                            </div>

                            {/* Recipients List */}
                            <div className="flex flex-wrap gap-2">
                                {settings.recipients.map((email) => (
                                    <div
                                        key={email}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-sm"
                                    >
                                        <span className="text-slate-700">{email}</span>
                                        <button
                                            onClick={() => removeEmail(email)}
                                            className="text-slate-400 hover:text-rose-500 transition-colors"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                                {settings.recipients.length === 0 && (
                                    <p className="text-sm text-slate-400 italic">
                                        No recipients added yet
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Minimum Amount */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Minimum Amount (USD)
                            </label>
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={settings.min_amount_usd}
                                        onChange={(e) => setSettings(prev => ({
                                            ...prev,
                                            min_amount_usd: Math.max(0, parseInt(e.target.value) || 0)
                                        }))}
                                        className="w-32 pl-7 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm
                                            focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    />
                                </div>
                                <span className="text-sm text-slate-500">
                                    Only notify for transactions above this amount
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Save Button & Messages */}
                <div className="px-6 py-4 bg-slate-50 rounded-b-2xl border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <div>
                            {message && (
                                <p className={`text-sm font-medium ${
                                    message.type === 'success' ? 'text-emerald-600' : 'text-rose-600'
                                }`}>
                                    {message.text}
                                </p>
                            )}
                        </div>
                        <button
                            onClick={saveSettings}
                            disabled={saving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white
                                rounded-lg font-medium text-sm hover:bg-violet-700 transition-colors
                                disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <RefreshCw size={16} className="animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            Save Settings
                        </button>
                    </div>
                </div>
            </div>

            {/* Notification Logs Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0px_4px_24px_rgba(0,0,0,0.06)]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <h3 className="text-lg font-semibold text-slate-800">
                        Recent Notification Logs
                    </h3>
                    <button
                        onClick={fetchLogs}
                        disabled={logsLoading}
                        className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-slate-700
                            hover:bg-slate-100 rounded-lg transition-colors text-sm"
                    >
                        <RefreshCw size={14} className={logsLoading ? 'animate-spin' : ''} />
                        Refresh
                    </button>
                </div>

                {/* Logs Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Time
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Recipient
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Subject
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    Resend ID
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {logs.length > 0 ? (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-4 text-sm text-slate-600 whitespace-nowrap">
                                            {formatDate(log.created_at)}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                log.notification_type === 'transaction_report'
                                                    ? 'bg-sky-100 text-sky-700'
                                                    : 'bg-violet-100 text-violet-700'
                                            }`}>
                                                {log.notification_type === 'transaction_report' ? 'Report' : 'Transaction'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-700 max-w-[200px] truncate" title={log.recipient_email}>
                                            {log.recipient_email}
                                        </td>
                                        <td className="px-4 py-4 text-sm text-slate-600 max-w-[200px] truncate" title={log.subject}>
                                            {log.subject}
                                        </td>
                                        <td className="px-4 py-4">
                                            <StatusBadge status={log.status} />
                                        </td>
                                        <td className="px-4 py-4 text-xs text-slate-400 font-mono">
                                            {log.resend_email_id ? log.resend_email_id.substring(0, 12) + '...' : '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                                        No notification logs yet
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transaction Report Modal */}
            <TransactionReportModal
                isOpen={showReportModal}
                onClose={() => {
                    setShowReportModal(false);
                    fetchLogs(); // Refresh logs after closing modal
                }}
                defaultRecipients={settings.recipients}
            />
        </div>
    );
};

export default NotificationsTab;
