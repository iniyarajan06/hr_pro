import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';

const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28 };
const btnPrimary = { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer', width: '100%', marginTop: 10 };
const btnPurple = { ...btnPrimary, background: '#a855f7' };
const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' };

const kpiCard = { ...card, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8 };

export default function JobDetail() {
    const { id } = useParams();
    const [job, setJob] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [generating, setGenerating] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [companyUrl, setCompanyUrl] = useState('');
    const [editQ, setEditQ] = useState(null);
    const [recalculating, setRecalculating] = useState(false);
    const [msg, setMsg] = useState(null);
    const [summary, setSummary] = useState(null);

    useEffect(() => { 
        fetchJob(); 
        fetchCandidates();
        fetchSummary();
    }, [id]);

    const fetchSummary = async () => {
        try {
            const r = await api.get(`/jobs/${id}/summary`);
            setSummary(r.data);
        } catch { }
    };

    const fetchJob = async () => {
        try {
            const r = await api.get(`/jobs/${id}`);
            setJob(r.data);
            setEditQ(r.data.questionnaire || {});
            if (r.data.company_url && !companyUrl) setCompanyUrl(r.data.company_url);
        } catch { }
    };

    const fetchCandidates = async () => {
        try {
            const res = await api.get(`/jobs/${id}/ranking`);
            setCandidates(res.data);
        } catch { }
    };

    const recalculateScores = async () => {
        setRecalculating(true);
        setMsg(null);
        try {
            const res = await api.post(`/jobs/${id}/recalculate-scores`);
            setMsg({ type: 'success', text: res.data.message });
            setTimeout(() => setMsg(null), 5000);
        } catch (err) {
            setMsg({ type: 'error', text: 'Failed to recalculate scores.' });
        }
        setRecalculating(false);
    };

    const analyzeCompany = async () => {
        setAnalyzing(true);
        try { await api.post(`/jobs/${id}/analyze-company`, { url: companyUrl }); } catch { }
        setAnalyzing(false);
        fetchJob();
    };

    const saveQuestionnaire = async () => {
        await api.put(`/jobs/${id}`, { questionnaire: editQ });
        fetchJob();
    };

    const generateJd = async () => {
        setGenerating(true);
        try { await api.post(`/jobs/${id}/generate-jd`); } catch { }
        setGenerating(false);
        fetchJob();
    };

    const extractKeywords = async () => {
        setExtracting(true);
        try { await api.post(`/jobs/${id}/extract-keywords`); } catch { }
        setExtracting(false);
        fetchJob();
    };

    if (!job) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'rgba(255,255,255,0.3)' }}>Loading job…</div>;

    const qFields = [
        ['role', 'Role / Title'], ['required_skills', 'Required Skills'], ['experience', 'Experience'],
        ['education', 'Education'], ['employment_type', 'Employment Type'], ['location', 'Location'],
        ['nice_to_have', 'Nice-to-have Skills'], ['additional_notes', 'Additional Notes'],
    ];
    
    const kpis = [
        { label: 'Total Candidates', value: summary?.total_candidates ?? candidates.length, color: '#3b82f6' },
        { label: 'Selected', value: summary?.selected ?? 0, color: '#10b981' },
        { label: 'Waitlisted', value: summary?.waitlisted ?? 0, color: '#f59e0b' },
        { label: 'Rejected', value: summary?.rejected ?? 0, color: '#ef4444' },
        { label: 'Average ATS', value: summary?.average_ats ? `${summary.average_ats}%` : 'N/A', color: '#8b5cf6' },
        { label: 'Average Company Fit', value: summary?.average_company_fit ? `${summary.average_company_fit}%` : 'N/A', color: '#ec4899' },
    ];

    return (
        <div>
            {/* Header Details */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
                <div>
                    <Link to="/jobs" style={{ color: '#6366f1', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>← Back to Jobs</Link>
                    <h1 style={{ fontSize: 34, fontWeight: 700, margin: '8px 0 12px', color: '#fff' }}>{job.title}</h1>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'rgba(255,255,255,0.5)', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: job.status === 'active' ? '#10b981' : '#f59e0b' }} />
                            {job.status === 'active' ? 'Active' : 'Draft'}
                        </span>
                        <span>📍 {job.questionnaire?.location || 'Location N/A'}</span>
                        <span>💼 {job.questionnaire?.employment_type || 'Employment N/A'}</span>
                        <span>🆔 #{job.id}</span>
                        <span>📅 {new Date(job.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button style={{ ...btnPrimary, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', width: 'auto', marginTop: 0 }}>
                        Edit Job
                    </button>
                    <button style={{ ...btnPrimary, width: 'auto', marginTop: 0 }}>
                        + Add Candidates
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 16, marginBottom: 32 }}>
                {kpis.map((k, i) => (
                    <div key={i} style={kpiCard}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: k.color }}>{k.value}</div>
                    </div>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                {/* Sections: Job Description & Required Skills */}
                <div style={card}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16 }}>📋 Job Details (Questionnaire)</h2>
                    {editQ && qFields.map(([key, label]) => (
                        <div key={key} style={{ marginBottom: 12 }}>
                            <label style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
                            <input
                                style={inputStyle}
                                value={Array.isArray(editQ[key]) ? editQ[key].join(', ') : (editQ[key] || '')}
                                onChange={e => {
                                    const val = ['required_skills', 'nice_to_have'].includes(key)
                                        ? e.target.value.split(',').map(s => s.trim())
                                        : e.target.value;
                                    setEditQ({ ...editQ, [key]: val });
                                }}
                                placeholder={label}
                            />
                        </div>
                    ))}
                    <button onClick={saveQuestionnaire} style={{ ...btnPrimary, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        💾 Save Questionnaire
                    </button>
                    <button onClick={generateJd} disabled={generating} style={btnPrimary}>
                        {generating ? '⏳ Generating…' : '🤖 Generate JD from Questionnaire'}
                    </button>
                </div>

                <div style={card}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16 }}>📝 Job Description</h2>
                    <textarea
                        readOnly value={job.jd_text || ''}
                        placeholder="JD will appear after generation…"
                        style={{ ...inputStyle, minHeight: 200, resize: 'vertical', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}
                    />

                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16 }}>🏢 Company Context</h2>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                        <input
                            style={inputStyle}
                            value={companyUrl}
                            onChange={e => setCompanyUrl(e.target.value)}
                            placeholder="Paste Company Website URL Here"
                        />
                        <button onClick={analyzeCompany} disabled={analyzing || !companyUrl} style={{ ...btnPrimary, marginTop: 0, width: 'auto', whiteSpace: 'nowrap' }}>
                            {analyzing ? '⏳ Analyzing…' : '🌐 Analyze Company'}
                        </button>
                    </div>

                    <button onClick={extractKeywords} disabled={extracting} style={btnPurple}>
                        {extracting ? '⏳ Extracting…' : '🔍 Extract ATS Keywords'}
                    </button>

                    <h2 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: '24px 0 12px' }}>🏷 ATS Keywords</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {(job.ats_keywords || []).map((k, i) => (
                            <span key={i} style={{
                                background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
                                borderRadius: 8, padding: '4px 12px', fontSize: 13, color: '#a5b4fc',
                            }}>
                                {k.keyword} <span style={{ opacity: 0.5 }}>({k.weight})</span>
                            </span>
                        ))}
                        {!job.ats_keywords?.length && <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>No keywords yet.</span>}
                    </div>
                </div>
            </div>

            {/* Distribution Charts (Placeholders for visual consistency with Dashboard) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 32 }}>
                <div style={card}>
                    <h3 style={{ fontSize: 14, color: '#fff', marginBottom: 12 }}>ATS Distribution</h3>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Distribution available on Dashboard.</div>
                </div>
                <div style={card}>
                    <h3 style={{ fontSize: 14, color: '#fff', marginBottom: 12 }}>Company Fit Distribution</h3>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Distribution available on Dashboard.</div>
                </div>
                <div style={card}>
                    <h3 style={{ fontSize: 14, color: '#fff', marginBottom: 12 }}>Resume Upload Trend</h3>
                    <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>Trend available on Dashboard.</div>
                </div>
            </div>

            {/* Recent Candidates Table */}
            <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 32 }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: 16, color: '#fff' }}>Recent Candidates</h2>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <button onClick={recalculateScores} disabled={recalculating} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>
                            {recalculating ? '⏳ Recalculating...' : '🔄 Recalculate Scores'}
                        </button>
                        <Link to={`/jobs/${id}/ranking`} style={{ color: '#6366f1', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>View All Candidates →</Link>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Rank</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Name</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>ATS Score</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Company Fit</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Experience</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {candidates.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.3)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>No candidates found for this job.</td>
                                </tr>
                            )}
                            {candidates.slice(0, 5).map((c, i) => (
                                <tr key={c.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#fff', fontWeight: 600 }}>#{i + 1}</td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <div style={{ color: '#fff', fontWeight: 500 }}>{c.name || 'Unknown'}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        {c.score?.score !== undefined ? (
                                            <span style={{ color: '#10b981', fontWeight: 600 }}>{Math.round(c.score.score)}%</span>
                                        ) : <span style={{ color: 'rgba(255,255,255,0.3)' }}>Pending</span>}
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        {c.company_fit?.fit_score !== undefined ? (
                                            <span style={{ color: '#c084fc', fontWeight: 600 }}>{Math.round(c.company_fit.fit_score)}%</span>
                                        ) : <span style={{ color: 'rgba(255,255,255,0.3)' }}>Pending</span>}
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)' }}>
                                        {c.experience_years != null ? `${c.experience_years} yrs` : 'N/A'}
                                    </td>
                                    <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <Link to={`/candidates/${c.id}`} style={{ background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>👁 View</Link>
                                            <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>⬇ Download</button>
                                            <button style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', borderRadius: 6, padding: '4px 8px', fontSize: 11, cursor: 'pointer' }}>⋮</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Navigation Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                {[
                    { to: `/jobs/${id}/screening`, icon: '📂', label: 'Resume Screening', color: '#6366f1' },
                    { to: `/jobs/${id}/ranking`, icon: '🏆', label: 'Candidate Ranking', color: '#a855f7' },
                    { to: `/reports`, icon: '📋', label: 'Reports', color: '#10b981' },
                ].map(n => (
                    <Link key={n.to} to={n.to} style={{ textDecoration: 'none' }}>
                        <div style={{
                            background: `${n.color}0d`, border: `1px solid ${n.color}30`,
                            borderRadius: 16, padding: '18px 20px', textAlign: 'center',
                            color: n.color, fontWeight: 600, fontSize: 14, cursor: 'pointer',
                            transition: 'all 0.2s',
                        }}
                            onMouseEnter={e => { e.currentTarget.style.background = `${n.color}1a`; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = `${n.color}0d`; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            {n.icon} {n.label} →
                        </div>
                    </Link>
                ))}
            </div>
            
            {msg && (
                <div style={{
                    position: 'fixed', bottom: 20, right: 20,
                    padding: '12px 20px', borderRadius: 8,
                    background: msg.type === 'success' ? '#10b981' : '#ef4444',
                    color: '#fff', fontWeight: 600, boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    zIndex: 9999
                }}>
                    {msg.text}
                </div>
            )}
        </div>
    );
}
