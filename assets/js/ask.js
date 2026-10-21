// 문의 화면: '무엇을 하고 싶은지'를 고르면, 그 일에 맞는 질문을 차례로 보여 준다.
// 대부분 고르기만 하면 되게 하고, 고른 내용은 오른쪽 요약과 메일에 같은 순서로 담는다.
// 질문을 고치려면 아래 FLOWS만 바꾸면 된다. (one: 하나 고르기, many: 여러 개, date: 날짜, text: 짧은 글)

const STAGE_BUDGET = ['300만 원 이하', '300~700만 원', '700~1,500만 원', '1,500~3,000만 원', '3,000만 원 이상', '상의하고 싶어요'];
const PAY = ['계약할 때 한 번에', '선금 · 잔금 나눠서', '끝난 뒤 한 번에', '기관 · 회사 규정대로'];
const BILL = ['세금계산서', '카드 결제', '현금영수증', '상관없어요'];
const payQs = (budget) => [
  { k: 'budget', q: '생각하시는 금액대', type: 'one', opts: budget },
  { k: 'pay', q: '결제는 어떻게 하시나요?', type: 'one', opts: PAY },
  { k: 'payBy', q: '결제 · 정산 마감일이 정해져 있나요?', type: 'date', none: '정해진 기한 없어요' },
  { k: 'bill', q: '필요한 증빙', type: 'one', opts: BILL },
];

