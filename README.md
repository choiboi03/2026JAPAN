# 2026 Japan Trip Planner

친구 셋이서 같이 짜는 일본 여행 플래너. 블록 기반으로 하루 일정을 쌓고,
가로 슬라이드로 후보를 비교하고, 여행 중에는 다 같이 사진을 찍어 올리고,
여행이 끝나면 자동으로 스토리 슬라이드쇼가 만들어집니다.

## 기능

- **여행 코드로 합류** — 6자리 코드를 공유하면 같은 여행에 들어옴 (로그인 X)
- **블록 플래너**
  - 세로로 쌓이는 블록 = 하루의 일정
  - 가로로 슬라이드되는 후보 = 한 블록 안의 여러 옵션
  - 블록 타입: `이동` / `장소` / `기타`
  - 후보 중 하나를 ✓로 확정하면 스토리에 반영됨
- **실시간 동기화** — Supabase Realtime으로 3명이 동시에 편집해도 즉시 반영
- **사진 로그** — 갤러리에서 다중 업로드 또는 카메라로 즉시 촬영
- **스토리 슬라이드쇼** — 확정된 일정 + 사진을 인스타 스토리 형식으로 자동 재생
  (Ken Burns 효과, 탭으로 컨트롤)
- **모바일 친화** — 반응형, 단일 컬럼, 큰 터치 타겟

## 기술 스택

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Realtime + Storage) · Embla Carousel · Framer Motion

## 1. Supabase 셋업

1. <https://supabase.com> 에서 새 프로젝트 생성 (무료 티어로 충분)
2. **SQL Editor**를 열고 `supabase/schema.sql` 파일 내용을 그대로 붙여넣고 실행
   - `trips`, `days`, `blocks`, `candidates`, `photos`, `participants` 테이블 생성
   - RLS 정책 (anon 전체 허용 — 코드만 알면 누구나 편집 가능한 모델)
   - Realtime 퍼블리케이션
   - `trip-photos` 스토리지 버킷 생성 + 정책
3. **Project Settings → API** 에서 다음 두 값 복사:
   - `Project URL`
   - `anon public` key

## 2. 환경변수

`.env.example`을 `.env.local`로 복사하고 채워주세요:

```bash
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

## 3. 실행

```bash
npm install
npm run dev
```

<http://localhost:3000> 에서 접속.

## 사용 흐름

1. 한 명이 **새 여행 만들기** → 6자리 코드 발급
2. 다른 두 명에게 코드 공유 → **코드로 참여**
3. 각자 이름 입력 (브라우저 localStorage에 저장됨)
4. 계획 탭에서 블록을 쌓고 후보를 추가/확정
5. 여행 중 사진 탭에서 즉시 촬영 또는 업로드
6. 여행 후 스토리 탭에서 자동 생성된 슬라이드쇼 감상 & 공유

## 폴더 구조

```
src/
  app/
    page.tsx                       # 랜딩 (참여/생성)
    trip/[code]/page.tsx           # 계획 (블록)
    trip/[code]/photos/page.tsx    # 사진 갤러리
    trip/[code]/summary/page.tsx   # 스토리 슬라이드쇼
  components/
    TripHeader.tsx                 # 상단 탭바 (계획/사진/스토리)
    NamePrompt.tsx                 # 첫 진입 시 이름 입력
    DaySection.tsx                 # 하루 = 블록 묶음
    BlockCarousel.tsx              # 한 블록 = 가로 후보 슬라이더
    CandidateCard.tsx              # 개별 후보 카드 (편집/확정/삭제)
  lib/
    supabase.ts, types.ts, code.ts, me.ts, date.ts, useTripData.ts
supabase/
  schema.sql                       # 한 번 실행해서 DB 셋업
```

## 배포

Vercel에 그대로 import → 환경변수 두 개만 넣으면 끝.

## 향후 확장 아이디어

- 진짜 mp4 영상 익스포트 (FFmpeg WebAssembly 또는 서버 사이드 렌더)
- 후보 투표 (3명이 ❤️로 의사 표현)
- 사진을 블록에 직접 연결 (현재는 trip 단위 + 자동 매핑)
- 지도 뷰 (확정된 장소들을 핀으로)
- 비용 합계 자동 계산
