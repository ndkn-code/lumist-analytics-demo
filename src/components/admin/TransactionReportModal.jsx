import React, { useState, useEffect } from 'react';
import { X, Send, Calendar, FileText, Plus, Check, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { supabaseSocial, PROXY_SUPABASE_URL, PROXY_SUPABASE_KEY } from '../../lib/supabase';

const TIME_FRAME_OPTIONS = [
    { value: '7', label: 'Last 7 days' },
    { value: '14', label: 'Last 14 days' },
    { value: '30', label: 'Last 30 days' },
    { value: '90', label: 'Last 90 days' },
    { value: 'custom', label: 'Custom' },
];

const PAYMENT_PROVIDERS = ['stripe', 'zalopay', 'vnpay'];
const TRANSACTION_STATUSES = ['success', 'pending', 'failed', 'refunded'];

// Checkbox component
const Checkbox = ({ checked, onChange, label, disabled }) => (
    <label className={`flex items-center gap-2 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
        <div
            onClick={() => !disabled && onChange(!checked)}
            className={`
                w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                ${checked ? 'bg-violet-600 border-violet-600' : 'border-slate-300 bg-white'}
                ${disabled ? '' : 'hover:border-violet-400'}
            `}
        >
            {checked && <Check size={14} className="text-white" />}
        </div>
        <span className="text-sm text-slate-700 capitalize">{label}</span>
    </label>
);

const TransactionReportModal = ({ isOpen, onClose, defaultRecipients = [] }) => {
    // Form state
    const [timeFrame, setTimeFrame] = useState('30');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [allProviders, setAllProviders] = useState(true);
    const [selectedProviders, setSelectedProviders] = useState([]);
    const [allStatuses, setAllStatuses] = useState(false);
    const [selectedStatuses, setSelectedStatuses] = useState(['success']);
    const [recipients, setRecipients] = useState([]);
    const [newEmail, setNewEmail] = useState('');

    // UI state
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState(null);

    // Initialize recipients from props
    useEffect(() => {
        if (isOpen) {
            setRecipients(defaultRecipients);
            setMessage(null);
        }
    }, [isOpen, defaultRecipients]);

    // Calculate date range based on time frame
    const getDateRange = () => {
        if (timeFrame === 'custom') {
            return { startDate: customStartDate, endDate: customEndDate };
        }
        const days = parseInt(timeFrame);
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);

        const formatDate = (d) => d.toISOString().split('T')[0];
        return { startDate: formatDate(start), endDate: formatDate(end) };
    };

    // Handle provider checkbox changes
    const handleProviderChange = (provider) => {
        if (allProviders) {
            setAllProviders(false);
            setSelectedProviders([provider]);
        } else {
            const updated = selectedProviders.includes(provider)
                ? selectedProviders.filter(p => p !== provider)
                : [...selectedProviders, provider];

            if (updated.length === 0) {
                setAllProviders(true);
            } else {
                setSelectedProviders(updated);
            }
        }
    };

    const handleAllProvidersChange = (checked) => {
        setAllProviders(checked);
        if (checked) {
            setSelectedProviders([]);
        }
    };

    // Handle status checkbox changes
    const handleStatusChange = (status) => {
        if (allStatuses) {
            setAllStatuses(false);
            setSelectedStatuses([status]);
        } else {
            const updated = selectedStatuses.includes(status)
                ? selectedStatuses.filter(s => s !== status)
                : [...selectedStatuses, status];

            if (updated.length === 0) {
                setAllStatuses(true);
            } else {
                setSelectedStatuses(updated);
            }
        }
    };

    const handleAllStatusesChange = (checked) => {
        setAllStatuses(checked);
        if (checked) {
            setSelectedStatuses([]);
        }
    };

    // Add email recipient
    const addEmail = () => {
        const email = newEmail.trim().toLowerCase();
        if (!email) return;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setMessage({ type: 'error', text: 'Please enter a valid email address' });
            return;
        }

        if (recipients.includes(email)) {
            setMessage({ type: 'error', text: 'Email already added' });
            return;
        }

        setRecipients([...recipients, email]);
        setNewEmail('');
        setMessage(null);
    };

    const removeEmail = (emailToRemove) => {
        setRecipients(recipients.filter(email => email !== emailToRemove));
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addEmail();
        }
    };

    // Send report
    const sendReport = async () => {
        // Validation
        if (recipients.length === 0) {
            setMessage({ type: 'error', text: 'Please add at least one recipient' });
            return;
        }

        const { startDate, endDate } = getDateRange();
        if (timeFrame === 'custom' && (!startDate || !endDate)) {
            setMessage({ type: 'error', text: 'Please select start and end dates' });
            return;
        }

        setSending(true);
        setMessage(null);

        try {
            // Fetch transactions from Main Supabase
            let query = supabase
                .from('unified_transactions')
                .select('*')
                .gte('created_at', `${startDate}T00:00:00`)
                .lte('created_at', `${endDate}T23:59:59`)
                .order('created_at', { ascending: false })
                .limit(200);

            // Apply provider filter
            if (!allProviders && selectedProviders.length > 0) {
                query = query.in('payment_provider', selectedProviders);
            }

            // Apply status filter
            if (!allStatuses && selectedStatuses.length > 0) {
                query = query.in('status', selectedStatuses);
            }

            const { data: transactions, error: fetchError } = await query;

            if (fetchError) {
                throw new Error(`Failed to fetch transactions: ${fetchError.message}`);
            }

            if (!transactions || transactions.length === 0) {
                setMessage({ type: 'error', text: 'No transactions found matching your filters' });
                setSending(false);
                return;
            }

            // Get auth token for Edge Function
            const session = await supabaseSocial.auth.getSession();
            const accessToken = session.data.session?.access_token;

            // Build filters description for email
            const filters = {
                startDate,
                endDate,
                providers: allProviders ? 'All' : selectedProviders.join(', '),
                statuses: allStatuses ? 'All' : selectedStatuses.join(', ')
            };

            // Call Edge Function to send report
            const response = await fetch(
                `${PROXY_SUPABASE_URL}/functions/v1/send-transaction-report`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        recipients,
                        transactions,
                        filters
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();
            setMessage({ type: 'success', text: `Report sent successfully to ${recipients.length} recipient(s)!` });

            // Close modal after short delay on success
            setTimeout(() => {
                onClose();
            }, 2000);

        } catch (error) {
            console.error('Error sending report:', error);
            setMessage({ type: 'error', text: `Failed to send report: ${error.message}` });
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-50 rounded-lg">
                            <FileText className="text-violet-600" size={20} />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">
                            Send Transaction Report
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                    {/* Time Frame */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                            <Calendar size={16} />
                            Time Frame
                        </label>
                        <select
                            value={timeFrame}
                            onChange={(e) => setTimeFrame(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm
                                focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
                                bg-white"
                        >
                            {TIME_FRAME_OPTIONS.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>

                        {/* Custom date inputs */}
                        {timeFrame === 'custom' && (
                            <div className="flex gap-3 mt-3">
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-500 mb-1">Start Date</label>
                                    <input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm
                                            focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-slate-500 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm
                                            focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Payment Provider */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                            Payment Provider
                        </label>
                        <div className="space-y-2">
                            <Checkbox
                                checked={allProviders}
                                onChange={handleAllProvidersChange}
                                label="All Providers"
                            />
                            <div className="flex flex-wrap gap-4 ml-6">
                                {PAYMENT_PROVIDERS.map(provider => (
                                    <Checkbox
                                        key={provider}
                                        checked={!allProviders && selectedProviders.includes(provider)}
                                        onChange={() => handleProviderChange(provider)}
                                        label={provider}
                                        disabled={allProviders}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Transaction Status */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-3">
                            Transaction Status
                        </label>
                        <div className="space-y-2">
                            <Checkbox
                                checked={allStatuses}
                                onChange={handleAllStatusesChange}
                                label="All Statuses"
                            />
                            <div className="flex flex-wrap gap-4 ml-6">
                                {TRANSACTION_STATUSES.map(status => (
                                    <Checkbox
                                        key={status}
                                        checked={!allStatuses && selectedStatuses.includes(status)}
                                        onChange={() => handleStatusChange(status)}
                                        label={status}
                                        disabled={allStatuses}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recipients */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Recipients
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
                            {recipients.map((email) => (
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
                            {recipients.length === 0 && (
                                <p className="text-sm text-slate-400 italic">
                                    No recipients added yet
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
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
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={sending}
                                className="px-4 py-2.5 text-slate-600 hover:text-slate-800
                                    rounded-lg font-medium text-sm hover:bg-slate-100 transition-colors
                                    disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={sendReport}
                                disabled={sending || recipients.length === 0}
                                className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 text-white
                                    rounded-lg font-medium text-sm hover:bg-violet-700 transition-colors
                                    disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {sending ? (
                                    <Loader2 size={16} className="animate-spin" />
                                ) : (
                                    <Send size={16} />
                                )}
                                Send Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TransactionReportModal;
