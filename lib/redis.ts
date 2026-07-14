import { Redis } from "@upstash/redis";

let _redis: Redis | null = null;

/** 요청 시점에만 Upstash REST 클라이언트를 생성한다 (빌드 타임 크래시 방지). */
function getRedis(): Redis {
  if (_redis) return _redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("[REDIS][ERROR] UPSTASH_REDIS_REST_URL / _TOKEN 미설정");
  }
  if (!url.startsWith("https://")) {
    throw new Error(
      `[REDIS][ERROR] REST URL은 https:// 로 시작해야 합니다. ` +
      `rediss:// 값을 넣으신 것 같습니다. Upstash 콘솔의 'REST API' 탭 값을 사용하세요.`
    );
  }

  _redis = new Redis({ url, token });
  return _redis;
}

/** 봇의 Cache-Aside 키와 반드시 동일한 포맷을 유지해야 한다. */
export const settingsKey = (guildId: string) => `guild:${guildId}:settings`;

/**
 * 길드 설정 캐시를 무효화한다.
 * 지연 이중 삭제(Delayed Double Delete)로 "읽는 중 쓰기" 레이스 컨디션을 방어한다.
 * 캐시 삭제 실패는 치명적이지 않다 (최대 5분 TTL 후 자연 만료).
 */
export async function invalidateGuildSettings(guildId: string): Promise<void> {
  const key = settingsKey(guildId);

  try {
    const redis = getRedis();

    await redis.del(key);
    console.log(`[CACHE] 무효화 1차 완료: ${key}`);

    // 봇이 캐시 미스 -> DB 조회 중이던 찰나에 옛 값을 SETEX 해버리는 경우 대비
    await new Promise((r) => setTimeout(r, 700));
    await redis.del(key);
    console.log(`[CACHE] 무효화 2차 완료: ${key}`);
  } catch (err) {
    console.error(`[CACHE][ERROR] 무효화 실패 (${key}):`, err);
  }
}