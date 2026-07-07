import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import Select from 'react-select';
import AIChatJobCreation from './AIChatJobCreation';

const glassCard = {
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20, padding: 28, backdropFilter: 'blur(12px)',
};
const inputStyle = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box',
};
const labelStyle = { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 600, marginBottom: 6, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5 };

const customSelectStyles = {
    control: (b, s) => ({ ...b, background: 'rgba(255,255,255,0.05)', borderColor: s.isFocused ? '#6366f1' : 'rgba(255,255,255,0.1)', color: '#fff', boxShadow: 'none', borderRadius: 10 }),
    menu: b => ({ ...b, background: '#1e1e2d', border: '1px solid rgba(255,255,255,0.1)', zIndex: 9999 }),
    menuPortal: b => ({ ...b, zIndex: 9999 }),
    option: (b, { isFocused, isSelected }) => ({ ...b, background: isSelected ? '#6366f1' : isFocused ? 'rgba(255,255,255,0.1)' : 'transparent', color: '#fff', cursor: 'pointer' }),
    multiValue: b => ({ ...b, background: 'rgba(99,102,241,0.2)', borderRadius: 6 }),
    multiValueLabel: b => ({ ...b, color: '#a5b4fc', padding: '2px 6px' }),
    multiValueRemove: b => ({ ...b, color: '#a5b4fc', ':hover': { background: '#ef4444', color: '#fff' } }),
    singleValue: b => ({ ...b, color: '#fff' }), input: b => ({ ...b, color: '#fff' }),
};

const OTHER_OPT = { label: '➕ Other (Type Custom Value)', value: 'other' };

