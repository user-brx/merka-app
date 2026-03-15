import { useState, useEffect } from 'react';
import { subscribeRelayStatus, type RelayState } from '../services/nostr/nostr';

export function useRelays() {
  const [relayStates, setRelayStates] = useState<RelayState[]>([]);
  const connectedRelays = relayStates.filter(r => r.status === 'connected').length;

  useEffect(() => {
    const unsub = subscribeRelayStatus(setRelayStates);
    return unsub;
  }, []);

  return {
    relayStates,
    connectedRelays,
  };
}
