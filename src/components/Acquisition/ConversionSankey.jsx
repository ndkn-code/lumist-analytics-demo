import React from 'react';

// Custom SVG Sankey diagram with gradient flows
// Signups → Users → Paid conversion funnel

const ConversionSankey = ({ signups = 0, users = 0, paid = 0 }) => {
    // Calculate percentages for labels
    const signupToUserRate = signups > 0 ? ((users / signups) * 100).toFixed(1) : 0;
    const userToPaidRate = users > 0 ? ((paid / users) * 100).toFixed(1) : 0;
    const overallRate = signups > 0 ? ((paid / signups) * 100).toFixed(1) : 0;

    // Calculate drop-offs
    const dropoffToUser = signups - users;
    const dropoffToPaid = users - paid;

    // SVG dimensions
    const width = 900;
    const height = 280;

    // Node dimensions
    const nodeWidth = 140;
    const nodeHeight = 60;
    const nodeRadius = 12;

    // Positions
    const leftX = 60;
    const middleX = (width / 2) - (nodeWidth / 2);
    const rightX = width - nodeWidth - 60;

    const topY = 40;
    const middleY = (height / 2) - (nodeHeight / 2);
    const bottomY = height - nodeHeight - 40;

    // Calculate flow widths based on proportions (min 8px, max based on data)
    const maxFlowWidth = 50;
    const minFlowWidth = 8;

    const signupFlowWidth = Math.max(minFlowWidth, maxFlowWidth);
    const userFlowWidth = signups > 0
        ? Math.max(minFlowWidth, (users / signups) * maxFlowWidth)
        : minFlowWidth;
    const paidFlowWidth = users > 0
        ? Math.max(minFlowWidth, (paid / users) * maxFlowWidth * 0.8)
        : minFlowWidth;
    const dropoffWidth1 = Math.max(minFlowWidth * 0.6, ((signups - users) / signups) * maxFlowWidth * 0.5);
    const dropoffWidth2 = Math.max(minFlowWidth * 0.6, ((users - paid) / users) * maxFlowWidth * 0.5);

    return (
        <div className="w-full">
            <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto"
                style={{ minHeight: '200px', maxHeight: '280px' }}
            >
                <defs>
                    {/* Gradient for Signups → Users flow */}
                    <linearGradient id="signupToUserGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.9" />
                    </linearGradient>

                    {/* Gradient for Users → Paid flow */}
                    <linearGradient id="userToPaidGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.9" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.9" />
                    </linearGradient>

                    {/* Gradient for drop-off flows */}
                    <linearGradient id="dropoffGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.2" />
                    </linearGradient>

                    <linearGradient id="dropoffGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.2" />
                    </linearGradient>

                    {/* Node gradients */}
                    <linearGradient id="signupNodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#7c3aed" />
                    </linearGradient>

                    <linearGradient id="userNodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#0ea5e9" />
                        <stop offset="100%" stopColor="#0284c7" />
                    </linearGradient>

                    <linearGradient id="paidNodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                    </linearGradient>

                    {/* Drop shadow filter */}
                    <filter id="nodeShadow" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.15" />
                    </filter>
                </defs>

                {/* Flow: Signups → Users (curved path) */}
                <path
                    d={`
                        M ${leftX + nodeWidth} ${middleY + nodeHeight/2 - userFlowWidth/2}
                        C ${leftX + nodeWidth + 80} ${middleY + nodeHeight/2 - userFlowWidth/2},
                          ${middleX - 80} ${middleY + nodeHeight/2 - userFlowWidth/2},
                          ${middleX} ${middleY + nodeHeight/2 - userFlowWidth/2}
                        L ${middleX} ${middleY + nodeHeight/2 + userFlowWidth/2}
                        C ${middleX - 80} ${middleY + nodeHeight/2 + userFlowWidth/2},
                          ${leftX + nodeWidth + 80} ${middleY + nodeHeight/2 + userFlowWidth/2},
                          ${leftX + nodeWidth} ${middleY + nodeHeight/2 + userFlowWidth/2}
                        Z
                    `}
                    fill="url(#signupToUserGradient)"
                />

                {/* Flow: Users → Paid (curved path) */}
                <path
                    d={`
                        M ${middleX + nodeWidth} ${middleY + nodeHeight/2 - paidFlowWidth/2}
                        C ${middleX + nodeWidth + 80} ${middleY + nodeHeight/2 - paidFlowWidth/2},
                          ${rightX - 80} ${middleY + nodeHeight/2 - paidFlowWidth/2},
                          ${rightX} ${middleY + nodeHeight/2 - paidFlowWidth/2}
                        L ${rightX} ${middleY + nodeHeight/2 + paidFlowWidth/2}
                        C ${rightX - 80} ${middleY + nodeHeight/2 + paidFlowWidth/2},
                          ${middleX + nodeWidth + 80} ${middleY + nodeHeight/2 + paidFlowWidth/2},
                          ${middleX + nodeWidth} ${middleY + nodeHeight/2 + paidFlowWidth/2}
                        Z
                    `}
                    fill="url(#userToPaidGradient)"
                />

                {/* Drop-off flow 1: Signups that didn't become users */}
                {dropoffToUser > 0 && (
                    <path
                        d={`
                            M ${leftX + nodeWidth/2 - dropoffWidth1/2} ${middleY + nodeHeight}
                            Q ${leftX + nodeWidth/2 - dropoffWidth1/2} ${bottomY + 10},
                              ${leftX + nodeWidth/2 - dropoffWidth1/2 - 20} ${bottomY + 20}
                            L ${leftX + nodeWidth/2 + dropoffWidth1/2 - 20} ${bottomY + 20}
                            Q ${leftX + nodeWidth/2 + dropoffWidth1/2} ${bottomY + 10},
                              ${leftX + nodeWidth/2 + dropoffWidth1/2} ${middleY + nodeHeight}
                            Z
                        `}
                        fill="url(#dropoffGradient1)"
                    />
                )}

                {/* Drop-off flow 2: Users that didn't convert */}
                {dropoffToPaid > 0 && (
                    <path
                        d={`
                            M ${middleX + nodeWidth/2 - dropoffWidth2/2} ${middleY + nodeHeight}
                            Q ${middleX + nodeWidth/2 - dropoffWidth2/2} ${bottomY + 10},
                              ${middleX + nodeWidth/2 - dropoffWidth2/2 - 20} ${bottomY + 20}
                            L ${middleX + nodeWidth/2 + dropoffWidth2/2 - 20} ${bottomY + 20}
                            Q ${middleX + nodeWidth/2 + dropoffWidth2/2} ${bottomY + 10},
                              ${middleX + nodeWidth/2 + dropoffWidth2/2} ${middleY + nodeHeight}
                            Z
                        `}
                        fill="url(#dropoffGradient2)"
                    />
                )}

                {/* Node: Signups */}
                <g filter="url(#nodeShadow)">
                    <rect
                        x={leftX}
                        y={middleY}
                        width={nodeWidth}
                        height={nodeHeight}
                        rx={nodeRadius}
                        fill="url(#signupNodeGradient)"
                    />
                    <text
                        x={leftX + nodeWidth/2}
                        y={middleY + 22}
                        textAnchor="middle"
                        className="fill-white text-xs font-medium"
                        style={{ fontSize: '11px' }}
                    >
                        Signups
                    </text>
                    <text
                        x={leftX + nodeWidth/2}
                        y={middleY + 44}
                        textAnchor="middle"
                        className="fill-white font-bold"
                        style={{ fontSize: '18px' }}
                    >
                        {signups.toLocaleString()}
                    </text>
                </g>

                {/* Node: Users */}
                <g filter="url(#nodeShadow)">
                    <rect
                        x={middleX}
                        y={middleY}
                        width={nodeWidth}
                        height={nodeHeight}
                        rx={nodeRadius}
                        fill="url(#userNodeGradient)"
                    />
                    <text
                        x={middleX + nodeWidth/2}
                        y={middleY + 22}
                        textAnchor="middle"
                        className="fill-white text-xs font-medium"
                        style={{ fontSize: '11px' }}
                    >
                        Active Users
                    </text>
                    <text
                        x={middleX + nodeWidth/2}
                        y={middleY + 44}
                        textAnchor="middle"
                        className="fill-white font-bold"
                        style={{ fontSize: '18px' }}
                    >
                        {users.toLocaleString()}
                    </text>
                </g>

                {/* Node: Paid */}
                <g filter="url(#nodeShadow)">
                    <rect
                        x={rightX}
                        y={middleY}
                        width={nodeWidth}
                        height={nodeHeight}
                        rx={nodeRadius}
                        fill="url(#paidNodeGradient)"
                    />
                    <text
                        x={rightX + nodeWidth/2}
                        y={middleY + 22}
                        textAnchor="middle"
                        className="fill-white text-xs font-medium"
                        style={{ fontSize: '11px' }}
                    >
                        Paid Users
                    </text>
                    <text
                        x={rightX + nodeWidth/2}
                        y={middleY + 44}
                        textAnchor="middle"
                        className="fill-white font-bold"
                        style={{ fontSize: '18px' }}
                    >
                        {paid.toLocaleString()}
                    </text>
                </g>

                {/* Conversion rate labels */}
                <text
                    x={(leftX + nodeWidth + middleX) / 2}
                    y={middleY - 8}
                    textAnchor="middle"
                    className="fill-slate-500 font-medium"
                    style={{ fontSize: '12px' }}
                >
                    {signupToUserRate}% activated
                </text>

                <text
                    x={(middleX + nodeWidth + rightX) / 2}
                    y={middleY - 8}
                    textAnchor="middle"
                    className="fill-slate-500 font-medium"
                    style={{ fontSize: '12px' }}
                >
                    {userToPaidRate}% converted
                </text>

                {/* Drop-off labels */}
                {dropoffToUser > 0 && (
                    <text
                        x={leftX + nodeWidth/2}
                        y={bottomY + 38}
                        textAnchor="middle"
                        className="fill-slate-400"
                        style={{ fontSize: '10px' }}
                    >
                        {dropoffToUser.toLocaleString()} inactive
                    </text>
                )}

                {dropoffToPaid > 0 && (
                    <text
                        x={middleX + nodeWidth/2}
                        y={bottomY + 38}
                        textAnchor="middle"
                        className="fill-slate-400"
                        style={{ fontSize: '10px' }}
                    >
                        {dropoffToPaid.toLocaleString()} free
                    </text>
                )}
            </svg>
        </div>
    );
};

export default ConversionSankey;
