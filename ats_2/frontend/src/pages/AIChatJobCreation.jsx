import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import api from '../lib/api';
import { ROLE_CATALOGS } from './roleCatalog';

const OTHER_OPT = { label: '➕ Other (Custom)', value: '__other__' };

const toOpts = (arr) => {
    if (!arr) return [OTHER_OPT];
    const normalized = arr.map(x => {
        if (x && typeof x === 'object' && 'label' in x) return x;
        return { label: String(x), value: String(x) };
    });
    return [...normalized, OTHER_OPT];
};

// Styles
const selectStyles = {
    control: (b, s) => ({ ...b, background: 'rgba(255,255,255,0.06)', borderColor: s.isFocused ? '#6366f1' : 'rgba(255,255,255,0.12)', color: '#fff', boxShadow: 'none', borderRadius: 10, minHeight: 42 }),
    menu: b => ({ ...b, background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', zIndex: 9999 }),
    menuPortal: b => ({ ...b, zIndex: 9999 }),
    option: (b, { isFocused, isSelected }) => ({ ...b, background: isSelected ? '#6366f1' : isFocused ? 'rgba(255,255,255,0.08)' : 'transparent', color: '#fff', cursor: 'pointer' }),
    multiValue: b => ({ ...b, background: 'rgba(99,102,241,0.25)', borderRadius: 6 }),
    multiValueLabel: b => ({ ...b, color: '#c7d2fe', padding: '2px 6px', fontSize: 13 }),
    multiValueRemove: b => ({ ...b, color: '#a5b4fc', ':hover': { background: '#ef4444', color: '#fff' } }),
    singleValue: b => ({ ...b, color: '#fff', fontSize: 14 }),
    input: b => ({ ...b, color: '#fff' }),
    placeholder: b => ({ ...b, color: 'rgba(255,255,255,0.3)', fontSize: 14 }),
};

const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};

export default function AIChatJobCreation({ onCancel }) {
    const navigate = useNavigate();
    const [stepIdx, setStepIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [currentVal, setCurrentVal] = useState(null);
    const [customText, setCustomText] = useState('');
    const [messages, setMessages] = useState([
        { from: 'ai', text: "Hi! I'm your AI Job Creation Assistant 🤖\n\nI'll guide you through creating an optimized, ATS-ready Job Description step by step. Let's start!" }
    ]);
    const [generating, setGenerating] = useState(false);
    const bottomRef = useRef(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Dynamically resolve steps based on current selected role catalog
    const selectedRole = answers['role']?.value || '';
    const catalog = ROLE_CATALOGS[selectedRole] || null;

    // Memoize so STEPS reference is stable — only rebuilds when catalog changes
    const STEPS = useMemo(() => [
        { id: 'role', label: '🎯 Job Role', single: true, opts: () => Object.keys(ROLE_CATALOGS).map(r => ({ label: r, value: r })) },
        { id: 'languages', label: '💻 Programming Languages', single: false, opts: () => catalog?.languages || [] },
        { id: 'frameworks', label: '🧱 Frameworks / Libraries', single: false, opts: () => catalog?.frameworks || [] },
        { id: 'databases', label: '🗄 Databases', single: false, opts: () => catalog?.databases || [] },
        { id: 'cloudDevops', label: '☁ Cloud & DevOps', single: false, opts: () => catalog?.cloudDevops || [] },
        { id: 'tools', label: '🛠 Tools / Utilities', single: false, opts: () => catalog?.tools || [] },
        { id: 'concepts', label: '🧠 Core Concepts', single: false, opts: () => catalog?.concepts || [] },
        { id: 'preferred_skills', label: '✨ Preferred Skills', single: false, opts: () => catalog?.preferredSkills || [] },
        { id: 'responsibilities', label: '📋 Responsibilities', single: false, opts: () => catalog?.responsibilities || [] },
        { id: 'education', label: '🎓 Education', single: false, opts: () => catalog?.education || [] },
        { id: 'certifications', label: '📜 Certifications', single: false, opts: () => catalog?.certifications || [] },
        { id: 'benefits', label: '🎁 Benefits', single: false, opts: () => catalog?.benefits || [] },
        { id: 'experience', label: '⏳ Experience Required', single: true, opts: () => ['Fresher', '0–1 Years', '1–2 Years', '2–3 Years', '3–5 Years', '5–7 Years', '7–10 Years', '10+ Years'] },
        { id: 'location', label: '📍 Location', single: true, opts: () => ['Chennai', 'Bangalore', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi', 'Coimbatore', 'Kochi', 'Noida', 'Gurgaon', 'Remote', 'Hybrid'] },
        { id: 'employment_type', label: '💼 Employment Type', single: true, opts: () => ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'] },
    ], [catalog]);

    const currentStep = stepIdx < STEPS.length ? STEPS[stepIdx] : { id: 'review', label: '📝 Review & Generate' };

    // Calculate catalog options or default input
    const rawOpts = stepIdx < STEPS.length ? STEPS[stepIdx].opts() : [];
    const currentOpts = toOpts(rawOpts);

    const pushMessage = (from, text) => {
        setMessages(m => [...m, { from, text }]);
    };

    const handleNext = () => {
        const step = STEPS[stepIdx];
        if (!currentVal || (Array.isArray(currentVal) && currentVal.length === 0)) return;

        // Resolve "other" custom input value
        let finalVal = currentVal;
        if (step.single) {
            if (currentVal.value === '__other__' && customText.trim()) {
                finalVal = { label: customText.trim(), value: customText.trim() };
            }
        } else {
            const hasOther = (currentVal || []).some(x => x.value === '__other__');
            if (hasOther && customText.trim()) {
                const cleaned = currentVal.filter(x => x.value !== '__other__');
                finalVal = [...cleaned, { label: customText.trim(), value: customText.trim() }];
            } else if (hasOther) {
                finalVal = currentVal.filter(x => x.value !== '__other__');
            }
        }

        const displayVal = step.single
            ? finalVal.label
            : (Array.isArray(finalVal) ? finalVal.map(x => x.label).join(', ') : '');

        pushMessage('user', displayVal);
        setAnswers(prev => ({ ...prev, [step.id]: finalVal }));

        const nextIdx = stepIdx + 1;
        if (nextIdx < STEPS.length) {
            const nextStep = STEPS[nextIdx];
            const nextLabel = nextStep.label.replace(/^\S+\s*/u, '') || nextStep.label;
            pushMessage('ai', `Great! Next, select one or more options for **${nextLabel}**:`);
            setStepIdx(nextIdx);
        } else {
            pushMessage('ai', "Excellent! All details are collected. Review the configuration and generate the Job Description.");
            setStepIdx(STEPS.length);
        }

        setCurrentVal(null);
        setCustomText('');
    };

    const getValue = (key) => {
        const v = answers[key];
        if (!v) return '—';
        if (Array.isArray(v)) return v.map(x => x.label).join(', ');
        return v.label || v;
    };

    const handleGenerate = async () => {
        setGenerating(true);
        pushMessage('ai', '⏳ Building your job profiles and generating optimized job description narrative...');

        // Combine all selected skill categories (languages, frameworks, databases, cloudDevops, tools, concepts)
        // to compose the unified required_skills array in the questionnaire payload.
        const collectedSkills = [
            ...(answers.languages || []),
            ...(answers.frameworks || []),
            ...(answers.databases || []),
            ...(answers.cloudDevops || []),
            ...(answers.tools || []),
            ...(answers.concepts || []),
        ].map(x => x.label);

        const questionnaire = {
            role: answers.role?.value || answers.role,
            experience: answers.experience?.label || answers.experience,
            location: answers.location?.label,
            employment_type: answers.employment_type?.label,
            required_skills: collectedSkills,
            preferred_skills: (answers.preferred_skills || []).map(x => x.label),
            responsibilities: (answers.responsibilities || []).map(x => x.label),
            education: (answers.education || []).map(x => x.label),
            certifications: (answers.certifications || []).map(x => x.label),
            benefits: (answers.benefits || []).map(x => x.label),
        };

        try {
            const createRes = await api.post('/jobs', {
                title: questionnaire.role,
                questionnaire,
                status: 'draft',
            });
            const jobId = createRes.data.id;

            // Existing JD formulation/ATS validation endpoints
            await api.post(`/jobs/${jobId}/generate-jd`);
            await api.post(`/jobs/${jobId}/extract-keywords`);

            pushMessage('ai', '✅ Job Description created successfully! Redirecting to Job Detail Page...');
            setGenerating(false);
            setTimeout(() => navigate(`/jobs/${jobId}`), 1200);
        } catch (err) {
            console.error(err);
            pushMessage('ai', '❌ Generating the job details failed. Please verify configurations and try again.');
            setGenerating(false);
        }
    };

    const isReviewStep = stepIdx >= STEPS.length;
    const currentStepDef = isReviewStep ? null : STEPS[stepIdx];
    const showOtherInput = currentStepDef && (
        currentStepDef.single
            ? currentVal?.value === '__other__'
            : (currentVal || []).some(x => x.value === '__other__')
    );

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, minHeight: 620 }}>
            {/* Chat Bot Panel */}
            <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(99,102,241,0.25)',
                borderRadius: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden', maxHeight: 680,
            }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
                    <div>
                        <div style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Role Knowledge Base Assistant</div>
                        <div style={{ color: '#10b981', fontSize: 11, fontWeight: 500 }}>● Online</div>
                    </div>
                    <div style={{ marginLeft: 'auto', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                        Step {Math.min(stepIdx + 1, STEPS.length + 1)} / {STEPS.length + 1}
                    </div>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {messages.map((m, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: m.from === 'ai' ? 'flex-start' : 'flex-end' }}>
                            <div style={{
                                maxWidth: '85%', padding: '10px 14px', borderRadius: m.from === 'ai' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                                background: m.from === 'ai' ? 'rgba(99,102,241,0.15)' : 'rgba(16,185,129,0.15)',
                                border: m.from === 'ai' ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(16,185,129,0.25)',
                                color: '#e2e8f0', fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
                            }}>
                                {m.text}
                            </div>
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                {!isReviewStep && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.2)' }}>
                        <Select
                            options={currentOpts}
                            isMulti={!currentStepDef?.single}
                            styles={selectStyles}
                            value={currentVal}
                            onChange={setCurrentVal}
                            placeholder={`Select ${currentStepDef?.label?.replace(/^[^\s]+\s/, '') || ''}...`}
                            menuPortalTarget={document.body}
                        />
                        {showOtherInput && (
                            <input
                                style={{ ...inputStyle, marginTop: 8 }}
                                placeholder="Type your custom value..."
                                value={customText}
                                onChange={e => setCustomText(e.target.value)}
                                autoFocus
                            />
                        )}
                        <button
                            onClick={handleNext}
                            disabled={!currentVal || (Array.isArray(currentVal) && currentVal.length === 0)}
                            style={{
                                marginTop: 10, width: '100%', background: '#6366f1', color: '#fff',
                                border: 'none', borderRadius: 10, padding: '10px', fontWeight: 600, fontSize: 14,
                                cursor: 'pointer', opacity: (!currentVal || (Array.isArray(currentVal) && currentVal.length === 0)) ? 0.4 : 1,
                                transition: 'opacity 0.2s',
                            }}
                        >
                            {stepIdx === STEPS.length - 1 ? '📋 Review →' : 'Next →'}
                        </button>
                    </div>
                )}
            </div>

            {/* Review / Catalog Display Panel */}
            <div style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 20, padding: 24, overflowY: 'auto', maxHeight: 680,
            }}>
                {!isReviewStep ? (
                    <div>
                        <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 600, marginBottom: 16 }}>📊 Progress Preview</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {STEPS.map((s, i) => {
                                const done = i < stepIdx;
                                const active = i === stepIdx;
                                const val = answers[s.id];
                                return (
                                    <div key={s.id} style={{
                                        padding: '10px 14px', borderRadius: 10,
                                        background: active ? 'rgba(99,102,241,0.12)' : done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${active ? 'rgba(99,102,241,0.35)' : done ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`,
                                    }}>
                                        <div style={{ fontSize: 11, color: active ? '#a5b4fc' : done ? '#10b981' : 'rgba(255,255,255,0.3)', fontWeight: 600, marginBottom: 2 }}>
                                            {active ? '▶ ' : done ? '✓ ' : '○ '}{s.label}
                                        </div>
                                        {done && val && (
                                            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
                                                {Array.isArray(val) ? val.map(x => x.label).join(', ') : val.label}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div>
                        <h3 style={{ color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 20 }}>📝 Review Your Job Details</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
                            {STEPS.map(s => (
                                <div key={s.id}>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{s.label.replace(/^[^\s]+\s/, '')}</div>
                                    <div style={{ fontSize: 13, color: '#e2e8f0', background: 'rgba(255,255,255,0.04)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.07)' }}>
                                        {getValue(s.id)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={generating}
                            style={{
                                width: '100%', background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff',
                                border: 'none', borderRadius: 12, padding: '14px', fontWeight: 700, fontSize: 15,
                                cursor: 'pointer', opacity: generating ? 0.6 : 1, transition: 'opacity 0.2s',
                                boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                            }}
                        >
                            {generating ? '⏳ Generating...' : '✨ Generate Job Description & Keywords'}
                        </button>

                        <button
                            onClick={() => { setStepIdx(STEPS.length - 1); setMessages(m => [...m, { from: 'ai', text: 'Back to editing! Pick any step from the chat on the left.' }]); }}
                            style={{
                                width: '100%', marginTop: 10, background: 'transparent', color: 'rgba(255,255,255,0.5)',
                                border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px', fontSize: 13, cursor: 'pointer',
                            }}
                        >
                            ← Go Back and Edit
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
