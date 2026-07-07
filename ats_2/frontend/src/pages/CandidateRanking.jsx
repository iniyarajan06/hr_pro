import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';

const btn = (bg, label) => ({
    background: bg, color: '#fff', border: 'none', borderRadius: 10,
    padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
});

const scoreColor = (s) => s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';

const thCell = { padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' };
const tdCell = { padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 14 };

const inputStyle = {
    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 13, outline: 'none',
    width: '100%', boxSizing: 'border-box'
};

const tabStyle = (active) => ({
    padding: '12px 24px',
    cursor: 'pointer',
    color: active ? '#fff' : 'rgba(255,255,255,0.4)',
    borderBottom: `2px solid ${active ? '#6366f1' : 'transparent'}`,
    fontWeight: 600,
    fontSize: 14,
    transition: 'all 0.2s'
});

export default function CandidateRanking() {
    const { id } = useParams();
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [availableScores, setAvailableScores] = useState({ ats_scores: [], fit_scores: [] });
    const [atsThreshold, setAtsThreshold] = useState(0);
    const [fitThreshold, setFitThreshold] = useState(0);
    const [activeTab, setActiveTab] = useState('selected');

    const fetchScores = useCallback(async () => {
        try {
            const res = await api.get(`/jobs/${id}/available-scores`);
            setAvailableScores(res.data);
            // Default threshold to a reasonable value or max
            if (res.data.ats_scores.length > 0 && atsThreshold === 0) {
                setAtsThreshold(res.data.ats_scores[Math.floor(res.data.ats_scores.length * 0.7)] || res.data.ats_scores[0]);
            }
            if (res.data.fit_scores.length > 0 && fitThreshold === 0) {
                setFitThreshold(res.data.fit_scores[Math.floor(res.data.fit_scores.length * 0.7)] || res.data.fit_scores[0]);
            }
        } catch { }
    }, [id, atsThreshold, fitThreshold]);

    const fetchRanking = useCallback(async () => {
        try {
            const res = await api.get(`/jobs/${id}/ranking`);
            setCandidates(res.data);
        } catch { }
    }, [id]);

    useEffect(() => {
        fetchScores();
        fetchRanking();
    }, [id]);

    // Auto-refresh rankings periodically in case scoring is happening in background
    useEffect(() => {
        const interval = setInterval(fetchRanking, 8000);
        return () => clearInterval(interval);
    }, [fetchRanking]);

    const triggerScoring = async () => {
        setLoading(true);
        await api.post(`/jobs/${id}/score`);
        setTimeout(() => {
            fetchScores();
            fetchRanking();
            setLoading(false);
        }, 4000);
    };

    const classified = useMemo(() => {
        const selected = [];
        const waitlisted = [];
        const rejected = [];

        candidates.forEach(c => {
            const ats = c.score?.score || 0;
            const fit = c.company_fit?.fit_score || 0;

            if (ats >= atsThreshold && fit >= fitThreshold) {
                selected.push(c);
            } else if (
                (ats >= atsThreshold - 10 && ats < atsThreshold) ||
                (fit >= fitThreshold - 10 && fit < fitThreshold)
            ) {
                waitlisted.push(c);
            } else {
                rejected.push(c);
            }
        });

        return { selected, waitlisted, rejected };
    }, [candidates, atsThreshold, fitThreshold]);

    const tabData = activeTab === 'selected' ? classified.selected :
        activeTab === 'waitlisted' ? classified.waitlisted :
            classified.rejected;

    const toggleShortlist = async (candidateId, currentStatus) => {
        await api.put(`/candidates/${candidateId}/shortlist`, { is_shortlisted: !currentStatus });
        fetchRanking();
    };

    return (
        <div>
            <Link to={`/jobs/${id}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>← Back to Job</Link>
            <h1 style={{ fontSize: 34, fontWeight: 700, margin: '10px 0 4px', color: '#fff' }}>Candidate Classification</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 28, fontSize: 15 }}>Dynamically classify candidates based on real-time score distributions.</p>

            {/* Dynamic Threshold Selectors */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 20, marginBottom: 24 }}>
                <h3 style={{ fontSize: 14, color: '#fff', marginBottom: 16, fontWeight: 600 }}>⚙️ Set Dynamic Thresholds</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 200px', gap: 20, alignItems: 'end' }}>
                    <div>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8, fontWeight: 500 }}>ATS Match Threshold</label>
                        <select style={inputStyle} value={atsThreshold} onChange={e => setAtsThreshold(Number(e.target.value))}>
                            <option value={0}>Any Score</option>
                            {availableScores.ats_scores.map(s => <option key={s} value={s}>{s}% Match</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 8, fontWeight: 500 }}>Company Fit Threshold</label>
                        <select style={inputStyle} value={fitThreshold} onChange={e => setFitThreshold(Number(e.target.value))}>
                            <option value={0}>Any Score</option>
                            {availableScores.fit_scores.map(s => <option key={s} value={s}>{s}% Fit</option>)}
                        </select>
                    </div>
                    <button onClick={triggerScoring} style={btn('#6366f1')} disabled={loading}>
                        {loading ? '⏳ Scoring…' : '⚡ Run Batch Scoring'}
                    </button>
                    <button
                        onClick={async () => {
                            const all = [
                                ...classified.selected.map(c => ({ ...c, status: 'Selected' })),
                                ...classified.waitlisted.map(c => ({ ...c, status: 'Waitlisted' })),
                                ...classified.rejected.map(c => ({ ...c, status: 'Rejected' }))
                            ];
                            const payload = {
                                classifications: all.map((c, i) => ({
                                    candidate_id: c.id,
                                    candidate_name: c.name || 'Unknown',
                                    email: c.email || 'N/A',
                                    ats_score: c.score?.score || 0,
                                    company_fit_score: c.company_fit?.fit_score || 0,
                                    classification_status: c.status,
                                    skills: Array.isArray(c.skills) ? c.skills.join(', ') : (c.skills || 'N/A'),
                                    experience: `${c.experience_years || 0} yrs`,
                                    education: Array.isArray(c.education)
                                        ? c.education.map(e => typeof e === 'string' ? e : `${e.degree || ''} ${e.institution || ''}`).join(', ')
                                        : (c.education || 'N/A'),
                                    rank: i + 1,
                                    ats_threshold: atsThreshold,
                                    fit_threshold: fitThreshold
                                }))
                            };
                            try {
                                await api.post(`/jobs/${id}/classifications`, payload);
                                alert('Classifications saved successfully! Dashboard and Job Summary updated.');
                            } catch {
                                alert('Failed to save classifications.');
                            }
                        }}
                        style={btn('#10b981')}
                        disabled={candidates.length === 0}
                    >
                        💾 Save Classifications
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: 20 }}>
                <div style={tabStyle(activeTab === 'selected')} onClick={() => setActiveTab('selected')}>
                    Selected ({classified.selected.length})
                </div>
                <div style={tabStyle(activeTab === 'waitlisted')} onClick={() => setActiveTab('waitlisted')}>
                    Waitlisted ({classified.waitlisted.length})
                </div>
                <div style={tabStyle(activeTab === 'rejected')} onClick={() => setActiveTab('rejected')}>
                    Rejected ({classified.rejected.length})
                </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                    <thead>
                        <tr>
                            {['Rank', 'Name', 'ATS Score', 'Company Fit', 'Experience', 'Education', 'Skills', 'Actions'].map(h => (
                                <th key={h} style={thCell}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tabData.length === 0 && (
                            <tr><td colSpan={8} style={{ ...tdCell, padding: 56, textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
                                No candidates in this category. Adjust thresholds to reclassify.
                            </td></tr>
                        )}
                        {tabData.map((c, i) => {
                            const score = c.score?.score;
                            const eduStr = c.education
                                ? (Array.isArray(c.education)
                                    ? c.education.map(e => typeof e === 'string' ? e : `${e.degree || ''}${e.institution ? ' — ' + e.institution : ''}`).filter(Boolean).join(', ')
                                    : String(c.education))
                                : 'N/A';
                            const skillsList = Array.isArray(c.skills) ? c.skills : [];
                            return (
                                <tr key={c.id} style={{ transition: 'background 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ ...tdCell, color: '#a5b4fc', fontWeight: 700, fontSize: 16 }}>#{i + 1}</td>
                                    <td style={{ ...tdCell }}>
                                        <div style={{ color: '#fff', fontWeight: 500 }}>{c.name || 'Unknown'}</div>
                                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{c.email}</div>
                                    </td>
                                    <td style={tdCell}>
                                        {score !== undefined && score !== null ? (
                                            <span style={{
                                                background: `${scoreColor(score)}18`, color: scoreColor(score),
                                                border: `1px solid ${scoreColor(score)}40`, borderRadius: 8,
                                                padding: '4px 12px', fontWeight: 700, fontSize: 13,
                                            }}>{Math.round(score)}%</span>
                                        ) : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Pending</span>}
                                    </td>
                                    <td style={tdCell}>
                                        {c.company_fit?.fit_score !== undefined ? (
                                            <span title={c.company_fit.rationale} style={{
                                                background: `rgba(168, 85, 247, 0.15)`, color: '#c084fc',
                                                border: `1px solid rgba(168, 85, 247, 0.4)`, borderRadius: 8,
                                                padding: '4px 12px', fontWeight: 700, fontSize: 13, cursor: 'help'
                                            }}>{Math.round(c.company_fit.fit_score)}%</span>
                                        ) : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>—</span>}
                                    </td>
                                    <td style={{ ...tdCell, color: 'rgba(255,255,255,0.5)' }}>
                                        {c.experience_years != null ? `${c.experience_years} yrs` : 'N/A'}
                                    </td>
                                    <td style={{ ...tdCell, color: 'rgba(255,255,255,0.5)', fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {eduStr}
                                    </td>
                                    <td style={{ ...tdCell, maxWidth: 200 }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {skillsList.slice(0, 3).map((sk, idx) => (
                                                <span key={idx} style={{
                                                    background: 'rgba(99,102,241,0.12)', color: '#a5b4fc',
                                                    border: '1px solid rgba(99,102,241,0.25)', borderRadius: 6,
                                                    padding: '2px 8px', fontSize: 11, fontWeight: 500
                                                }}>{sk}</span>
                                            ))}
                                            {skillsList.length > 3 && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>+{skillsList.length - 3}</span>}
                                        </div>
                                    </td>
                                    <td style={{ ...tdCell }}>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button onClick={() => toggleShortlist(c.id, c.is_shortlisted)} style={{
                                                background: c.is_shortlisted ? '#10b981' : 'rgba(255,255,255,0.05)',
                                                color: c.is_shortlisted ? '#fff' : 'rgba(255,255,255,0.4)',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                            }}>
                                                {c.is_shortlisted ? '★' : '☆'}
                                            </button>
                                            <Link to={`/candidates/${c.id}`} style={{
                                                background: 'rgba(99,102,241,0.12)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.25)',
                                                borderRadius: 8, padding: '5px 14px', fontSize: 12, fontWeight: 600,
                                                textDecoration: 'none', whiteSpace: 'nowrap',
                                            }}>Profile</Link>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
