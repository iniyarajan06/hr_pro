import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const glassCard = {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: '24px 24px',
    backdropFilter: 'blur(12px)',
    transition: 'border-color 0.3s, transform 0.2s',
};

const kpiIcon = (color) => ({
    width: 44, height: 44, borderRadius: 12,
    background: `${color}18`, border: `1px solid ${color}35`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, marginBottom: 14,
});

const thCell = { padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' };
const tdCell = { padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 14 };

function BarChart({ data, label, colorStart, colorEnd }) {
    if (!data || data.length === 0) return <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13, padding: 20 }}>No data yet</div>;
    const maxVal = Math.max(...data.map(d => d.count || d.value || 0), 1);
    return (
        <div>
            <div style={{ fontWeight: 600, color: '#fff', fontSize: 14, marginBottom: 16 }}>{label}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {data.map((d, i) => {
                    const val = d.count || d.value || 0;
                    const pct = (val / maxVal) * 100;
                    return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span
                                title={d.range || d.name || d.years || d.degree || d.date || '—'}
                                style={{
                                    width: 120, fontSize: 11, color: 'rgba(255,255,255,0.4)', textAlign: 'right',
                                    flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                                }}
                            >
                                {d.range || d.name || d.years || d.degree || d.date || '—'}
                            </span>
                            <div style={{ flex: 1, height: 22, background: 'rgba(255,255,255,0.04)', borderRadius: 6, overflow: 'hidden' }}>
                                <div style={{
                                    width: `${pct}%`, height: '100%', borderRadius: 6,
                                    background: `linear-gradient(90deg, ${colorStart}, ${colorEnd})`,
                                    transition: 'width 0.6s ease',
                                }} />
                            </div>
                            <span style={{ width: 30, fontSize: 12, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>{val}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [summary, setSummary] = useState({});
    const [charts, setCharts] = useState({});
    const [recentJobs, setRecentJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/dashboard/summary').catch(() => ({ data: {} })),
            api.get('/dashboard/charts').catch(() => ({ data: {} })),
            api.get('/jobs').catch(() => ({ data: [] }))
        ]).then(([s, c, j]) => {
            setSummary(s.data);
            setCharts(c.data);
            
            // Sort jobs by created_at desc if available, or id desc, and take latest 5
            const sorted = (j.data || []).sort((a, b) => b.id - a.id).slice(0, 5);
            setRecentJobs(sorted);
            
            setLoading(false);
        });
    }, []);

    const kpis = [
        { label: 'Total Jobs', value: summary.total_jobs ?? 0, color: '#6366f1', icon: '💼' },
        { label: 'Total Resumes', value: summary.total_resumes ?? 0, color: '#a855f7', icon: '📄' },
        { label: 'Total Candidates', value: summary.total_candidates ?? 0, color: '#3b82f6', icon: '👤' },
        { label: 'Selected Candidates', value: summary.selected_candidates ?? 0, color: '#10b981', icon: '✅' },
        { label: 'Waitlisted Candidates', value: summary.waitlisted_candidates ?? 0, color: '#f59e0b', icon: '⏳' },
        { label: 'Rejected Candidates', value: summary.rejected_candidates ?? 0, color: '#ef4444', icon: '❌' },
        { label: 'Avg ATS Score', value: summary.average_ats_score ?? 0, color: '#ec4899', icon: '📈' },
        { label: 'Avg Company Fit', value: summary.average_company_fit ?? 0, color: '#c084fc', icon: '🏢' },
    ];

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
                <div>
                    <h1 style={{ fontSize: 34, fontWeight: 700, margin: '0 0 4px', color: '#fff', letterSpacing: -0.5 }}>Overview</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>Welcome back. Here's your recruitment overview.</p>
                </div>
                <div>
                    <button onClick={() => navigate('/jobs?add=true')} style={{
                        background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12,
                        padding: '12px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                    }}>+ Add New Job</button>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 16, marginBottom: 32 }}>
                {kpis.map((k, i) => (
                    <div key={i} style={glassCard}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = `${k.color}50`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <div style={kpiIcon(k.color)}>{k.icon}</div>
                        <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</div>
                        <div style={{ fontSize: typeof k.value === 'number' ? 28 : 18, fontWeight: 700, color: '#fff' }}>
                            {loading ? <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)' }}>…</span> : k.value}
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Recent Jobs Table */}
            <div style={{ ...glassCard, marginBottom: 32, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 16, color: '#fff' }}>Recent Jobs</h2>
                    <Link to="/jobs" style={{ color: '#6366f1', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>View All Jobs →</Link>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                        <thead>
                            <tr>
                                <th style={thCell}>Job Title</th>
                                <th style={thCell}>Location</th>
                                <th style={thCell}>Status</th>
                                <th style={thCell}>Candidate Count</th>
                                <th style={thCell}>Created Date</th>
                                <th style={thCell}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentJobs.length === 0 && !loading && (
                                <tr>
                                    <td colSpan={6} style={{ ...tdCell, padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No jobs available.</td>
                                </tr>
                            )}
                            {recentJobs.map(job => (
                                <tr key={job.id} style={{ transition: 'background 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ ...tdCell, color: '#fff', fontWeight: 500 }}>{job.title}</td>
                                    <td style={{ ...tdCell, color: 'rgba(255,255,255,0.6)' }}>{job.questionnaire?.location || 'N/A'}</td>
                                    <td style={{ ...tdCell }}>
                                        {job.status === 'active' ? <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Active</span> :
                                         job.status === 'draft' ? <span style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Draft</span> :
                                         <span style={{ color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Closed</span>}
                                    </td>
                                    <td style={{ ...tdCell, color: 'rgba(255,255,255,0.6)' }}>—</td>
                                    <td style={{ ...tdCell, color: 'rgba(255,255,255,0.6)' }}>
                                        {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}
                                    </td>
                                    <td style={tdCell}>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <Link to={`/jobs/${job.id}`} style={{
                                                background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)',
                                                borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600,
                                                textDecoration: 'none'
                                            }}>👁 View</Link>
                                            <button style={{
                                                background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)',
                                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '5px 10px',
                                                fontSize: 12, fontWeight: 600, cursor: 'pointer'
                                            }}>More ⋮</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div style={glassCard}>
                    <BarChart data={charts.ats_distribution} label="📊 ATS Score Distribution" colorStart="#6366f1" colorEnd="#a855f7" />
                </div>
                <div style={glassCard}>
                    <BarChart data={charts.fit_distribution} label="🏢 Company Fit Distribution" colorStart="#c084fc" colorEnd="#a855f7" />
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20, marginBottom: 20 }}>
                <div style={glassCard}>
                    <BarChart data={charts.top_skills} label="🏷 Skill Distribution" colorStart="#10b981" colorEnd="#34d399" />
                </div>
                <div style={glassCard}>
                    <BarChart data={charts.experience_distribution} label="⏳ Experience" colorStart="#f59e0b" colorEnd="#fbbf24" />
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 20, marginBottom: 20 }}>
                <div style={glassCard}>
                    <BarChart data={charts.education_breakdown} label="🎓 Top Degrees (Normalized)" colorStart="#3b82f6" colorEnd="#60a5fa" />
                </div>
                <div style={glassCard}>
                    <BarChart data={charts.education_categories} label="🏫 Education Categories" colorStart="#8b5cf6" colorEnd="#a78bfa" />
                </div>
            </div>
            <div style={{ marginTop: 0, paddingBottom: 24 }}>
                <div style={glassCard}>
                    <BarChart data={charts.upload_trend} label="📅 Upload Trend" colorStart="#ec4899" colorEnd="#f472b6" />
                </div>
            </div>
        </div>
    );
}