const FLOWS = {
  academy: {
    icon: '🏫', goal: '학원을 열거나 바꾸고 싶어요', sub: '개원 · 운영 컨설팅, 개원 · 운영 체크리스트, 클래스로직', label: '학원 개원 · 컨설팅',
    title: '학원 이야기를 들려주세요',
    qs: [
      { k: 'stage', q: '지금 어느 단계인가요?', type: 'one', opts: ['개원을 준비하고 있어요', '운영 중인데 바꾸고 싶어요'] },
      { k: 'academy', q: '어떤 학원인가요?', type: 'one', opts: ['음악', '미술', '무용 · 연기', '기타 예술'] },
      { k: 'open', q: '개원 예정일', type: 'date', none: '이미 운영 중이에요' },
      { k: 'students', q: '학생 수 (운영 중이면)', type: 'one', opts: ['30명 이하', '30~80명', '80~150명', '150명 이상'] },
      { k: 'want', q: '관심 있는 것', type: 'many', opts: ['학원 개원 컨설팅', '학원 운영 컨설팅', '학원 개원 체크리스트', '학원 운영 체크리스트', '학원관리 앱 클래스로직', '학원 홈페이지'] },
    ],
    money: [],
  },
  stage: {
    icon: '🎻', goal: '음악회나 행사를 열고 싶어요', sub: '송년 · 신년음악회, 기념식, 연회, 축제', label: '음악회 · 행사',
    title: '어떤 자리를 그리고 계세요?',
    qs: [
      { k: 'occasion', q: '어떤 자리인가요?', type: 'one', opts: ['송년음악회', '신년음악회', '창립기념 · 시상식', '총회 · 연회 · 만찬', '축제 · 야외 행사', '정기연주회', '기타'] },
      { k: 'when', q: '언제쯤인가요?', type: 'date', none: '아직 정하지 않았어요' },
      { k: 'venue', q: '장소는 정하셨나요?', type: 'one', opts: ['정했어요', '후보가 있어요', '추천받고 싶어요'] },
      { k: 'place', q: '장소나 지역', type: 'text', ph: '예: 서울 강남 호텔 연회장, 회사 대강당' },
      { k: 'guests', q: '손님은 몇 분쯤 오세요?', type: 'one', opts: ['50명 이하', '50~100명', '100~300명', '300명 이상', '아직 몰라요'] },
      { k: 'mood', q: '손님들이 어떤 시간을 보내면 좋겠어요?', type: 'one', opts: ['식사하며 편하게 듣는 음악', '짧고 굵은 축하 무대', '제대로 된 한 편의 공연', '추천해 주세요'] },
      { k: 'needs', q: '함께 맡기고 싶은 일', type: 'many', opts: ['연주 · 출연진', '사회 · 진행', '무대 · 음향 · 조명', '초대장 · 프로그램북', '사진 · 영상', '장소 섭외', '결과보고서'] },
    ],
    money: payQs(STAGE_BUDGET),
  },
  contest: {
    icon: '🏆', goal: '대회나 콩쿠르를 치르고 싶어요', sub: '접수부터 진행표, 채점, 상장, 결과보고서까지', label: '대회 · 콩쿠르',
    title: '어떤 대회인가요?',
    qs: [
      { k: 'kind', q: '어떤 대회인가요?', type: 'one', opts: ['관악 · 기악', '성악 · 합창', '피아노', '학생 콩쿠르', '기타'] },
      { k: 'first', q: '처음 여는 대회인가요?', type: 'one', opts: ['처음 열어요', '해마다 열어요'] },
      { k: 'when', q: '언제 열리나요?', type: 'date', none: '아직 정하지 않았어요' },
      { k: 'size', q: '참가 규모', type: 'one', opts: ['50팀 이하', '50~150팀', '150팀 이상', '아직 몰라요'] },
      { k: 'needs', q: '맡기고 싶은 일', type: 'many', opts: ['참가 접수', '진행표 · 가번호', '심사위원 섭외', '채점표 · 점수 집계', '상장 · 상패', '프로그램북', '현장 운영', '결과보고서 · 정산 서류'] },
    ],
    money: payQs(STAGE_BUDGET),
  },
  web: {
    icon: '🖥️', goal: '홈페이지가 필요해요', sub: '새로 만들기, 다시 만들기, 고치기', label: '홈페이지',
    title: '홈페이지로 무엇을 하고 싶으세요?',
    qs: [
      { k: 'who', q: '어떤 곳의 홈페이지인가요?', type: 'one', opts: ['협회 · 연맹', '오케스트라 · 합창단', '음악 · 예술학원', '공연 · 축제', '개인 연주자 · 강사', '기타'] },
      { k: 'now', q: '지금 홈페이지가 있나요?', type: 'one', opts: ['없어요', '있는데 새로 만들고 싶어요', '있는 걸 고치고 싶어요'] },
      { k: 'url', q: '지금 홈페이지 · 블로그 주소', type: 'text', ph: '있으면 적어 주세요' },
      { k: 'goals', q: '홈페이지로 하고 싶은 일', type: 'many', opts: ['우리를 제대로 소개하기', '상담 · 문의 더 받기', '회원 가입 받고 관리하기', '공지 · 소식 올리기', '공연 일정 알리기', '온라인 신청 · 접수 받기', '네이버 · 구글에서 찾아지기'] },
      { k: 'edit', q: '내용은 누가 고치면 좋겠어요?', type: 'one', opts: ['우리가 직접 자주', '가끔 우리가', '맡기고 싶어요'] },
      { k: 'open', q: '언제까지 열고 싶으세요?', type: 'date', none: '여유 있어요' },
    ],
    money: payQs(['150만 원 안팎', '150~300만 원', '300~600만 원', '600만 원 이상', '상의하고 싶어요']),
  },
  classlogic: {
    icon: '📒', goal: '학원 일을 덜고 싶어요', sub: '출결 · 시간표 · 수납 · 학부모 연락 (클래스로직)', label: '클래스로직',
    title: '학원 이야기를 들려주세요',
    qs: [
      { k: 'academy', q: '어떤 학원인가요?', type: 'one', opts: ['음악', '미술', '무용 · 연기', '입시 · 보습', '기타'] },
      { k: 'students', q: '학생 수', type: 'one', opts: ['30명 이하', '30~80명', '80~150명', '150명 이상'] },
      { k: 'teachers', q: '강사 수', type: 'one', opts: ['혼자 해요', '2~5명', '6~10명', '11명 이상'] },
      { k: 'nowTool', q: '지금은 어떻게 관리하세요?', type: 'many', opts: ['종이 출결부', '엑셀', '단톡방 · 문자', '다른 학원 프로그램'] },
      { k: 'pain', q: '가장 덜고 싶은 일', type: 'many', opts: ['출결 체크', '시간표 · 보강 맞추기', '원비 수납 · 미납 확인', '학부모 연락', '강사 수업 관리'] },
      { k: 'want', q: '어떻게 해 드릴까요?', type: 'one', opts: ['출시되면 알려 주세요', '화면을 먼저 보고 싶어요', '먼저 써 보고 싶어요'] },
    ],
    money: [
      { k: 'fee', q: '한 달에 이 정도면 쓰겠다', type: 'one', opts: ['월 3만 원 이하', '월 3~5만 원', '월 5~10만 원', '월 10만 원 이상', '잘 모르겠어요'] },
      { k: 'start', q: '언제부터 쓰고 싶으세요?', type: 'one', opts: ['바로', '다음 학기부터', '내년부터', '아직 몰라요'] },
    ],
  },
  etc: {
    icon: '💬', goal: '다른 이야기가 있어요', sub: '협업 제안, 견적, 무엇이든', label: '기타',
    title: '', qs: [], money: [],
  },
};