const OPTS = {
    titles: [...['Software Engineer', 'Backend Developer', 'Frontend Developer', 'Full Stack Developer', 'Python Developer', 'Java Developer', 'Node.js Developer', 'React Developer', 'DevOps Engineer', 'Data Analyst', 'Data Scientist', 'ML Engineer', 'AI Engineer', 'QA Engineer', 'Product Manager', 'UI/UX Designer', 'Mobile App Developer', 'Cloud Engineer', 'Security Engineer', 'Business Analyst'].map(l => ({ label: l, value: l })), OTHER_OPT],
    exp: [...['Fresher', '0–1 Years', '1–2 Years', '2–3 Years', '3–5 Years', '5–7 Years', '7–10 Years', '10+ Years'].map(l => ({ label: l, value: l })), OTHER_OPT],
    locations: [...['Chennai', 'Bangalore', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi', 'Coimbatore', 'Kochi', 'Noida', 'Gurgaon', 'Remote', 'Hybrid'].map(l => ({ label: l, value: l })), OTHER_OPT],
    skillsReq: [...'Python, Java, C++, JavaScript, TypeScript, React, Angular, Vue, Node.js, Express.js, FastAPI, Django, Flask, Spring Boot, SQL, PostgreSQL, MySQL, MongoDB, Redis, Docker, Kubernetes, AWS, Azure, GCP, Git, Linux, REST API, GraphQL, TensorFlow, PyTorch, Scikit-learn, Pandas, NumPy, Power BI, Tableau, Spark, Hadoop'.split(', ').map(l => ({ label: l, value: l })), OTHER_OPT],
    skillsPref: [...'LangChain, LlamaIndex, OpenAI API, Groq API, RAG, Pinecone, ChromaDB, CI/CD, Jenkins, Terraform, Kafka, RabbitMQ, Celery, Airflow, Microservices, OAuth, JWT, Supabase, Firebase, Selenium, Cypress'.split(', ').map(l => ({ label: l, value: l })), OTHER_OPT],
    resp: [...['Develop backend services', 'Develop frontend UI', 'Build REST APIs', 'Database design', 'Optimize performance', 'Write unit tests', 'Fix production bugs', 'Code review', 'Team collaboration', 'AI model integration', 'Deploy applications', 'Cloud infrastructure', 'Data analysis', 'Build ML pipelines', 'Documentation'].map(l => ({ label: l, value: l })), OTHER_OPT],
    benefits: [...['Health Insurance', 'Flexible Working Hours', 'Remote Work', 'Hybrid Work', 'Performance Bonus', 'Annual Bonus', 'Paid Leave', 'Learning Budget', 'Certification Support', 'Free Food', 'Cab Facility', 'ESOP', 'Provident Fund', 'Laptop Provided', 'Gym Membership'].map(l => ({ label: l, value: l })), OTHER_OPT],
};

const emptyQ = { role: null, experience: null, location: null, required_skills: [], preferred_skills: [], responsibilities: [], benefits: [] };

export default function Jobs() {
    const [jobs, setJobs] = useState([]);
    const [showForm, setShowForm] = useState(false); // Manual form
    const [showAIFlow, setShowAIFlow] = useState(false); // AI chatbot
    const [showModeModal, setShowModeModal] = useState(false); // Picker
    const [q, setQ] = useState({ ...emptyQ });
    const [openMenuId, setOpenMenuId] = useState(null);
    const [customInputs, setCustomInputs] = useState({});

    // View All Jobs features
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [sortOrder, setSortOrder] = useState('Newest');
    const [currentPage, setCurrentPage] = useState(1);
    const jobsPerPage = 10;


    useEffect(() => { fetchJobs(); }, []);
    const fetchJobs = async () => { try { const r = await api.get('/jobs'); setJobs(r.data); } catch { } };

    const createJob = async (e) => {
        e.preventDefault();
        if (!q.role) return;

        const questionnaire = {
            role: q.role?.value,
            experience: q.experience?.value,
            location: q.location?.value,
            required_skills: (q.required_skills || []).map(x => x.value),
            preferred_skills: (q.preferred_skills || []).map(x => x.value),
            responsibilities: (q.responsibilities || []).map(x => x.value),
            benefits: (q.benefits || []).map(x => x.value),
        };

        try {
            const res = await api.post('/jobs', { title: questionnaire.role, questionnaire, status: 'draft' });
            await api.post(`/jobs/${res.data.id}/generate-jd`);
            await api.post(`/jobs/${res.data.id}/extract-keywords`);
            setQ({ ...emptyQ });
            setCustomInputs({});
            setShowForm(false);
            fetchJobs();
        } catch (err) {
            console.error("Job pipeline generation failed", err);
        }
    };

    const handleOther = (field, text, isMulti) => {
        if (!text.trim()) return;
        const newOpt = { label: text, value: text };
        if (isMulti) {
            const clean = (q[field] || []).filter(x => x.value !== 'other');
            setQ({ ...q, [field]: [...clean, newOpt] });
        } else {
            setQ({ ...q, [field]: newOpt });
        }
        setCustomInputs({ ...customInputs, [field]: '' });
    };

    const SelectField = ({ label, field, options, isMulti }) => {
        const hasOther = isMulti
            ? (q[field] || []).some(x => x.value === 'other')
            : q[field]?.value === 'other';

        return (
            <div style={{ marginBottom: 18 }}>
                <label style={labelStyle}>{label}</label>
                <Select
                    options={options}
                    isMulti={isMulti}
                    styles={customSelectStyles}
                    value={q[field]}
                    onChange={val => setQ({ ...q, [field]: val })}
                    placeholder={`Select ${label.toLowerCase()}...`}
                    menuPortalTarget={document.body}
                />
                {hasOther && (
                    <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                        <input
                            style={{ ...inputStyle, flex: 1 }}
                            placeholder={`Enter custom ${label.toLowerCase()}...`}
                            value={customInputs[field] || ''}
                            onChange={e => setCustomInputs({ ...customInputs, [field]: e.target.value })}
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={() => handleOther(field, customInputs[field] || '', isMulti)}
                            style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '0 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                            {isMulti ? 'Add' : 'Save'}
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const closeAll = () => { setShowForm(false); setShowAIFlow(false); setShowModeModal(false); };

    return (
        <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
                <div>
                    <h1 style={{ fontSize: 34, fontWeight: 700, margin: '0 0 4px', color: '#fff' }}>Jobs</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>Create and manage job positions with AI-powered JD generation.</p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    {(showForm || showAIFlow) && (
                        <button onClick={closeAll} style={{
                            background: 'rgba(239,68,68,0.15)', color: '#f87171',
                            border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: '12px 24px',
                            fontWeight: 600, fontSize: 14, cursor: 'pointer',
                        }}>✕ Cancel</button>
                    )}
                    {!showForm && !showAIFlow && (
                        <button onClick={() => setShowModeModal(true)} style={{
                            background: '#6366f1', color: '#fff', border: 'none', borderRadius: 12,
                            padding: '12px 24px', fontWeight: 600, fontSize: 14, cursor: 'pointer',
                        }}>+ Add Job</button>
                    )}
                </div>
            </div>

            {/* ── Mode Picker Modal ─────────────────────────────── */}
            {showModeModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onClick={() => setShowModeModal(false)}>
                    <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24, padding: 36, width: 480, boxShadow: '0 25px 60px rgba(0,0,0,0.7)' }}
                        onClick={e => e.stopPropagation()}>
                        <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>How do you want to create this job?</h2>
                        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', marginBottom: 28 }}>Choose your preferred job creation workflow</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <button onClick={() => { setShowModeModal(false); setShowForm(true); setShowAIFlow(false); }} style={{
                                background: 'rgba(255,255,255,0.03)', border: '2px solid rgba(255,255,255,0.12)',
                                borderRadius: 16, padding: '24px 16px', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)'; e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                            >
                                <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
                                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Manual Job Creation</div>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Fill in the existing questionnaire form with dropdowns and multi-selects</div>
                            </button>
                            <button onClick={() => { setShowModeModal(false); setShowAIFlow(true); setShowForm(false); }} style={{
                                background: 'rgba(99,102,241,0.06)', border: '2px solid rgba(99,102,241,0.3)',
                                borderRadius: 16, padding: '24px 16px', cursor: 'pointer', textAlign: 'center', position: 'relative', transition: 'all 0.2s',
                            }}
                                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.6)'; e.currentTarget.style.background = 'rgba(168,85,247,0.1)'; }}
                                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.background = 'rgba(99,102,241,0.06)'; }}
                            >
                                <div style={{ position: 'absolute', top: 10, right: 10, background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 6, padding: '2px 7px' }}>NEW</div>
                                <div style={{ fontSize: 32, marginBottom: 10 }}>🤖</div>
                                <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 6 }}>AI-Assisted Creation</div>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Chat with AI — it guides you step by step and auto-generates the JD</div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Manual Form (existing, untouched) ────────────────── */}
            {showForm && (
                <form onSubmit={createJob} style={{ ...glassCard, marginBottom: 32, border: '1px solid rgba(99,102,241,0.2)' }}>
                    <h2 style={{ fontSize: 18, fontWeight: 600, color: '#fff', marginBottom: 20 }}>📋 Job Questionnaire & Auto-JD Engine</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 20px' }}>
                        <SelectField label="Job Title *" field="role" options={OPTS.titles} />
                        <SelectField label="Experience Required *" field="experience" options={OPTS.exp} />
                        <SelectField label="Location" field="location" options={OPTS.locations} />
                        <SelectField label="Required Skills" field="required_skills" options={OPTS.skillsReq} isMulti />
                        <SelectField label="Preferred Skills" field="preferred_skills" options={OPTS.skillsPref} isMulti />
                        <SelectField label="Responsibilities" field="responsibilities" options={OPTS.resp} isMulti />
                        <div style={{ gridColumn: 'span 2' }}>
                            <SelectField label="Benefits" field="benefits" options={OPTS.benefits} isMulti />
                        </div>
                    </div>
                    <button type="submit" style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 32px', fontWeight: 600, fontSize: 14, cursor: 'pointer', marginTop: 12, width: '100%' }}>
                        ✨ Generate Job Description & Keywords
                    </button>
                </form>
            )}

            {/* ── AI Chatbot Flow ───────────────────────────────── */}
            {showAIFlow && (
                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
                        <div>
                            <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>AI-Assisted Job Creation</h2>
                            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>Answer a few questions — the AI will generate your JD automatically</p>
                        </div>
                    </div>
                    <AIChatJobCreation onCancel={closeAll} />
                </div>
            )}

            
            <div style={{ ...glassCard, padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }} onClick={() => setOpenMenuId(null)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                    <input 
                        type="text" 
                        placeholder="Search jobs..." 
                        style={{ ...inputStyle, width: '250px' }} 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: 12 }}>
                        <select style={{ ...inputStyle, width: 'auto' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                            <option value="All">All Statuses</option>
                            <option value="active">Published</option>
                            <option value="draft">Draft</option>
                            <option value="closed">Archived</option>
                        </select>
                        <select style={{ ...inputStyle, width: 'auto' }} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                            <option value="Newest">Newest First</option>
                            <option value="Oldest">Oldest First</option>
                        </select>
                    </div>
                </div>

                <div style={{ overflowX: 'auto', marginTop: 12 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Job Title</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Status</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Location</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Candidates</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Avg ATS</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Created Date</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(() => {
                                let filtered = jobs.filter(j => 
                                    (filterStatus === 'All' || j.status === filterStatus) &&
                                    (j.title.toLowerCase().includes(searchTerm.toLowerCase()))
                                );
                                if (sortOrder === 'Newest') filtered.sort((a, b) => b.id - a.id);
                                if (sortOrder === 'Oldest') filtered.sort((a, b) => a.id - b.id);
                                
                                const paginated = filtered.slice((currentPage - 1) * jobsPerPage, currentPage * jobsPerPage);
                                
                                if (filtered.length === 0) return (
                                    <tr>
                                        <td colSpan={7} style={{ padding: 48, textAlign: 'center', color: 'rgba(255,255,255,0.2)' }}>
                                            No jobs match your search criteria.
                                        </td>
                                    </tr>
                                );
                                
                                return paginated.map(job => (
                                    <tr key={job.id} style={{ transition: 'background 0.15s', cursor: 'pointer' }}
                                        onClick={() => window.location.href = `/jobs/${job.id}`}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: '#fff', fontWeight: 500 }}>
                                            {job.title}
                                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>ID: {job.id}</div>
                                        </td>
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                                            {job.status === 'active' ? <span style={{ color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Active</span> :
                                             job.status === 'draft' ? <span style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Draft</span> :
                                             <span style={{ color: '#ef4444', background: 'rgba(239,68,68,0.15)', padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Archived</span>}
                                        </td>
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)' }}>{job.questionnaire?.location || 'N/A'}</td>
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)' }}>—</td>
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)' }}>—</td>
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.6)' }}>
                                            {job.created_at ? new Date(job.created_at).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }} onClick={e => e.stopPropagation()}>
                                            <JobActionsMenu
                                                job={job}
                                                onActionComplete={fetchJobs}
                                                isOpen={openMenuId === job.id}
                                                onToggle={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === job.id ? null : job.id); }}
                                            />
                                        </td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                        Showing Page {currentPage}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1 }}
                        >
                            Previous
                        </button>
                        <button 
                            disabled={jobs.length <= currentPage * jobsPerPage}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: 8, cursor: jobs.length <= currentPage * jobsPerPage ? 'not-allowed' : 'pointer', opacity: jobs.length <= currentPage * jobsPerPage ? 0.5 : 1 }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}


