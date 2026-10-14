// 스테이지로직 컴퍼니 — 공통 스크립트

// 대표 연락처. 확정되면 여기만 채우면 문의 화면과 꼬리말에 함께 반영된다.
const CONTACT = {
  email: 'stagelogic@naver.com',
  phone: '010-4028-9803',
};

// 모바일 메뉴 열고 닫기
const toggle = document.querySelector('.nav-toggle');
const nav = document.getElementById('site-nav');
if (toggle && nav) {
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

// 연락처 채우기. 값이 없으면 '준비 중'으로 둔다.
document.querySelectorAll('[data-contact]').forEach((el) => {
  const key = el.dataset.contact;
  const value = CONTACT[key];
  if (!value) {
    el.textContent = '준비 중';
    return;
  }
  const href = key === 'email' ? `mailto:${value}` : `tel:${value.replace(/[^0-9+]/g, '')}`;
  el.innerHTML = '';
  const a = document.createElement('a');
  a.href = href;
  a.textContent = value;
  el.appendChild(a);
});

// 포트폴리오 분야별 거르기
const filters = document.querySelector('.filters');
if (filters) {
  const works = document.querySelectorAll('.work');
  const apply = (category) => {
    filters.querySelectorAll('button').forEach((b) => {
      b.setAttribute('aria-pressed', String(b.dataset.filter === category));
    });
    works.forEach((w) => {
      w.hidden = category !== 'all' && w.dataset.category !== category;
    });
  };
  filters.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-filter]');
    if (btn) apply(btn.dataset.filter);
  });
  // /portfolio/#stage 처럼 들어오면 그 분야만 보여 준다.
  const fromHash = location.hash.slice(1);
  if (['stage', 'web', 'solution'].includes(fromHash)) apply(fromHash);
}

// 문의 양식: 서버(/api/contact/)로 보내 대표 메일로 받는다.
// 서버 메일 설정 전이거나 보내기에 실패하면 방문자의 메일 앱으로 넘긴다.
const form = document.getElementById('contact-form');
if (form) {
  const status = document.getElementById('form-status');
  const opened = Date.now();
  const params = new URLSearchParams(location.search);
  const preset = params.get('type');
  if (preset && form.type.querySelector(`option[value="${preset}"]`)) form.type.value = preset;
  const say = (msg) => { status.hidden = false; status.textContent = msg; };

  const viaMailApp = (data, typeLabel) => {
    if (!CONTACT.email) { say('지금은 문의를 보낼 수 없습니다. 전화로 연락해 주세요.'); return; }
    const subject = `[홈페이지 문의] ${typeLabel} - ${data.get('name')}`;
    const body = [
      `문의 분야: ${typeLabel}`, `성함: ${data.get('name')}`, `소속: ${data.get('org') || '-'}`,
      `연락처: ${data.get('phone')}`, `이메일: ${data.get('email') || '-'}`, '', data.get('message'),
    ].join('\n');
    location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    say('메일 앱이 열리면 내용을 확인한 뒤 보내 주세요. 메일 앱이 열리지 않으면 위 메일 주소로 직접 보내 주셔도 됩니다.');
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const typeLabel = form.type.options[form.type.selectedIndex].text;
    const button = form.querySelector('button[type=submit]');
    button.disabled = true;
    say('보내는 중입니다…');
    try {
      const res = await fetch('/api/contact/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(data), elapsed: Date.now() - opened }),
      });
      if (res.ok) { form.reset(); say('문의를 보냈습니다. 확인하는 대로 연락드리겠습니다.'); return; }
      if (res.status === 400) { say('성함, 연락처, 문의 내용을 확인해 주세요. 이메일은 형식에 맞게 적어 주세요.'); return; }
      viaMailApp(data, typeLabel);
    } catch {
      viaMailApp(data, typeLabel);
    } finally {
      button.disabled = false;
    }
  });
}
