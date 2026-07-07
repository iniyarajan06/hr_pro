import React, { useState, useEffect } from 'react';
import api from '../lib/api';

const glassCard = {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20, padding: 28, backdropFilter: 'blur(12px)', marginBottom: 24
};

const btn = (color) => ({
    background: `${color}20`, color, border: `1px solid ${color}40`,
    borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
    transition: 'all 0.2s', marginLeft: 6
});

const categoryRowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 12, marginBottom: 8
};

const statusLabel = (color) => ({
    fontSize: 13, fontWeight: 600, color, display: 'flex', alignItems: 'center', gap: 8
});

export default function Reports() {
    const [jobs, setJobs] = useState([]);
    const [msg, setMsg] = useState(null);

    useEffect(() => {
        api.get('/jobs').then(res => setJobs(res.data)).catch(() => { });
    }, []);

    const handleExport = async (jobId, format, classification) => {
        try {
            const res = await api.post(`/jobs/${jobId}/reports/export`,
                { format, classification },
                { responseType: 'blob' }
            );

            // Create a download link for the blob
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `report_${jobId}_${classification || 'full'}.${format}`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            setMsg({ type: 'success', text: `${classification ? classification.charAt(0).toUpperCase() + classification.slice(1) : 'Full'} report (${format.toUpperCase()}) downloaded.` });
            setTimeout(() => setMsg(null), 5000);
        } catch {
            setMsg({ type: 'error', text: 'Failed to generate export.' });
        }
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 36 }}>
                <div>
                    <h1 style={{ fontSize: 34, fontWeight: 700, margin: '0 0 6px', color: '#fff' }}>Role-Based Reports</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>Category-specific candidate exports for every position.</p>
                </div>
                {msg && (
                    <div style={{
                        padding: '10px 20px', borderRadius: 12,
                        background: msg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color: msg.type === 'success' ? '#10b981' : '#f87171',
                        border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    }}>
                        {msg.text}
                    </div>
                )}
            </div>

            {jobs.length === 0 && (
                <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.25)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 16 }}>
                    No jobs found. Create a job to generate reports.
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: 24 }}>
                {jobs.map(job => (
                    <div key={job.id} style={glassCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div>
                                <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>{job.title}</div>
                                <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginTop: 4 }}>Job ID: {job.id} • Status: {job.status}</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <CategorySection
                                label="Selected Candidates"
                                color="#10b981"
                                icon="✅"
                                onExport={(fmt) => handleExport(job.id, fmt, 'selected')}
                            />
                            <CategorySection
                                label="Waitlisted Candidates"
                                color="#f59e0b"
                                icon="⏳"
                                onExport={(fmt) => handleExport(job.id, fmt, 'waitlisted')}
                            />
                            <CategorySection
                                label="Rejected Candidates"
                                color="#f87171"
                                icon="✕"
                                onExport={(fmt) => handleExport(job.id, fmt, 'rejected')}
                            />
                            <div style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>MASTER EXPORT (ALL)</span>
                                <div>
                                    <button onClick={() => handleExport(job.id, 'csv', null)} style={btn('#6366f1')}>CSV</button>
                                    <button onClick={() => handleExport(job.id, 'xlsx', null)} style={btn('#10b981')}>XLSX</button>
                                    <button onClick={() => handleExport(job.id, 'pdf', null)} style={btn('#f59e0b')}>PDF</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CategorySection({ label, color, icon, onExport }) {
    return (
        <div style={categoryRowStyle}>
            <div style={statusLabel(color)}>
                <span style={{ fontSize: 16 }}>{icon}</span>
                {label}
            </div>
            <div style={{ display: 'flex' }}>
                <button onClick={() => onExport('csv')} style={btn(color)}>CSV</button>
                <button onClick={() => onExport('xlsx')} style={btn(color)}>XLSX</button>
                <button onClick={() => onExport('pdf')} style={btn(color)}>PDF</button>
            </div>
        </div>
    );
}
