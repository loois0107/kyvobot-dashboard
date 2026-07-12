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
      const settings = data[0];
      const bannedWords = settings.banned_words || [];

      // 유저가 보낸 채팅에 대시보드에서 등록한 금지어가 포함되어 있는지 검사
      const hasBannedWord = bannedWords.some(word => message.content.includes(word));

      if (hasBannedWord) {
        // 금지어가 발견되면 즉시 일반 채널에서 메시지 삭제!
        await message.delete();
        
        // 🔒 [은밀 기동 전환] 일반 채팅방 대신 유저 개인 귓속말(DM)로 경고 전송
        try {
          await message.author.send(
            `⚠️ **[Kyvo AutoMod 보안 경고]**\n\n` +
            `${message.author}님, 방금 서버에서 작성하신 메시지에 대시보드 지정 금지어가 포함되어 있어 자동으로 삭제 처리되었습니다.\n` +
            `쾌적한 서버 환경을 위해 단어 사용에 주의해 주세요!`
          );
        } catch (dmError) {
          // 💡 예외 방어선: 유저가 봇의 DM을 차단해 둔 경우
          // 봇이 뻗는 걸 막기 위해, 어쩔 수 없이 일반 채널에 3초만 잠깐 경고를 띄웠다 흔적도 없이 지웁니다.
          const warning = await message.channel.send(`⚠️ ${message.author}님, DM이 차단되어 있어 채널로 경고합니다. 금지 단어 사용에 주의해 주세요!`);
          setTimeout(() => warning.delete().catch(() => {}), 3000);
        }
      }
    }
  } catch (err) {
    console.error('채팅 감시 중 오류 발생:', err);
  }
});

// 5. 봇 구동 시동 걸기
client.login(process.env.DISCORD_TOKEN);
// Render 무료 서버 유지를 위한 야매 포트 열기
const http = require('http');
http.createServer((req, res) => res.end('Bot is running')).listen(process.env.PORT || 3000);