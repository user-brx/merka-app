import { useState, useEffect, useRef, type FormEvent } from 'react';
import { publishNote, publishFollowList } from '../../../services/nostr/nostr';
import { APP_GUID, MERKA_PUBKEY, GITHUB_REPO, GITHUB_PAGES, MERKA_NPUB } from '../../../config/constants';
import type { LangCode, Translations } from '../../../i18n/translations';

interface Keys { sk: Uint8Array; pk: string; nsec: string; npub: string; }

export function useCompose(
  keys: Keys,
  lang: LangCode,
  t: Translations,
  followedPks: Set<string>,
  setFollowedPks: (pks: Set<string>) => void,
  showGlobalToast: (msg: string) => void,
) {
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<'buy' | 'sell'>(() => {
    const saved = localStorage.getItem('merka_post_type');
    return (saved === 'buy' || saved === 'sell') ? saved : 'sell';
  });
  const [postTag, setPostTag] = useState(() => localStorage.getItem('merka_post_tag') || '');
  const [publishing, setPublishing] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const composeTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem('merka_post_type', postType);
    localStorage.setItem('merka_post_tag', postTag);
  }, [postType, postTag]);

  // iOS Safari: focus after animation completes to avoid cursor misposition bug
  useEffect(() => {
    if (!composeOpen) return;
    const timer = setTimeout(() => {
      composeTextareaRef.current?.focus();
    }, 260); // slightly after compose-slide-down (250ms)
    return () => clearTimeout(timer);
  }, [composeOpen]);

  const handlePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPublishing(true);

    // Auto-follow Merka account on first post
    if (!followedPks.has(MERKA_PUBKEY)) {
      const nextFollow = new Set(followedPks);
      nextFollow.add(MERKA_PUBKEY);
      setFollowedPks(nextFollow);
      localStorage.setItem('merka_following', JSON.stringify(Array.from(nextFollow)));
      publishFollowList(keys.sk, Array.from(nextFollow));
    }

    const eventTags = [
      ['t', APP_GUID],
      ['l', lang, 'ISO-639-1'],
    ];
    const normalizedTag = postTag.trim().toLowerCase().slice(0, 10);
    if (normalizedTag) eventTags.push(['t', normalizedTag]);

    const footerText = `\n\n---\n📦 Code: ${GITHUB_REPO}\n🌐 Web: ${GITHUB_PAGES}\n⚡ Nostr: nostr:${MERKA_NPUB}`;
    const payload = JSON.stringify({ type: postType, msg: newPost.trim(), lang }) + footerText;

    const success = await publishNote(keys.sk, payload, eventTags);
    if (success) {
      setNewPost('');
      setComposeOpen(false);
      showGlobalToast(t.publishNote || 'Publicado com sucesso!');
    } else {
      alert(t.publishFail);
    }
    setPublishing(false);
  };

  return {
    newPost, setNewPost,
    postType, setPostType,
    postTag, setPostTag,
    publishing,
    composeOpen, setComposeOpen,
    composeTextareaRef,
    handlePost,
  };
}
