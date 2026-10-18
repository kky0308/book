(() => {
  'use strict';

  // ---------- 데이터 ----------
  const BESTSELLERS = [
    { title: '모순', author: '양귀자', desc: '쌍둥이 자매의 엇갈린 삶을 통해 묻는 인생의 모순.', color: '#f4b8a0' },
    { title: '불편한 편의점', author: '김호연', desc: '서울역 노숙인이 편의점 야간 알바를 하며 벌어지는 따뜻한 이야기.', color: '#b7cdb4' },
    { title: '어린 왕자', author: '생텍쥐페리', desc: '눈에 보이지 않는 소중한 것에 대한 오래된 질문.', color: '#cdc3e8' },
    { title: '데미안', author: '헤르만 헤세', desc: '알을 깨고 나오는 자의 성장 이야기.', color: '#f7e3a1' },
    { title: '소년이 온다', author: '한강', desc: '1980년 5월, 그날을 기억하는 사람들의 목소리.', color: '#f1c6d6' },
  ];

  const QUOTES = [
    ['한 권의 책을 읽는 사람은 두 번 사는 것과 같다.', '파스칼 키냐르'],
    ['책을 읽는다는 것은 다른 사람의 눈으로 세상을 보는 일이다.', '마르셀 프루스트'],
    ['중요한 것은 눈에 보이지 않아. 마음으로 보아야 잘 보여.', '생텍쥐페리, 《어린 왕자》'],
    ['새는 알에서 나오려고 투쟁한다. 알은 세계다.', '헤르만 헤세, 《데미안》'],
    ['읽지 않는 하루는 쓰지 않은 일기와 같다.', '북로그'],
    ['좋은 책은 읽는 이를 조금 더 나은 사람으로 만든다.', '랠프 월도 에머슨'],
  ];

  const SEED_RECS = [
    { id: 'seed-r1', theme: '비 오는 날 감성 충전하기 좋은 소설', book: '모순', reason: '빗소리와 함께 읽으면 문장이 더 깊게 스며들어요.', nick: '책벌레', date: '2026-10-01' },
    { id: 'seed-r2', theme: '사회초년생에게 선물하기 좋은 에세이', book: '불편한 편의점', reason: '지친 하루 끝에 위로가 되는 책이에요.', nick: '다람쥐', date: '2026-10-03' },
  ];
  const SEED_REVIEWS = [
    { id: 'seed-v1', book: '어린 왕자', title: '다시 읽는 어린 시절', rating: 5, body: '어릴 땐 몰랐던 문장들이 어른이 되어서야 보입니다. 길들인다는 것의 의미를 오래 생각했어요.', nick: '책벌레', date: '2026-10-05', mine: false },
  ];

  // ---------- 저장소 ----------
  const mem = {};
  const store = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem('booklog:' + key);
        return v === null ? fallback : JSON.parse(v);
      } catch (e) { return key in mem ? mem[key] : fallback; }
    },
    set(key, val) {
      mem[key] = val;
      try { localStorage.setItem('booklog:' + key, JSON.stringify(val)); } catch (e) { /* 저장 불가 시 메모리만 사용 */ }
    },
  };
  if (store.get('seeded', false) === false) {
    store.set('recs', SEED_RECS);
    store.set('reviews', SEED_REVIEWS);
    store.set('seeded', true);
  }

  // ---------- 유틸 ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const keyOf = (t) => t.trim().replace(/\s+/g, '').toLowerCase();
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const stars = (n) => '★'.repeat(Math.round(n)) + '☆'.repeat(5 - Math.round(n));
  const nick = () => store.get('nick', '') || '익명';

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.add('hidden'), 1800);
  }

  function findBook(title) {
    return BESTSELLERS.find((b) => keyOf(b.title) === keyOf(title)) || { title, author: '', desc: '', color: '#e8dcc8' };
  }

  function coverHTML(b) {
    return `<div class="cover" style="background:${b.color}"><b>${esc(b.title)}</b><span>${esc(b.author)}</span></div>`;
  }

  // ---------- 별점 입력 위젯 ----------
  function starInput(el, onChange) {
    let value = 0;
    el.innerHTML = [1, 2, 3, 4, 5].map((n) => `<button type="button" class="star" data-n="${n}" aria-label="${n}점">★</button>`).join('');
    const paint = () => $$('.star', el).forEach((s) => s.classList.toggle('on', +s.dataset.n <= value));
    el.addEventListener('click', (e) => {
      const s = e.target.closest('.star');
      if (!s) return;
      value = +s.dataset.n;
      paint();
      onChange && onChange(value);
    });
    return { get: () => value, reset: () => { value = 0; paint(); } };
  }

  // ---------- 렌더링 ----------
  function renderBest() {
    $('#bestGrid').innerHTML = BESTSELLERS.map((b, i) => {
      const { avg, n } = ratingOf(b.title);
      return `<button class="text-left group" data-book="${i}">
        <div class="transition group-hover:-translate-y-1">${coverHTML(b)}</div>
        <p class="mt-2 font-bold text-sm">${i + 1}. ${esc(b.title)}</p>
        <p class="text-xs opacity-70">${esc(b.author)}</p>
        <p class="text-xs star-ro">${n ? stars(avg) + ' ' + avg.toFixed(1) : '<span class="opacity-50">첫 평가를 남겨보세요</span>'}</p>
      </button>`;
    }).join('');
  }

  function reviewCard(r, showDelete) {
    return `<article class="card" id="review-${esc(r.id)}">
      <p class="text-xs opacity-60 mb-1">${esc(r.nick)} · ${esc(r.date)}</p>
      <h3 class="font-serif font-bold">${esc(r.title)}</h3>
      <p class="text-sm mt-0.5"><a href="#" data-open="${esc(r.book)}" class="underline decoration-peach">${esc(r.book)}</a> <span class="star-ro">${stars(r.rating)}</span></p>
      <p class="text-sm mt-2 whitespace-pre-line">${esc(r.body)}</p>
      <div class="flex gap-2 mt-3">
        <button class="btn-ghost" data-share="${esc(r.id)}">🔗 공유하기</button>
        ${showDelete ? `<button class="btn-ghost" data-del-review="${esc(r.id)}">삭제</button>` : ''}
      </div>
    </article>`;
  }

  const empty = (msg) => `<p class="opacity-60 text-sm col-span-full py-8 text-center">${msg}</p>`;

  function renderReviews() {
    const list = store.get('reviews', []);
    $('#reviewList').innerHTML = list.length ? list.map((r) => reviewCard(r, r.mine)).join('') : empty('아직 독후감이 없어요. 첫 독후감을 남겨보세요!');
  }

  function renderRecs() {
    const list = store.get('recs', []);
    $('#recList').innerHTML = list.length ? list.map((r) => `
      <article class="card">
        <span class="inline-block text-xs px-2 py-0.5 rounded-full bg-lavender/60 dark:bg-stone-700 mb-2">${esc(r.theme)}</span>
        <h3 class="font-serif font-bold"><a href="#" data-open="${esc(r.book)}">${esc(r.book)}</a></h3>
        <p class="text-sm mt-1 whitespace-pre-line">${esc(r.reason)}</p>
        <p class="text-xs opacity-60 mt-2">추천 · ${esc(r.nick)} · ${esc(r.date)}</p>
        ${r.mine ? `<button class="btn-ghost mt-2" data-del-rec="${esc(r.id)}">삭제</button>` : ''}
      </article>`).join('') : empty('첫 추천을 등록해보세요!');
  }

  function renderMy() {
    const mine = store.get('reviews', []).filter((r) => r.mine);
    const books = new Set(mine.map((r) => keyOf(r.book)));
    const avg = mine.length ? (mine.reduce((s, r) => s + r.rating, 0) / mine.length).toFixed(1) : '-';
    $('#stats').innerHTML = [['독후감', mine.length], ['읽은 책', books.size], ['평균 별점', avg]].map(([k, v]) =>
      `<div class="card text-center"><p class="text-2xl font-bold">${v}</p><p class="text-xs opacity-70">${k}</p></div>`).join('');
    $('#myList').innerHTML = mine.length ? mine.map((r) => reviewCard(r, true)).join('') : empty('내가 쓴 독후감이 여기에 모여요.');
    $('#nickInput').value = store.get('nick', '');
  }

  // ---------- 별점/한줄평 ----------
  function ratingsOf(title) { return store.get('ratings', {})[keyOf(title)] || []; }
  function ratingOf(title) {
    const l = ratingsOf(title);
    return { n: l.length, avg: l.length ? l.reduce((s, x) => s + x.rating, 0) / l.length : 0 };
  }

  let currentBook = null;
  let detailStars = null;

  function openBook(title) {
    const b = findBook(title);
    currentBook = b;
    const { avg, n } = ratingOf(b.title);
    const comments = ratingsOf(b.title).slice().reverse();
    const related = store.get('reviews', []).filter((r) => keyOf(r.book) === keyOf(b.title));
    $('#bookDetail').innerHTML = `
      <div class="flex gap-4">
        <div class="w-28 shrink-0">${coverHTML(b)}</div>
        <div>
          <h3 class="font-serif text-xl font-bold">${esc(b.title)}</h3>
          <p class="text-sm opacity-70">${esc(b.author) || '저자 미상'}</p>
          <p class="text-sm mt-2">${esc(b.desc)}</p>
          <p class="mt-2 star-ro">${n ? `${stars(avg)} <span class="text-sm">${avg.toFixed(1)} (${n}명)</span>` : '<span class="text-sm opacity-60">아직 평가가 없어요</span>'}</p>
        </div>
      </div>
      <form id="ratingForm" class="mt-5 space-y-2">
        <div class="flex items-center gap-2"><span class="text-sm font-bold">내 평가</span><div id="detailStars"></div></div>
        <div class="flex gap-2">
          <input name="comment" required maxlength="100" class="field" placeholder="익명 한줄평을 남겨주세요">
          <button class="btn-primary shrink-0">등록</button>
        </div>
      </form>
      <h4 class="font-bold mt-5 mb-2 text-sm">한줄평</h4>
      <ul class="space-y-2 text-sm">${comments.length ? comments.map((c) =>
        `<li class="card !p-3"><span class="star-ro">${stars(c.rating)}</span> ${esc(c.comment)} <span class="text-xs opacity-50">· ${esc(c.date)}</span></li>`).join('') : '<li class="opacity-60">첫 한줄평을 남겨보세요.</li>'}</ul>
      <h4 class="font-bold mt-5 mb-2 text-sm">관련 독후감 (${related.length})</h4>
      <div class="space-y-3">${related.map((r) => reviewCard(r, false)).join('') || '<p class="text-sm opacity-60">아직 독후감이 없어요.</p>'}</div>`;
    detailStars = starInput($('#detailStars'));
    $('#bookModal').classList.remove('hidden');
  }

  // ---------- 탭 라우팅 ----------
  function showTab(tab) {
    if (!$(`[data-panel="${tab}"]`)) tab = 'home';
    $$('[data-panel]').forEach((p) => p.classList.toggle('hidden', p.dataset.panel !== tab));
    $$('.tab-link').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));
    if (tab === 'mypage') renderMy();
  }

  function route() {
    const h = location.hash.slice(1);
    if (h.startsWith('review-')) {
      showTab('reviews');
      const el = document.getElementById(h);
      if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('hl'); }
    } else {
      showTab(h);
    }
  }

  // ---------- 모달 ----------
  const openModal = (id) => $(id).classList.remove('hidden');
  const closeModals = () => $$('.modal').forEach((m) => m.classList.add('hidden'));

  // ---------- 이벤트 ----------
  function refreshAll() { renderBest(); renderReviews(); renderRecs(); renderMy(); }

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (t.matches('.modal') || t.closest('[data-close]')) return closeModals();

    const bookBtn = t.closest('[data-book]');
    if (bookBtn) return openBook(BESTSELLERS[+bookBtn.dataset.book].title);

    const open = t.closest('[data-open]');
    if (open) { e.preventDefault(); return openBook(open.dataset.open); }

    const share = t.closest('[data-share]');
    if (share) {
      const url = location.origin + location.pathname + '#review-' + share.dataset.share;
      const done = () => toast('링크가 복사되었어요 🔗');
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, () => prompt('링크를 복사하세요', url));
      else prompt('링크를 복사하세요', url);
      return;
    }

    const delReview = t.closest('[data-del-review]');
    if (delReview && confirm('독후감을 삭제할까요?')) {
      store.set('reviews', store.get('reviews', []).filter((r) => r.id !== delReview.dataset.delReview));
      closeModals(); refreshAll();
      return;
    }
    const delRec = t.closest('[data-del-rec]');
    if (delRec && confirm('추천을 삭제할까요?')) {
      store.set('recs', store.get('recs', []).filter((r) => r.id !== delRec.dataset.delRec));
      refreshAll();
    }
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModals(); });
  window.addEventListener('hashchange', route);

  $('#themeBtn').addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    store.set('theme', dark ? 'dark' : 'light');
    $('#themeBtn').textContent = dark ? '☀️' : '🌙';
  });

  $('#nickInput').addEventListener('change', (e) => { store.set('nick', e.target.value.trim()); toast('닉네임이 저장되었어요'); });

  // 독후감 작성
  const reviewStars = starInput($('#reviewStars'));
  $('#newReviewBtn').addEventListener('click', () => openModal('#reviewModal'));
  $('#reviewForm').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!reviewStars.get()) return toast('별점을 선택해주세요');
    const f = new FormData(e.target);
    const list = store.get('reviews', []);
    list.unshift({ id: uid(), book: f.get('book').trim(), title: f.get('title').trim(), rating: reviewStars.get(), body: f.get('body').trim(), nick: nick(), date: today(), mine: true });
    store.set('reviews', list);
    e.target.reset(); reviewStars.reset(); closeModals(); refreshAll(); toast('독후감이 등록되었어요');
  });

  // 추천 등록
  $('#newRecBtn').addEventListener('click', () => openModal('#recModal'));
  $('#recForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const list = store.get('recs', []);
    list.unshift({ id: uid(), theme: f.get('theme').trim(), book: f.get('book').trim(), reason: f.get('reason').trim(), nick: f.get('nick').trim() || '익명', date: today(), mine: true });
    store.set('recs', list);
    e.target.reset(); closeModals(); renderRecs(); toast('추천이 등록되었어요');
  });

  // 별점 + 한줄평 (동적 폼이므로 위임)
  document.addEventListener('submit', (e) => {
    if (e.target.id !== 'ratingForm') return;
    e.preventDefault();
    if (!detailStars.get()) return toast('별점을 선택해주세요');
    const all = store.get('ratings', {});
    const k = keyOf(currentBook.title);
    (all[k] = all[k] || []).push({ rating: detailStars.get(), comment: new FormData(e.target).get('comment').trim(), date: today() });
    store.set('ratings', all);
    renderBest();
    openBook(currentBook.title);
    toast('평가가 등록되었어요');
  });

  // ---------- 초기화 ----------
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  $('#quoteText').textContent = '“' + q[0] + '”';
  $('#quoteFrom').textContent = '— ' + q[1];
  $('#themeBtn').textContent = document.documentElement.classList.contains('dark') ? '☀️' : '🌙';
  refreshAll();
  route();
})();
