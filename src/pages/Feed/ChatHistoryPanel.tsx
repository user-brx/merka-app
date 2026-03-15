import type { Translations } from '../../i18n/translations';

export interface ChatContact { pubkey: string; npub: string; label: string; }

export function ChatHistoryPanel({
  t, contacts, unreadPks, onOpenChat, onClose
}: {
  t: Translations;
  contacts: ChatContact[];
  unreadPks: Set<string>;
  onOpenChat: (c: ChatContact) => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
          <h3>🔐 {t.chatHistoryTitle}</h3>
          <button className="btn-icon" onClick={onClose} style={{ padding: '.4rem .7rem' }}>✕</button>
        </div>
        {contacts.length === 0 ? (
          <p style={{ textAlign: 'center', opacity: .5, padding: '1.5rem 0' }}>{t.noChatHistory}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
            {contacts.map(c => {
              const isUnread = unreadPks.has(c.pubkey);
              return (
                <div key={c.pubkey} style={{ display: 'flex' }}>
                  <button
                    onClick={() => { onOpenChat(c); onClose(); }}
                    style={{
                      flex: 1, background: isUnread ? 'rgba(139,92,246,.15)' : 'rgba(139,92,246,.08)',
                      border: isUnread ? '1px solid var(--purple)' : '1px solid rgba(139,92,246,.2)',
                      borderRadius: '10px', padding: '.5rem .8rem', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: '.6rem', color: 'var(--text-main)', cursor: 'pointer',
                      position: 'relative', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,var(--purple),var(--primary))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '.9rem', fontWeight: 700
                    }}>{c.label[0].toUpperCase()}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.label} {isUnread && <span style={{ color: 'var(--purple)', fontSize: '.75rem', marginLeft: '4px' }}>●</span>}
                      </div>
                      <div style={{ fontSize: '.7rem', color: 'var(--text-muted)', fontFamily: 'monospace', opacity: 0.7 }}>{c.npub.slice(0, 18)}...</div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
