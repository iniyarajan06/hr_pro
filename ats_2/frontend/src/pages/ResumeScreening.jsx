import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';

const statusColors = { parsed: '#10b981', failed: '#ef4444', pending: '#f59e0b', uploaded: '#3b82f6', parsing: '#a855f7', scoring: '#ec4899' };
const thCell = { padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' };
const tdCell = { padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 14 };

export default function ResumeScreening() {
    const { id } = useParams();
    const [resumes, setResumes] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef(null);
    const [recalculating, setRecalculating] = useState(false);
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        fetchResumes();
        const interval = setInterval(fetchResumes, 4000);
        return () => clearInterval(interval);
    }, [id]);

    const fetchResumes = async () => {
        try { const r = await api.get(`/jobs/${id}/resumes`); setResumes(r.data); } catch { }
    };

    const recalculateScores = async () => {
        setRecalculating(true);
        setMsg(null);
        try {
            const res = await api.post(`/jobs/${id}/recalculate-scores`);
            setMsg({ type: 'success', text: res.data.message });
            setTimeout(() => setMsg(null), 5000);
            fetchResumes();
        } catch (err) {
            setMsg({ type: 'error', text: 'Failed to recalculate scores.' });
        }
        setRecalculating(false);
    };

    const doUpload = async (files) => {
        if (!files?.length) return;
        setUploading(true);
        setProgress(0);
        const formData = new FormData();
        for (let i = 0; i < files.length; i++) formData.append('files', files[i]);
        try {
            await api.post(`/jobs/${id}/resumes/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => { if (e.total) setProgress(Math.round((e.loaded / e.total) * 100)); },
            });
        } catch { }
        setUploading(false);
        setProgress(0);
        fetchResumes();
    };

    const handleFileInput = (e) => doUpload(e.target.files);
    const handleDrop = (e) => { e.preventDefault(); setDragActive(false); doUpload(e.dataTransfer.files); };
    const handleDragOver = (e) => { e.preventDefault(); setDragActive(true); };
    const handleDragLeave = () => setDragActive(false);

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <Link to={`/jobs/${id}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>← Back to Job</Link>
                    <h1 style={{ fontSize: 34, fontWeight: 700, margin: '10px 0 4px', color: '#fff' }}>Resume Screening</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 20, fontSize: 15 }}>Upload resumes and monitor real-time parsing progress.</p>
                </div>
                <div style={{ textAlign: 'right', marginBottom: 20 }}>
                    <button onClick={recalculateScores} disabled={recalculating} style={{
                        background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)',
                        borderRadius: 10, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.25)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)' }}
                    >
                        {recalculating ? '⏳ Recalculating…' : '🔄 Recalculate Scores'}
                    </button>
                    {msg && (
                        <div style={{
                            marginTop: 8, fontSize: 12, padding: '4px 10px', borderRadius: 6,
                            background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                            color: msg.type === 'success' ? '#10b981' : '#f87171',
                            border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                            transition: 'opacity 0.5s'
                        }}>
                            {msg.text}
                        </div>
                    )}
                </div>
            </div>

            {/* Upload Zone */}
            <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                style={{
                    border: `2px dashed ${dragActive ? 'rgba(99,102,241,0.6)' : 'rgba(99,102,241,0.2)'}`,
                    borderRadius: 20, padding: 48, textAlign: 'center', cursor: 'pointer',
                    marginBottom: 32, transition: 'all 0.2s',
                    background: dragActive ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.03)',
                }}
            >
                <input ref={fileInputRef} type="file" multiple accept=".pdf,.zip" onChange={handleFileInput} style={{ display: 'none' }} />
                <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.7 }}>📎</div>
                {uploading ? (
                    <>
                        <div style={{ color: '#a5b4fc', fontWeight: 600, marginBottom: 8 }}>Uploading… {progress}%</div>
                        <div style={{ width: 260, height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, margin: '0 auto', overflow: 'hidden' }}>
                            <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #a855f7)', borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ color: '#a5b4fc', fontWeight: 600, marginBottom: 4 }}>Drop files here or click to upload</div>
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>Supports PDF and ZIP files — multiple files allowed</div>
                    </>
                )}
            </div>

            {/* Resume Count Summary */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 500 }}>Total Resumes:</span>
                <span style={{
                    background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                    padding: '2px 10px', borderRadius: 8, fontSize: 14, fontWeight: 700
                }}>{resumes.length}</span>
            </div>

            {/* Resumes Table */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden', marginBottom: 32 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            {['S.No', 'Filename', 'Status', 'ATS Score', 'Company Fit', 'Error'].map(h => <th key={h} style={thCell}>{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {resumes.length === 0 && (
                            <tr><td colSpan={6} style={{ ...tdCell, padding: 56, textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>No resumes uploaded yet.</td></tr>
                        )}
                        {resumes.map((r, idx) => (
                            <tr key={r.id}>
                                <td style={{ ...tdCell, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{idx + 1}</td>
                                <td style={{ ...tdCell, color: '#fff' }}>📄 {r.original_filename}</td>
                                <td style={tdCell}>
                                    <span style={{
                                        background: `${statusColors[r.status] || '#6b7280'}18`,
                                        color: statusColors[r.status] || '#9ca3af',
                                        border: `1px solid ${statusColors[r.status] || '#6b7280'}40`,
                                        borderRadius: 8, padding: '3px 12px', fontSize: 12, fontWeight: 600,
                                    }}>{r.status}</span>
                                </td>
                                <td style={{ ...tdCell, fontWeight: 600 }}>
                                    {r.score !== undefined && r.score !== null ? (
                                        <span style={{ color: r.score >= 80 ? '#10b981' : r.score >= 50 ? '#f59e0b' : '#ef4444' }}>{Math.round(r.score)}%</span>
                                    ) : (r.status === 'parsed' || r.status === 'parsing' || r.status === 'scoring') ? (
                                        <span style={{ color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>Scoring…</span>
                                    ) : (
                                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                                    )}
                                </td>
                                <td style={{ ...tdCell, fontWeight: 600 }}>
                                    {r.company_fit_score !== undefined && r.company_fit_score !== null ? (
                                        <span style={{ color: r.company_fit_score >= 70 ? '#10b981' : r.company_fit_score >= 40 ? '#f59e0b' : '#ef4444' }}>{Math.round(r.company_fit_score)}%</span>
                                    ) : (
                                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                                    )}
                                </td>
                                <td style={{ ...tdCell, color: '#f87171', fontSize: 13 }}>{r.error_reason || '—'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Navigation Button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 60 }}>
                <Link
                    to={`/jobs/${id}/ranking`}
                    style={{
                        background: resumes.length > 0 ? '#6366f1' : 'rgba(255,255,255,0.05)',
                        color: resumes.length > 0 ? '#fff' : 'rgba(255,255,255,0.2)',
                        padding: '14px 28px', borderRadius: 12, textDecoration: 'none',
                        fontWeight: 700, fontSize: 15, transition: 'all 0.2s',
                        pointerEvents: resumes.length > 0 ? 'auto' : 'none',
                        boxShadow: resumes.length > 0 ? '0 10px 15px -3px rgba(99, 102, 241, 0.3)' : 'none'
                    }}
                    onMouseEnter={e => { if (resumes.length > 0) e.currentTarget.style.transform = 'translateY(-2px)' }}
                    onMouseLeave={e => { if (resumes.length > 0) e.currentTarget.style.transform = 'translateY(0)' }}
                >
                    Proceed to Candidate Ranking →
                </Link>
            </div>
        </div>
    );
}
