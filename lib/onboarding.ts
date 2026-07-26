// main.py의 bot.get_guild_settings가 (드문 경로에서) 채워 넣는 하드코딩 기본값과 반드시 일치해야
// 한다 - "키가 있다"만으로는 그 드문 경로가 만든 순수 기본값과 관리자가 실제로 저장한 값을 구분
// 못 하므로, 값 자체가 기본값과 다른지까지 확인한다.
export function isAutomodConfigured(antinuke: any): boolean {
  if (!antinuke || typeof antinuke !== 'object') return false;
  const isDefaultShape =
    antinuke.enabled === false &&
    antinuke.anti_spam_speed === 3 &&
    Array.isArray(antinuke.whitelisted_roles) && antinuke.whitelisted_roles.length === 0 &&
    (antinuke.log_channel_id === null || antinuke.log_channel_id === undefined);
  return !isDefaultShape;
}

// welcome_settings는 그 드문 기본값 경로에 아예 안 들어있는 키라서, 키 존재만으로 안전하게
// "Welcome 페이지를 한 번이라도 저장했다"를 판단할 수 있다.
export function isWelcomeConfigured(settings: Record<string, any> | null | undefined): boolean {
  return !!settings && Object.prototype.hasOwnProperty.call(settings, 'welcome_settings');
}

export interface OnboardingItems {
  automod: boolean;
  welcome: boolean;
  presets: boolean;
}

/**
 * 배너를 보여줄지, 어떤 항목이 끝났는지를 결정하는 순수 로직. settings/presetsCount를 어디서
 * 가져왔는지(Supabase, 테스트용 목 데이터)와 무관하게 동작해서 유닛테스트가 가능하다.
 */
export function computeOnboardingState(
  settings: Record<string, any> | null,
  presetsCount: number
): { showBanner: boolean; items: OnboardingItems } {
  const dismissed = settings?.onboarding_dismissed === true;
  const started = settings?.onboarding_started === true;

  if (dismissed || !started) {
    return { showBanner: false, items: { automod: false, welcome: false, presets: false } };
  }

  const items: OnboardingItems = {
    automod: isAutomodConfigured(settings?.antinuke_settings),
    welcome: isWelcomeConfigured(settings),
    presets: presetsCount > 0,
  };
  const allDone = items.automod && items.welcome && items.presets;

  return { showBanner: !allDone, items };
}
