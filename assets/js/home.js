// 홈 첫 화면 — 코드를 치면 공연장에 불이 켜진다 (약 3초)
(() => {
  const duo = document.getElementById('duo');
  const pre = document.getElementById('duo-lines');
  if (!duo || !pre) return;
  // 스크립트가 돌 때만 숨겼다가 차례로 보여 준다
  duo.classList.add('anim');

  const lines = [
    '<span class="k">const</span> stage = <span class="k">new</span> Stage();',
    'stage.floor = <span class="s">"gold"</span>;',
    'stage.light = spotlight();',
    'stage.raise(<span class="s">"예술로"</span>);',
  ];
  const plain = (s) => s.replace(/<[^>]+>/g, '');
  const num = (j) => `<span class="n">0${j + 1}</span>`;

  // 줄이 끝날 때마다: 바닥 → 조명 → 막
  const cue = (i) => {
    if (i >= 2) duo.classList.add('on-floor');
    if (i >= 3) duo.classList.add('lit');
    if (i >= 4) duo.classList.add('raised');
  };
  const render = (i, partial) => {
    pre.innerHTML = lines.map((l, j) => {
      if (j < i) return `<span class="ln">${num(j)}${l}</span>`;
      if (j === i) return `<span class="ln">${num(j)}${partial}<span class="caret"></span></span>`;
      return `<span class="ln">${num(j)}</span>`;
    }).join('');
  };

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    pre.innerHTML = lines.map((l, j) => `<span class="ln">${num(j)}${l}</span>`).join('');
    cue(4);
    return;
  }

  let i = 0, c = 0;
  const tick = () => {
    if (i >= lines.length) return cue(4);
    const t = plain(lines[i]);
    if (c <= t.length) {
      render(i, t.slice(0, c++));
      setTimeout(tick, 20);
    } else {
      i++; c = 0; cue(i);
      setTimeout(tick, 120);
    }
  };
  tick();
})();
