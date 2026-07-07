import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: '📊' },
    { name: 'Jobs', path: '/jobs', icon: '💼' },
    { name: 'Reports', path: '/reports', icon: '📋' },
    { name: 'Exports', path: '/exports', icon: '⬇️' },
    { name: 'Settings', path: '/settings', icon: '⚙️' },
];

export default function Layout({ children }) {
    const location = useLocation();

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0e', color: '#fff', fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>
            {/* Ambient Glows */}
            <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: 500, height: 500, background: 'rgba(99,102,241,0.12)', borderRadius: '50%', filter: 'blur(120px)', pointerEvents: 'none', zIndex: 0 }} />
            <div style={{ position: 'fixed', bottom: '-10%', right: '-5%', width: 600, height: 600, background: 'rgba(168,85,247,0.07)', borderRadius: '50%', filter: 'blur(120px)', pointerEvents: 'none', zIndex: 0 }} />

            {/* Sidebar */}
            <aside style={{
                width: 260, minHeight: '100vh',
                background: 'rgba(255,255,255,0.015)',
                borderRight: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', flexDirection: 'column',
                position: 'sticky', top: 0, zIndex: 10,
                backdropFilter: 'blur(24px)',
            }}>
                {/* Logo */}
                <div style={{ padding: '32px 24px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                        width: 42, height: 42, borderRadius: 12,
                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, boxShadow: '0 0 24px rgba(99,102,241,0.35)',
                    }}>⚡</div>
                    <span style={{
                        fontWeight: 700, fontSize: 18, letterSpacing: -0.3,
                        background: 'linear-gradient(90deg, #fff, rgba(255,255,255,0.55))',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>ATS Platform</span>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 20px 12px' }} />

                {/* Nav */}
                <nav style={{ flex: 1, padding: '0 12px' }}>
                    {navItems.map(item => {
                        const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
                        return (
                            <Link key={item.name} to={item.path} style={{ textDecoration: 'none' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '11px 16px', borderRadius: 12, marginBottom: 2,
                                    background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                                    border: isActive ? '1px solid rgba(99,102,241,0.2)' : '1px solid transparent',
                                    color: isActive ? '#a5b4fc' : 'rgba(255,255,255,0.4)',
                                    fontWeight: 500, fontSize: 14,
                                    transition: 'all 0.2s', cursor: 'pointer',
                                }}
                                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; } }}
                                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; } }}
                                >
                                    <span style={{ fontSize: 16, width: 22, textAlign: 'center' }}>{item.icon}</span>
                                    {item.name}
                                </div>
                            </Link>
                        );
                    })}
                </nav>

                {/* Version Badge */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: 500 }}>AI ATS Platform v1.0</div>
                </div>
            </aside>

            {/* Main Content */}
            <main style={{ flex: 1, padding: '40px 48px', overflowY: 'auto', position: 'relative', zIndex: 1, minHeight: '100vh' }}>
                {children}
            </main>
        </div>
    );
}
