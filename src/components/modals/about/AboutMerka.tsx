import type { Translations } from '../../../i18n/translations';
import { APP_VERSION } from '../../../config/constants';

interface AboutMerkaProps {
    t: Translations;
    onClose: () => void;
    onOpenDonate: () => void;
}
export function AboutMerka({ t, onClose, onOpenDonate }: AboutMerkaProps) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box about-merka-box" onClick={e => e.stopPropagation()}>
                <div className="about-nostr-header">
                    <div>
                        <h2 style={{ fontSize: '1.3rem', marginBottom: '.15rem' }}>🌍 {t.aboutMerka}</h2>
                        <p style={{ fontSize: '.82rem', color: 'var(--primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                            {t.merkaTagline}
                            <span className="app-version-badge">v{APP_VERSION}</span>
                        </p>
                    </div>
                    <button className="btn-icon" onClick={onClose} style={{ padding: '.4rem .7rem', flexShrink: 0 }}>✕</button>
                </div>

                <div className="about-nostr-body">

                    {/* Conceito */}
                    <section className="about-section">
                        <h3 className="about-section-title">{t.merkaConceitoTitle}</h3>
                        <p className="about-section-text" style={{ fontSize: '1rem' }}>
                            <strong>{t.merkaConceitoText}</strong>
                        </p>
                        <p className="about-section-text" style={{ marginTop: '.5rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                            {t.merkaConceitoSub}
                        </p>
                    </section>

                    {/* Manifesto */}
                    <section className="about-section about-section-accent">
                        <h3 className="about-section-title">{t.merkaManifestoTitle}</h3>
                        <div className="manifesto-text">
                            <p>{t.merkaManifestoP1}</p>
                            <p>{t.merkaManifestoP2}</p>
                            <p>{t.merkaManifestoP3}</p>
                            <p className="manifesto-highlight">{t.merkaManifestoP4}</p>
                            <p>{t.merkaManifestoP5}</p>
                            <p>{t.merkaManifestoP6}</p>
                            <p className="manifesto-highlight">{t.merkaManifestoP7}</p>
                        </div>
                    </section>

                    {/* Value Proposition */}
                    <section className="about-section">
                        <h3 className="about-section-title">{t.merkaValueTitle}</h3>
                        <div className="about-value-list">
                            {[
                                t.merkaValue1,
                                t.merkaValue2,
                                t.merkaValue3,
                                t.merkaValue4,
                                t.merkaValue5,
                                t.merkaValue6,
                            ].map(item => (
                                <div key={item} className="about-value-item">{item}</div>
                            ))}
                        </div>
                    </section>

                    {/* Identity */}
                    <section className="about-section about-section-merka">
                        <h3 className="about-section-title">{t.merkaIdentityTitle}</h3>
                        <div className="brand-pills">
                            {t.merkaIdentityPills.map(v => (
                                <span key={v} className="brand-pill">{v}</span>
                            ))}
                        </div>
                    </section>

                    {/* Infrastructure */}
                    <section className="about-section" style={{ background: 'rgba(139,92,246,.07)', borderColor: 'rgba(139,92,246,.2)' }}>
                        <h3 className="about-section-title" style={{ color: 'var(--purple)' }}>{t.merkaInfraTitle}</h3>
                        <p className="about-section-text">
                            {t.merkaInfraText}
                            <br /><br />
                            <em>{t.merkaNetIsProduct}</em>
                        </p>
                    </section>

                    {/* Open Source */}
                    <section className="about-section" style={{ background: 'rgba(34,197,94,.05)', borderColor: 'rgba(34,197,94,.15)' }}>
                        <h3 className="about-section-title" style={{ color: 'var(--success, #22c55e)' }}>{t.merkaOpenSourceTitle}</h3>
                        <p className="about-section-text">
                            {t.merkaOpenSourceText}
                        </p>
                        <div style={{ marginTop: '0.8rem', padding: '0.8rem', background: 'rgba(34,197,94,.1)', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            <span style={{ fontWeight: 600 }}>{t.merkaSourceCode}</span>
                            <a
                                href="https://github.com/user-brx/merka-app"
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem', textDecoration: 'none' }}
                            >
                                🐙 github.com/user-brx/merka-app
                            </a>
                        </div>
                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
                            <button
                                onClick={onOpenDonate}
                                className="btn-small"
                                style={{ background: 'var(--accent)', color: 'white', padding: '0.6rem 1.2rem', fontWeight: 600, border: 'none', borderRadius: '8px' }}
                            >
                                {t.donate}
                            </button>
                        </div>
                    </section>

                </div>

                <button onClick={onClose} style={{ width: '100%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', marginTop: '.5rem' }}>
                    {t.close}
                </button>
            </div>
        </div>
    );
}
