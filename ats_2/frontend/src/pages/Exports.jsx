import React, { useState, useEffect } from 'react';
import api from '../lib/api';

export default function Exports() {
    const [jobs, setJobs] = useState([]);
    const [reports, setReports] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState(null);

    useEffect(() => { api.get('/jobs').then(res => setJobs(res.data)).catch(() => { }); }, []);
    useEffect(() => {
        if (selectedJobId) api.get(`/jobs/${selectedJobId}/reports`).then(res => setReports(res.data)).catch(() => { });
    }, [selectedJobId]);

    const handleDownload = (reportId) => {
        window.open(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/reports/${reportId}/download`, '_blank');
    };

    return (
        <div>
            <h1 style={{ fontSize: 34, fontWeight: 700, margin: '0 0 6px', color: '#fff' }}>Exports</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 36, fontSize: 15 }}>Download previously generated report exports.</p>

            <div style={{ marginBottom: 28 }}>
                <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 8 }}>Select Job</label>
                <select
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 16px', color: '#fff', fontSize: 14, minWidth: 280 }}
                    onChange={e => setSelectedJobId(Number(e.target.value))}
                >
                    <option value="">— Select a Job —</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
                </select>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            {['Format', 'Storage Key', 'Created At', 'Action'].map(h => (
                                <th key={h} style={{ padding: '14px 20px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {reports.length === 0 && (
                            <tr><td colSpan={4} style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>{selectedJobId ? 'No exports for this job yet.' : 'Select a job to view exports.'}</td></tr>
                        )}
                        {reports.map((r, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                <td style={{ padding: '14px 20px' }}>
                                    <span style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6, padding: '3px 10px', fontWeight: 700, fontSize: 12, textTransform: 'uppercase' }}>{r.format}</span>
                                </td>
                                <td style={{ padding: '14px 20px', color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: 'monospace' }}>{r.storage_key}</td>
                                <td style={{ padding: '14px 20px', color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>{new Date(r.created_at).toLocaleString()}</td>
                                <td style={{ padding: '14px 20px' }}>
                                    <button onClick={() => handleDownload(r.id)} style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                                        ⬇ Download
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
