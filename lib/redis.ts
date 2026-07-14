import { Redis } from "@upstash/redis";

/** Upstash REST 클라이언트 (서버리스 환경 전용, 커넥션 풀 불필요) */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/** 봇의 Cache-Aside 키와 반드시 동일한 포맷을 유지해야 한다. */
export const settingsKey = (guildId: string) => `guild:${guildId}:settings`;

/**
 * 길드 설정 캐시를 무효화한다.
 * 지연 이중 삭제(Delayed Double Delete)로 "읽는 중 쓰기" 레이스 컨디션을 방어한다.
 */
export async function invalidateGuildSettings(guildId: string): Promise<void> {
  const key = settingsKey(guildId);

  try {
    await redis.del(key);
    console.log(`[CACHE] 무효화 1차 완료: ${key}`);

    // 봇이 캐시 미스 → DB 조회 중이던 찰나에 옛 값을 SETEX 해버리는 경우 대비
    await new Promise((r) => setTimeout(r, 700));
    await redis.del(key);
    console.log(`[CACHE] 무효화 2차 완료: ${key}`);
  } catch (err) {
    // 캐시 삭제 실패는 치명적이지 않다. 최대 5분 TTL 후 자연 만료된다.
    console.error(`[CACHE][ERROR] 무효화 실패 (${key}):`, err);
  }
}