function JobActionsMenu({ job, onActionComplete, isOpen, onToggle }) {
    const handleAction = async (action) => {
        try {
            if (action === 'delete') {
                if (window.confirm(`Are you sure you want to delete ${job.title}?`)) {
                    await api.delete(`/jobs/${job.id}`);
                } else return;
            } else if (action === 'archive') {
                await api.put(`/jobs/${job.id}`, { status: 'closed' });
            } else if (action === 'publish') {
                await api.put(`/jobs/${job.id}`, { status: 'active' });
            } else if (action === 'duplicate') {
                await api.post('/jobs', {
                    title: `${job.title} (Copy)`,
                    questionnaire: job.questionnaire,
                    jd_text: job.jd_text,
                    ats_keywords: job.ats_keywords,
                    status: 'draft'
                });
            }
            onActionComplete();
        } catch (err) {
            console.error('Action failed:', err);
        }
    };

    return (
        <div style={{ position: 'relative' }}>
            <button onClick={onToggle} style={{
                background: isOpen ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: isOpen ? '#fff' : 'rgba(255,255,255,0.4)',
                border: 'none', fontSize: 18, cursor: 'pointer', padding: '6px 10px', borderRadius: 8,
                transition: 'all 0.2s'
            }}>
                ⋮
            </button>
            {isOpen && (
                <div style={{
                    position: 'absolute', right: 0, top: '100%', marginTop: 8, background: '#1e1e2d', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 12, width: 160, overflow: 'hidden', boxShadow: '0 15px 35px rgba(0,0,0,0.6)',
                    zIndex: 1000, padding: 4
                }}>
                    {job.status !== 'active' && <div onClick={() => handleAction('publish')} style={menuItemStyle} onMouseEnter={e => e.currentTarget.style.background = 'rgba(16,185,129,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>✅ Publish</div>}
                    <div onClick={() => handleAction('duplicate')} style={menuItemStyle} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>📋 Duplicate</div>
                    {job.status !== 'closed' && <div onClick={() => handleAction('archive')} style={menuItemStyle} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>📦 Archive</div>}
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '4px' }} />
                    <div onClick={() => handleAction('delete')} style={{ ...menuItemStyle, color: '#f87171' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>🗑 Delete</div>
                </div>
            )}
        </div>
    );
}

const menuItemStyle = {
    padding: '10px 14px', fontSize: 13, color: 'rgba(255,255,255,0.86)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderRadius: 8, transition: 'all 0.15s'
};
