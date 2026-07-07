import React, { useState, useEffect } from 'react';
import api from '../lib/api';

const card = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 28 };

export default function Settings() {
    const [groqStatus, setGroqStatus] = useState(null);
    const [taxonomy, setTaxonomy] = useState(null);
    const [templates, setTemplates] = useState([]);

    useEffect(() => {
        api.get('/settings/groq-status').then(res => setGroqStatus(res.data)).catch(() => { });
        api.get('/settings/taxonomy').then(res => setTaxonomy(res.data)).catch(() => { });
        api.get('/settings/threshold-templates').then(res => setTemplates(res.data)).catch(() => { });
    }, []);

    return (
        <div>
            <h1 style={{ fontSize: 34, fontWeight: 700, margin: '0 0 6px', color: '#fff' }}>Settings</h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', marginBottom: 36, fontSize: 15 }}>Configure integrations, taxonomies, and threshold templates.</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
                {/* Groq API Status */}
                <div style={card}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        🤖 Groq Configuration
                    </h2>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>Status:</span>
                        <span style={{
                            background: groqStatus?.status === 'configured' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            color: groqStatus?.status === 'configured' ? '#10b981' : '#f87171',
                            border: `1px solid ${groqStatus?.status === 'configured' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                            borderRadius: 8, padding: '3px 12px', fontSize: 13, fontWeight: 600
                        }}>
                            {groqStatus?.status || 'Checking…'}
                        </span>
                    </div>
                    {groqStatus?.masked_key && (
                        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px', fontFamily: 'monospace', color: '#a5b4fc', fontSize: 13 }}>
                            {groqStatus.masked_key}
                        </div>
                    )}
                </div>

                {/* Skills Taxonomy */}
                <div style={card}>
                    <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 16 }}>🏷 Skills Taxonomy</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {(taxonomy?.skills || []).map((s, i) => (
                            <span key={i} style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, padding: '4px 12px', fontSize: 13, color: '#a5b4fc' }}>{s}</span>
                        ))}
                        {!taxonomy?.skills?.length && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No taxonomy loaded.</span>}
                    </div>
                </div>
            </div>

            {/* Threshold Templates */}
            <div style={card}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 20 }}>⚖️ Threshold Templates</h2>
                <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
                    {templates.length === 0 && <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14 }}>No templates configured.</span>}
                    {templates.map((t, i) => (
                        <div key={i} style={{ minWidth: 240, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20, flexShrink: 0 }}>
                            <div style={{ fontWeight: 600, color: '#fff', marginBottom: 8 }}>{t.name}</div>
                            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 10 }}>Logic: <span style={{ color: '#a5b4fc' }}>{t.logic}</span></div>
                            <pre style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 10, fontSize: 12, color: '#6ee7b7', overflowX: 'auto', margin: 0 }}>
                                {JSON.stringify(t.rules, null, 2)}
                            </pre>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
