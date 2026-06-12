// 1. 환경 변수(.env.local) 파일 읽어오기
require('dotenv').config({ path: '.env.local' });
const { Client, GatewayIntentBits } = require('discord.js');
const { createClient } = require('@supabase/supabase-js');

// 2. 수파베이스 연결 기기 조립
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 3. 디스코드 봇이 채팅을 읽을 수 있도록 권한 장전
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 봇이 켜지면 터미널에 알림 뜨는 코드
client.once('ready', () => {
  console.log(`🟢 디스코드 감시 봇이 성공적으로 켜졌습니다: ${client.user.tag}`);
});

// 4. 진짜 실시간 채팅 감시 구역
client.on('messageCreate', async (message) => {
  // 봇이 스스로 쓴 채팅이거나, 디스코드 DM(개인메시지)은 무시합니다.
  if (message.author.bot || !message.guild) return;

  try {
    // 수파베이스 'guild_settings' 테이블에서 금지어 데이터 슥 꺼내오기
    const { data, error } = await supabase
      .from('guild_settings')
      .select('*');

    if (error) {
      console.error('수파베이스에서 데이터를 가져오는데 실패했습니다:', error);
      return;
    }

    // 데이터가 잘 들어왔는지 확인하고 금지어 추출
    if (data && data.length > 0) {
      // 수파베이스 테이블 구조에 따라 필드명이 다를 수 있으니 안전하게 매핑합니다.
      // 팁: 대시보드 화면에 적힌 규칙에 따라 'banned_words' 컬럼을 검사합니다.
      const settings = data[0];
      const bannedWords = settings.banned_words || [];

      // 유저가 보낸 채팅에 대시보드에서 등록한 금지어가 포함되어 있는지 검사
      const hasBannedWord = bannedWords.some(word => message.content.includes(word));

      if (hasBannedWord) {
        // 금지어가 발견되면 즉시 메시지 삭제!
        await message.delete();
        
        // 채팅방에 경고 날리기 (3초 뒤에 경고 메시지도 자동으로 지워지게 설정)
        const warning = await message.channel.send(`⚠️ ${message.author}님, 그 단어는 대시보드에서 금지된 단어입니다!`);
        setTimeout(() => warning.delete().catch(() => {}), 3000);
      }
    }
  } catch (err) {
    console.error('채팅 감시 중 오류 발생:', err);
  }
});

// 5. 봇 구동 시동 걸기
client.login(process.env.DISCORD_TOKEN);