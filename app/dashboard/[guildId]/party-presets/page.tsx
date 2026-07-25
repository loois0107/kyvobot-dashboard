'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { PARTY_GAME_PRESET_MAX_COUNT, PARTY_GAME_PRESET_NAME_MAX_LENGTH, type PartyGamePreset } from '@/lib/partyPresets';

const COLOR_PRESETS = ['#5865F2', '#23A55A', '#FEE75C', '#EB459E', '#ED4245', '#9B59B6', '#00D2D3', '#54A0FF'];

type LoadStatus = 'loading' | 'loaded' | 'error';

const EMPTY_FORM: PartyGamePreset = { game_name: '', card_color: '#5865F2', card_description: '', card_thumbnail_url: '' };

export default function PartyPresetsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const guildId = (params?.guildId as string) || '';

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');
  const [presets, setPresets] = useState<PartyGamePreset[]>([]);
  const [form, setForm] = useState<PartyGamePreset>(EMPTY_FORM);
  const [editingOriginalName, setEditingOriginalName] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingName, setDeletingName] = useState<string | null>(null);

  useEffect(() => {
    if (!guildId) return;
    loadData();
  }, [guildId]);

  const extractErrorMessage = async (res: Response): Promise<string> => {
    try {
      const data = await res.json();
      return data.message || `Request failed (${res.status})`;
    } catch {
      return `Request failed (${res.status})`;
    }
  };

  const loadData = async () => {
    setLoadStatus('loading');
    setLoadErrorMsg('');
    try {
      const res = await fetch(`/api/party-presets/${guildId}`);
      if (!res.ok) {
        setLoadErrorMsg(await extractErrorMessage(res));
        setLoadStatus('error');
        return;
      }
      const data = await res.json();
      setPresets(data.presets || []);
      setLoadStatus('loaded');
    } catch (err) {
      console.error(err);
      setLoadErrorMsg('Network error while loading game presets.');
      setLoadStatus('error');
    }
  };

  const startEdit = (preset: PartyGamePreset) => {
    setForm(preset);
    setEditingOriginalName(preset.game_name);
  };

  const cancelEdit = () => {
    setForm(EMPTY_FORM);
    setEditingOriginalName(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/party-presets/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showToast(`Preset "${form.game_name}" saved!`, 'success');
        cancelEdit();
        await loadData();
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while saving.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (gameName: string) => {
    setDeletingName(gameName);
    try {
      const res = await fetch(`/api/party-presets/${guildId}?game_name=${encodeURIComponent(gameName)}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`Preset "${gameName}" deleted.`, 'success');
        if (editingOriginalName === gameName) cancelEdit();
        await loadData();
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Network error while deleting.', 'error');
    } finally {
      setDeletingName(null);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-[#949ba4] text-sm">
        Loading game presets...
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-red-400 font-bold">⚠️ Failed to load game presets</p>
        <p className="text-sm text-[#949ba4]">{loadErrorMsg}</p>
        <button
          type="button"
          onClick={loadData}
          className="bg-[#5865F2] hover:bg-[#4752C4] text-white text-xs font-black px-6 py-3 rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  const isEditing = editingOriginalName !== null;
  const atCap = !isEditing && presets.length >= PARTY_GAME_PRESET_MAX_COUNT;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <header className="border-b border-[#2b2d31] pb-6">
        <h1 className="text-xl md:text-2xl font-black tracking-wider text-[#FFD700]">🎮 Game Presets</h1>
        <p className="text-[10px] text-[#57576F] mt-1 tracking-widest uppercase">
          Saved looks members can pick from with /party_recruit game:... - {presets.length}/{PARTY_GAME_PRESET_MAX_COUNT} used
        </p>
      </header>

      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
        <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          {isEditing ? `Editing "${editingOriginalName}"` : 'Add a Preset'}
        </h3>

        {atCap && (
          <p className="text-xs text-red-400">
            ⚠️ This server has reached the {PARTY_GAME_PRESET_MAX_COUNT}-preset limit. Delete one before adding another.
          </p>
        )}

        <div className="rounded-xl p-4 border-l-4 bg-[#111214] flex items-start justify-between gap-4" style={{ borderColor: form.card_color }}>
          <div className="min-w-0">
            {form.game_name && <p className="text-[10px] font-bold text-[#949ba4] mb-1">🎮 {form.game_name}</p>}
            <p className="text-sm font-bold text-white">Looking for Duo - Solo Queue</p>
            {form.card_description && <p className="text-xs text-[#b5bac1] mt-2 whitespace-pre-wrap">{form.card_description}</p>}
          </div>
          {form.card_thumbnail_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.card_thumbnail_url}
              alt=""
              className="w-14 h-14 rounded-lg object-cover shrink-0"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#b5bac1]">Game Name (this is what shows up in /party_recruit's autocomplete)</label>
          <input
            type="text"
            value={form.game_name}
            onChange={(e) => setForm({ ...form, game_name: e.target.value })}
            maxLength={PARTY_GAME_PRESET_NAME_MAX_LENGTH}
            disabled={isEditing}
            placeholder="e.g. League of Legends"
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#5865F2] disabled:opacity-50"
          />
          {isEditing && <p className="text-[10px] text-[#57576F]">Rename by deleting this preset and creating a new one.</p>}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#b5bac1]">Card Accent Color</label>
          <div className="flex flex-wrap gap-1.5">
            {COLOR_PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setForm({ ...form, card_color: p })}
                className={`w-6 h-6 rounded-full border ${form.card_color.toLowerCase() === p.toLowerCase() ? 'border-white scale-110' : 'border-transparent opacity-60'}`}
                style={{ backgroundColor: p }}
              />
            ))}
            <input
              type="text"
              value={form.card_color}
              onChange={(e) => setForm({ ...form, card_color: e.target.value })}
              className="w-24 bg-[#111214] border border-[#232428] rounded-lg px-2 text-[10px] text-white font-mono focus:outline-none focus:border-[#5865F2]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#b5bac1]">Recruitment Card Message (optional)</label>
          <textarea
            value={form.card_description}
            onChange={(e) => setForm({ ...form, card_description: e.target.value })}
            rows={2}
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#5865F2]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#b5bac1]">Card Thumbnail Image URL (optional)</label>
          <input
            type="text"
            value={form.card_thumbnail_url}
            onChange={(e) => setForm({ ...form, card_thumbnail_url: e.target.value })}
            placeholder="https://..."
            className="w-full bg-[#111214] border border-[#232428] rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#5865F2]"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !form.game_name.trim() || atCap}
            className="bg-[#5865F2] hover:bg-[#4752C4] disabled:opacity-50 text-white text-xs font-black px-6 py-3 rounded-xl"
          >
            {isSaving ? 'SAVING...' : isEditing ? 'SAVE CHANGES' : 'ADD PRESET'}
          </button>
          {isEditing && (
            <button type="button" onClick={cancelEdit} className="text-xs font-bold text-gray-400 hover:text-white transition px-4">
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#1e1f22] border border-[#2b2d31] rounded-2xl p-4 sm:p-6 space-y-3 shadow-xl">
        <h3 className="text-xs font-black tracking-widest text-[#949ba4] uppercase border-b border-[#2b2d31] pb-2">
          Saved Presets
        </h3>
        {presets.length === 0 ? (
          <p className="text-sm text-[#949ba4] py-4">📭 No presets yet - add one above.</p>
        ) : (
          <div className="space-y-2">
            {presets.map((p) => (
              <div key={p.game_name} className="flex items-center justify-between gap-3 bg-[#111214] rounded-lg px-3 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.card_color }} />
                  <span className="text-xs font-bold text-white truncate">{p.game_name}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button type="button" onClick={() => startEdit(p)} className="text-[10px] font-bold text-[#5865F2] hover:text-white px-2 py-1">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.game_name)}
                    disabled={deletingName === p.game_name}
                    className="text-[10px] font-bold text-red-400 hover:text-red-300 disabled:opacity-50 px-2 py-1"
                  >
                    {deletingName === p.game_name ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
