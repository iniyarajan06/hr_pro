import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';

const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24 };
const tag = (bg, fg) => ({ background: bg, color: fg, borderRadius: 8, padding: '4px 12px', fontSize: 13, fontWeight: 500, display: 'inline-block' });
const scoreColor = (s) => s >= 80 ? '#10b981' : s >= 50 ? '#f59e0b' : '#ef4444';

export default function CandidateDetail() {
    const { id } = useParams();
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get(`/candidates/${id}`).then(r => setData(r.data)).catch(() => { });
    }, [id]);

    if (!data) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 400, color: 'rgba(255,255,255,0.3)' }}>Loading candidate…</div>
    );

    const sc = data.score;

    return (
        <div>
            <Link to={`/jobs/${data.job_id || ''}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>← Back</Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, marginBottom: 32 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1, #a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff', fontWeight: 700 }}>
                    {(data.name || '?')[0].toUpperCase()}
                </div>
                <div>
                    <h1 style={{ fontSize: 30, fontWeight: 700, color: '#fff', margin: 0 }}>{data.name || 'Unknown Candidate'}</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, margin: '2px 0 0' }}>
                        {data.email || '—'} · {data.phone || '—'} · {data.location || '—'}
                    </p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                {/* ATS Score */}
                <div style={card}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16 }}>📊 ATS Score</h2>
                    {sc ? (
                        <>
                            <div style={{ fontSize: 56, fontWeight: 800, color: scoreColor(sc.score), margin: '10px 0' }}>{Math.round(sc.score)}%</div>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 }}>{sc.explanation}</p>
                            <div style={{ marginTop: 16 }}>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Matched Keywords</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {(sc.matched_keywords || []).map((k, i) => <span key={i} style={tag('rgba(16,185,129,0.15)', '#10b981')}>{k}</span>)}
                                    {(!sc.matched_keywords?.length) && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>None</span>}
                                </div>
                            </div>
                            <div style={{ marginTop: 14 }}>
                                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Missing Keywords</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {(sc.missing_keywords || []).map((k, i) => <span key={i} style={tag('rgba(239,68,68,0.15)', '#f87171')}>{k}</span>)}
                                    {(!sc.missing_keywords?.length) && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>None</span>}
                                </div>
                            </div>
                        </>
                    ) : <div style={{ color: 'rgba(255,255,255,0.25)', padding: 20 }}>Not scored yet.</div>}
                </div>

                {/* Profile */}
                <div style={card}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16 }}>👤 Profile</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                        {[
                            ['Experience', data.experience_years != null ? `${data.experience_years} years` : '—'],
                            ['CGPA', data.cgpa || '—'],
                            ['Notice Period', data.notice_period_days != null ? `${data.notice_period_days} days` : '—'],
                            ['Location', data.location || '—'],
                        ].map(([lbl, val]) => (
                            <div key={lbl}>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{lbl}</div>
                                <div style={{ color: '#fff', fontSize: 15 }}>{val}</div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: 20 }}>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Skills</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {(data.skills || []).map((s, i) => <span key={i} style={tag('rgba(99,102,241,0.15)', '#a5b4fc')}>{s}</span>)}
                            {(!data.skills?.length) && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No skills parsed</span>}
                        </div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Education</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {(data.education || []).map((e, i) => (
                                <span key={i} style={tag('rgba(59,130,246,0.15)', '#60a5fa')}>{typeof e === 'string' ? e : e.degree || JSON.stringify(e)}</span>
                            ))}
                            {(!data.education?.length) && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No education parsed</span>}
                        </div>
                    </div>

                    <div style={{ marginTop: 16 }}>
                        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Certifications</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {(data.certifications || []).map((c, i) => <span key={i} style={tag('rgba(245,158,11,0.15)', '#fbbf24')}>{c}</span>)}
                            {(!data.certifications?.length) && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>None</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Company Fit */}
            {data.company_fit && (
                <div style={{ ...card, marginBottom: 20 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 12 }}>🏢 Company Fit</h2>
                    <div style={{ fontSize: 32, fontWeight: 700, color: scoreColor(data.company_fit.fit_score), marginBottom: 8 }}>
                        {Math.round(data.company_fit.fit_score)}
                    </div>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6 }}>{data.company_fit.rationale}</p>
                </div>
            )}

            {/* Resume Preview */}
            <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: 0 }}>📄 Resume Preview</h2>
                    {data.resume && (
                        <div style={{ display: 'flex', gap: 8 }}>
                            <a href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/resumes/${data.resume.id}/pdf`} target="_blank" rel="noopener noreferrer" style={{
                                background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: 8, padding: '7px 12px',
                                fontSize: 12, fontWeight: 600, textDecoration: 'none', transition: 'background 0.2s',
                            }}>↗ Open in Tab</a>
                            <a href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/resumes/${data.resume.id}/pdf`} download={`${data.resume.original_filename}`} style={{
                                background: '#6366f1', color: '#fff', borderRadius: 8, padding: '7px 12px',
                                fontSize: 12, fontWeight: 600, textDecoration: 'none', transition: 'background 0.2s',
                            }}>⬇ Download</a>
                        </div>
                    )}
                </div>

                {data.resume ? (
                    <div style={{ position: 'relative', width: '100%', height: 600, background: 'rgba(0,0,0,0.5)', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <iframe
                            src={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/resumes/${data.resume.id}/pdf#view=FitH`}
                            title="Resume Preview"
                            style={{ width: '100%', height: '100%', border: 'none', background: '#e2e8f0' }}
                            onError={(e) => { e.target.parentElement.innerHTML = '<div style="color:rgba(255,255,255,0.5);padding:40px;text-align:center;">Failed to load PDF preview.<br/><button onclick="window.location.reload()" style="margin-top:12px;background:#ef4444;color:white;border:none;padding:6px 12px;border-radius:6px;cursor:pointer;">Retry</button></div>'; }}
                        />
                    </div>
                ) : (
                    <div style={{ color: 'rgba(255,255,255,0.2)', padding: 32, textAlign: 'center', background: 'rgba(0,0,0,0.3)', borderRadius: 12 }}>
                        No resume PDF available.
                    </div>
                )}

                {data.parsed_text && (
                    <details style={{ marginTop: 20 }}>
                        <summary style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, cursor: 'pointer', outline: 'none' }}>Show Raw Parsed Text Data</summary>
                        <pre style={{
                            marginTop: 12, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12,
                            padding: 20, color: 'rgba(255,255,255,0.4)', fontSize: 12, lineHeight: 1.6,
                            maxHeight: 250, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        }}>{data.parsed_text}</pre>
                    </details>
                )}
            </div>
        </div>
    );
}