const REACH = [
  { k: 'how', q: '편한 연락 방법', type: 'one', opts: ['전화', '문자', '카카오톡', '이메일'] },
  { k: 'time', q: '연락받기 편한 때', type: 'one', opts: ['오전', '오후', '저녁', '언제든'] },
];

const form = document.getElementById('contact-form');
if (form) {
  const $ = (id) => document.getElementById(id);
  const status = $('form-status');
  const opened = Date.now();
  let flow = null;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // 질문 하나를 화면 조각으로 만든다. 이름은 q_<키>로 붙여 다른 칸과 겹치지 않게 한다.
  function render(item) {
    const name = `q_${item.k}`;
    const head = `<legend class="q">${esc(item.q)}${item.type === 'many' ? ' <span class="opt">(여러 개 골라도 돼요)</span>' : ''}</legend>`;
    if (item.type === 'text') {
      return `<div class="qbox"><label class="q" for="${name}">${esc(item.q)} <span class="opt">(선택)</span></label><input id="${name}" name="${name}" placeholder="${esc(item.ph || '')}" maxlength="200"></div>`;
    }
    if (item.type === 'date') {
      return `<fieldset class="qbox">${head}<div class="chips-pick"><input type="date" name="${name}" aria-label="${esc(item.q)}">`
        + `<label class="pick"><input type="checkbox" name="${name}_none" value="${esc(item.none)}"><span>${esc(item.none)}</span></label></div></fieldset>`;
    }
    const kind = item.type === 'many' ? 'checkbox' : 'radio';
    return `<fieldset class="qbox">${head}<div class="chips-pick">${item.opts.map((o) => `<label class="pick"><input type="${kind}" name="${name}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join('')}</div></fieldset>`;
  }

  // 고른 내용을 [질문, 답] 목록으로 모은다. 비운 질문은 뺀다.
  function answers() {
    if (!flow) return [];
    const out = [];
    for (const item of [...flow.qs, ...flow.money, ...REACH]) {
      const name = `q_${item.k}`;
      let a = '';
      if (item.type === 'many') a = [...form.querySelectorAll(`[name="${name}"]:checked`)].map((i) => i.value).join(', ');
      else if (item.type === 'one') a = form.querySelector(`[name="${name}"]:checked`)?.value || '';
      else if (item.type === 'date') {
        const none = form.querySelector(`[name="${name}_none"]`);
        a = none?.checked ? none.value : (form.querySelector(`[name="${name}"]`)?.value || '');
      } else a = (form.querySelector(`[name="${name}"]`)?.value || '').trim();
      if (a) out.push({ q: item.q, a });
    }
    return out;
  }

  function refreshSummary() {
    const box = $('summary');
    const list = answers();
    box.hidden = !flow;
    if (!flow) return;
    $('summary-list').innerHTML = `<div><dt>하고 싶은 일</dt><dd>${esc(flow.goal)}</dd></div>`
      + list.map((x) => `<div><dt>${esc(x.q)}</dt><dd>${esc(x.a)}</dd></div>`).join('')
      + (list.length ? '' : '<p class="summary-empty">고르시는 대로 여기에 정리됩니다.</p>');
  }

  function choose(key, scroll) {
    flow = FLOWS[key];
    form.dataset.type = key;
    form.querySelectorAll('.goal').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.key === key)));
    const hasQs = flow.qs.length > 0;
    $('step-detail').hidden = !hasQs;
    $('step-money').hidden = !flow.money.length;
    $('detail-title').textContent = flow.title;
    $('detail-qs').innerHTML = flow.qs.map(render).join('');
    $('money-qs').innerHTML = flow.money.map(render).join('');
    $('reach-qs').innerHTML = REACH.map(render).join('');
    $('step-contact').hidden = false;
    $('contact-n').textContent = String(2 + (hasQs ? 1 : 0) + (flow.money.length ? 1 : 0));
    // '기타'는 고를 것이 없으니 글로 받는다.
    const msg = $('message');
    msg.required = key === 'etc';
    $('message-label').innerHTML = key === 'etc' ? '하고 싶은 이야기' : '더 하고 싶은 말 <span class="opt">(선택)</span>';
    refreshSummary();
    if (scroll) (hasQs ? $('step-detail') : $('step-contact')).scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('goal-grid').innerHTML = Object.entries(FLOWS).map(([key, f]) => `<button type="button" class="goal" data-key="${key}" aria-pressed="false">`
    + `<span class="goal-icon" aria-hidden="true">${f.icon}</span><b>${esc(f.goal)}</b><small>${esc(f.sub)}</small></button>`).join('');
  $('goal-grid').addEventListener('click', (e) => {
    const b = e.target.closest('.goal');
    if (b) choose(b.dataset.key, true);
  });

  // 날짜를 고르면 '아직 몰라요'를 풀고, '아직 몰라요'를 고르면 날짜를 비운다.
  form.addEventListener('change', (e) => {
    const t = e.target;
    if (t.type === 'date' && t.value) { const n = form.querySelector(`[name="${t.name}_none"]`); if (n) n.checked = false; }
    if (t.name?.endsWith('_none') && t.checked) { const d = form.querySelector(`[name="${t.name.slice(0, -5)}"]`); if (d) d.value = ''; }
    refreshSummary();
  });
  form.addEventListener('input', (e) => { if (e.target.matches('input[type=text], input:not([type])')) refreshSummary(); });

  // 예전 주소(/contact/?type=stage 등)로 들어오면 그 일을 미리 골라 둔다.
  const preset = new URLSearchParams(location.search).get('type');
  if (preset && FLOWS[preset]) choose(preset, false);

  const say = (msg) => { status.hidden = false; status.textContent = msg; };

  const viaMailApp = (data, list) => {
    if (typeof CONTACT === 'undefined' || !CONTACT.email) { say('지금은 문의를 보낼 수 없습니다. 전화로 연락해 주세요.'); return; }
    const subject = `[홈페이지 문의] ${flow.label} - ${data.get('name')}`;
    const body = [
      `하고 싶은 일: ${flow.goal}`, ...list.map((x) => `${x.q}: ${x.a}`), '',
      `성함: ${data.get('name')}`, `소속: ${data.get('org') || '-'}`, `연락처: ${data.get('phone')}`, `이메일: ${data.get('email') || '-'}`,
      '', data.get('message') || '',
    ].join('\n');
    location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    say('메일 앱이 열리면 내용을 확인한 뒤 보내 주세요. 메일 앱이 열리지 않으면 오른쪽 메일 주소로 직접 보내 주셔도 됩니다.');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!flow) { $('step-goal').scrollIntoView({ behavior: 'smooth' }); return; }
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const list = answers();
    const button = form.querySelector('button[type=submit]');
    button.disabled = true;
    say('보내는 중입니다…');
    try {
      const res = await fetch('/api/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.dataset.type, answers: list,
          name: data.get('name'), org: data.get('org'), phone: data.get('phone'), email: data.get('email'),
          message: data.get('message'), website: data.get('website'), elapsed: Date.now() - opened,
        }),
      });
      if (res.ok) {
        form.hidden = true;
        const done = document.createElement('div');
        done.className = 'ask-done';
        done.innerHTML = `<h2>잘 받았습니다, ${esc(data.get('name'))} 님</h2><p>고르신 내용을 보고 정리해서 ${list.find((x) => x.q === REACH[1].q) ? '말씀하신 때에' : '곧'} 연락드릴게요.</p>`
          + '<a class="btn btn-line" href="/">처음 화면으로</a>';
        form.after(done);
        done.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      if (res.status === 400) { say('성함과 연락처를 확인해 주세요. 이메일은 형식에 맞게 적어 주세요.'); return; }
      viaMailApp(data, list);
    } catch {
      viaMailApp(data, list);
    } finally {
      button.disabled = false;
    }
  });
}
