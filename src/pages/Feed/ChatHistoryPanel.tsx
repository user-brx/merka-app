import type { Translations } from '../../i18n/translations';
import { useDragToClose } from '../../hooks/useDragToClose';
import { XIcon, LockIcon } from '../../components/ui/icons';

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
  const dragProps = useDragToClose(onClose);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} {...dragProps} style={{ maxWidth: 'min(380px, 100%)', maxHeight: '86vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
            <div className="modal-header-icon icon-lock"><LockIcon size={18} /></div>
            <h3 style={{ margin: 0 }}>{t.chatHistoryTitle}</h3>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ padding: '.4rem .7rem' }}><XIcon /></button>
        </div>
        {contacts.length === 0 ? (
          <p style={{ textAlign: 'center', opacity: .5, padding: '1.5rem 0' }}>{t.noChatHistory}</p>
        ) : (
          <div className="modal-list-scroll" style={{ display: 'flex', flexDirection: 'column', gap: '.6rem', flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
            {[...contacts].reverse().map(c => {
              const isUnread = unreadPks.has(c.pubkey);
              return (
                <div key={c.pubkey} style={{ display: 'flex' }}>
                  <button
                    onClick={() => { onOpenChat(c); onClose(); }}
                    style={{
                      flex: 1,
                      background: isUnread ? 'rgba(139,92,246,.13)' : 'rgba(139,92,246,.06)',
                      border: '1px solid ' + (isUnread ? 'rgba(139,92,246,.35)' : 'rgba(139,92,246,.15)'),
                      borderRadius: '10px', padding: '.5rem .8rem .5rem 1rem', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: '.6rem', color: 'var(--text-main)', cursor: 'pointer',
                      position: 'relative', overflow: 'hidden', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: 2,
                      background: isUnread ? 'var(--purple)' : 'rgba(139,92,246,.4)',
                      borderRadius: '10px 0 0 10px',
                    }} />
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
