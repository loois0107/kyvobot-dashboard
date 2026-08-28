'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { PARTY_GAME_PRESET_MAX_COUNT, PARTY_GAME_PRESET_NAME_MAX_LENGTH, type PartyGamePreset } from '@/lib/partyPresets';
import { useT } from '@/lib/i18n/LanguageContext';
import HelpText from '@/components/HelpText';
import SettingsPageContainer from '@/components/SettingsPageContainer';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

const COLOR_PRESETS = ['#5865F2', '#23A55A', '#FEE75C', '#EB459E', '#ED4245', '#9B59B6', '#00D2D3', '#54A0FF'];

type LoadStatus = 'loading' | 'loaded' | 'error';

const EMPTY_FORM: PartyGamePreset = { game_name: '', card_color: '#5865F2', card_description: '', card_thumbnail_url: '', positions: null };

export default function PartyPresetsPage() {
  const params = useParams();
  const { showToast } = useToast();
  const t = useT();
  const guildId = (params?.guildId as string) || '';

  const [loadStatus, setLoadStatus] = useState<LoadStatus>('loading');
  const [loadErrorMsg, setLoadErrorMsg] = useState('');
  const [presets, setPresets] = useState<PartyGamePreset[]>([]);
  const [form, setForm] = useState<PartyGamePreset>(EMPTY_FORM);
  // 🛡️ [프리셋 우선 포지션] positions는 form(PartyGamePreset)에도 있지만, 입력 UI는 쉼표로 구분된
  // 텍스트라 배열<->문자열 변환이 필요하다 - 이 두 상태가 실제 편집 중인 값의 단일 소스이고,
  // form.positions는 저장 시점에만 이걸로부터 다시 계산해서 채운다.
  const [usesPositions, setUsesPositions] = useState(false);
  const [positionsText, setPositionsText] = useState('');
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
      return data.message || t('common.requestFailed', { status: res.status });
    } catch {
      return t('common.requestFailed', { status: res.status });
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
      setLoadErrorMsg(t('partyPresetsPage.loadNetworkError'));
      setLoadStatus('error');
    }
  };

  const startEdit = (preset: PartyGamePreset) => {
    setForm(preset);
    setUsesPositions(Boolean(preset.positions && preset.positions.length > 0));
    setPositionsText((preset.positions || []).join(', '));
    setEditingOriginalName(preset.game_name);
  };

  const cancelEdit = () => {
    setForm(EMPTY_FORM);
    setUsesPositions(false);
    setPositionsText('');
    setEditingOriginalName(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const positions = usesPositions
        ? positionsText.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
        : null;
      const res = await fetch(`/api/party-presets/${guildId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, positions }),
      });
      if (res.ok) {
        showToast(t('partyPresetsPage.presetSaved', { name: form.game_name }), 'success');
        cancelEdit();
        await loadData();
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('partyPresetsPage.saveNetworkError'), 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (gameName: string) => {
    if (!window.confirm(t('partyPresetsPage.confirmDeletePreset', { name: gameName }))) return;
    setDeletingName(gameName);
    try {
      const res = await fetch(`/api/party-presets/${guildId}?game_name=${encodeURIComponent(gameName)}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(t('partyPresetsPage.presetDeleted', { name: gameName }), 'success');
        if (editingOriginalName === gameName) cancelEdit();
        await loadData();
      } else {
        showToast(await extractErrorMessage(res), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(t('partyPresetsPage.deleteNetworkError'), 'error');
    } finally {
      setDeletingName(null);
    }
  };

  if (loadStatus === 'loading') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center text-text-secondary text-base">
        {t('partyPresetsPage.loadingPresets')}
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <p className="text-danger font-bold">{t('partyPresetsPage.loadFailed')}</p>
        <p className="text-base text-text-secondary">{loadErrorMsg}</p>
        <Button type="button" variant="primary" onClick={loadData}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const isEditing = editingOriginalName !== null;
  const atCap = !isEditing && presets.length >= PARTY_GAME_PRESET_MAX_COUNT;

  return (
    <SettingsPageContainer className="pb-16">
      <header className="border-b border-border-default pb-6">
        <h1 className="text-xl md:text-2xl font-black tracking-wider text-brand">{t('partyPresetsPage.title')}</h1>
        <HelpText className="mt-1">
          {t('partyPresetsPage.subtitleUsage', { used: presets.length, max: PARTY_GAME_PRESET_MAX_COUNT })}
        </HelpText>
        <HelpText className="mt-1 normal-case">
          {t('partyPresetsPage.subtitleExplainer')}
        </HelpText>
      </header>

      <Card className="space-y-4">
        <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
          {isEditing ? t('partyPresetsPage.editingTitle', { name: editingOriginalName || '' }) : t('partyPresetsPage.addTitle')}
        </h3>

        {atCap && (
          <p className="text-sm text-danger">
            {t('partyPresetsPage.atCapWarning', { max: PARTY_GAME_PRESET_MAX_COUNT })}
          </p>
        )}

        <div className="rounded-xl p-4 border-l-4 bg-bg-elevated flex items-start justify-between gap-4" style={{ borderColor: form.card_color }}>
          <div className="min-w-0">
            {form.game_name && <p className="text-[10px] font-bold text-text-secondary mb-1">🎮 {form.game_name}</p>}
            <p className="text-base font-bold text-text-primary">{t('partyPresetsPage.previewLine')}</p>
            {form.card_description && <p className="text-sm text-text-secondary mt-2 whitespace-pre-wrap">{form.card_description}</p>}
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
          <label className="text-sm font-bold text-text-secondary">{t('partyPresetsPage.gameNameLabel')}</label>
          <input
            type="text"
            value={form.game_name}
            onChange={(e) => setForm({ ...form, game_name: e.target.value })}
            maxLength={PARTY_GAME_PRESET_NAME_MAX_LENGTH}
            disabled={isEditing}
            placeholder={t('partyPresetsPage.gameNamePlaceholder')}
            className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand disabled:opacity-50"
          />
          {isEditing ? (
            <HelpText>{t('partyPresetsPage.renameHelp')}</HelpText>
          ) : (
            <HelpText>{t('partyPresetsPage.duplicateWarning')}</HelpText>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-text-secondary">{t('partyPresetsPage.colorLabel')}</label>
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
              className="w-24 bg-bg-elevated border border-border-default rounded-lg px-2 text-[10px] text-text-primary font-mono focus:outline-none focus:border-brand"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-text-secondary">{t('partyPresetsPage.descLabel')}</label>
          <textarea
            value={form.card_description}
            onChange={(e) => setForm({ ...form, card_description: e.target.value })}
            rows={2}
            className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-bold text-text-secondary">{t('partyPresetsPage.thumbnailLabel')}</label>
          <input
            type="text"
            value={form.card_thumbnail_url}
            onChange={(e) => setForm({ ...form, card_thumbnail_url: e.target.value })}
            placeholder="https://..."
            className="w-full bg-bg-elevated border border-border-default rounded-lg p-2.5 text-sm text-text-primary font-mono focus:outline-none focus:border-brand"
          />
          <HelpText>{t('partyPresetsPage.thumbnailHelp')}</HelpText>
        </div>

        <div className="space-y-2 p-3.5 bg-bg-elevated rounded-xl border border-border-default">
          <div className="flex items-center justify-between">
            <label className="text-sm font-black text-text-primary cursor-pointer" htmlFor="uses-positions-toggle">
              {t('partyPresetsPage.positionsToggleLabel')}
            </label>
            <input
              id="uses-positions-toggle"
              type="checkbox"
              checked={usesPositions}
              onChange={(e) => setUsesPositions(e.target.checked)}
              className="w-4 h-4 accent-brand cursor-pointer"
            />
          </div>
          {usesPositions && (
            <div className="space-y-1 pt-1 border-t border-border-default/40">
              <label className="text-sm font-bold text-text-secondary uppercase block">
                {t('partyPresetsPage.positionsInputLabel')}
              </label>
              <input
                type="text"
                value={positionsText}
                onChange={(e) => setPositionsText(e.target.value)}
                placeholder={t('partyPresetsPage.positionsInputPlaceholder')}
                className="w-full bg-bg-surface border border-border-default rounded-lg p-2.5 text-sm text-text-primary focus:outline-none focus:border-brand"
              />
              <HelpText className="normal-case">{t('partyPresetsPage.positionsInputHelp')}</HelpText>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="primary" onClick={handleSave} disabled={isSaving || !form.game_name.trim() || atCap}>
            {isSaving ? t('common.saving') : isEditing ? t('partyPresetsPage.saveChanges') : t('partyPresetsPage.addPreset')}
          </Button>
          {isEditing && (
            <Button type="button" variant="ghost" onClick={cancelEdit}>
              {t('common.cancel')}
            </Button>
          )}
        </div>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-black tracking-widest text-text-secondary uppercase border-b border-border-default pb-2">
          {t('partyPresetsPage.savedTitle')}
        </h3>
        {presets.length === 0 ? (
          <p className="text-base text-text-secondary py-4">{t('partyPresetsPage.noPresetsYet')}</p>
        ) : (
          <div className="space-y-2">
            {presets.map((p) => (
              <Card elevated key={p.game_name} className="flex items-center justify-between gap-3 !px-3 !py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.card_color }} />
                  <span className="text-sm font-bold text-text-primary truncate">{p.game_name}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button type="button" variant="secondary" onClick={() => startEdit(p)} className="!px-3 !py-1.5 text-[10px]">
                    {t('common.edit')}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => handleDelete(p.game_name)}
                    disabled={deletingName === p.game_name}
                    className="!px-3 !py-1.5 text-[10px]"
                  >
                    {deletingName === p.game_name ? t('common.deleting') : t('common.delete')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </SettingsPageContainer>
  );
}
