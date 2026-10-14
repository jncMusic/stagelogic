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

// 문의 양식은 /assets/js/ask.js 에 있다 (문의 화면에서만 불러온다).
