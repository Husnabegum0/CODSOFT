'use strict';

const state = {
  current: '0',
  previous: '',
  operator: null,
  waitingForOperand: false,
  justEvaluated: false,
};

const resultEl     = document.getElementById('result');
const expressionEl = document.getElementById('expression');

// ── Display ──────────────────────────────────────────────
function updateDisplay() {
  const v = state.current;
  const n = parseFloat(v);

  resultEl.textContent =
    !isNaN(n) && Math.abs(n) >= 1e13
      ? n.toExponential(4)
      : v;

  const len = resultEl.textContent.length;
  resultEl.style.fontSize =
    len > 12 ? '1.3rem' :
    len > 9  ? '1.85rem' :
    len > 6  ? '2.2rem'  : '2.6rem';
}

function setExpr(t) { expressionEl.textContent = t; }

function bump() {
  resultEl.classList.remove('bump');
  void resultEl.offsetWidth;
  resultEl.classList.add('bump');
  setTimeout(() => resultEl.classList.remove('bump'), 140);
}

// ── Core logic ────────────────────────────────────────────
function inputDigit(d) {
  if (state.waitingForOperand || state.justEvaluated) {
    state.current = d === '.' ? '0.' : d;
    state.waitingForOperand = false;
    state.justEvaluated    = false;
  } else {
    if (d === '.' && state.current.includes('.')) return;
    state.current =
      state.current === '0' && d !== '.'
        ? d
        : state.current + d;
  }
  updateDisplay();
}

function chooseOperator(op) {
  if (state.operator && !state.waitingForOperand) calculate(false);
  state.previous          = state.current;
  state.operator          = op;
  state.waitingForOperand = true;
  state.justEvaluated     = false;
  setExpr(`${state.previous} ${sym(op)}`);
  lightOp(op);
}

function calculate(final = true) {
  if (!state.operator || state.waitingForOperand) return;
  const a = parseFloat(state.previous);
  const b = parseFloat(state.current);
  let r;

  switch (state.operator) {
    case 'add':      r = a + b; break;
    case 'subtract': r = a - b; break;
    case 'multiply': r = a * b; break;
    case 'divide':
      if (b === 0) {
        resultEl.classList.add('error');
        state.current = 'Error';
        setExpr('Cannot ÷ by 0');
        state.operator          = null;
        state.waitingForOperand = false;
        updateDisplay();
        setTimeout(() => { resultEl.classList.remove('error'); clearAll(); }, 1600);
        return;
      }
      r = a / b; break;
    default: return;
  }

  r = parseFloat(r.toPrecision(12));

  if (final) {
    setExpr(`${state.previous} ${sym(state.operator)} ${state.current} =`);
    state.operator      = null;
    state.justEvaluated = true;
    clearLights();
    bump();
  }

  state.current          = String(r);
  state.previous         = state.current;
  state.waitingForOperand = false;
  updateDisplay();
}

function clearAll() {
  Object.assign(state, {
    current: '0', previous: '', operator: null,
    waitingForOperand: false, justEvaluated: false,
  });
  setExpr('');
  clearLights();
  updateDisplay();
}

function toggleSign() {
  if (state.current === '0' || state.current === 'Error') return;
  state.current = state.current.startsWith('-')
    ? state.current.slice(1)
    : '-' + state.current;
  updateDisplay();
}

function applyPercent() {
  const v = parseFloat(state.current);
  if (isNaN(v)) return;
  state.current = String(
    state.previous && state.operator
      ? (parseFloat(state.previous) * v) / 100
      : v / 100
  );
  updateDisplay();
}

// ── Helpers ───────────────────────────────────────────────
function sym(op) {
  return { add: '+', subtract: '−', multiply: '×', divide: '÷' }[op] ?? '';
}

function lightOp(op) {
  clearLights();
  document.querySelector(`[data-action="${op}"]`)?.classList.add('active');
}

function clearLights() {
  document.querySelectorAll('.btn.op').forEach(b => b.classList.remove('active'));
}

// ── Ripple ────────────────────────────────────────────────
function ripple(btn, e) {
  const r = btn.getBoundingClientRect();
  const x = (e.clientX ?? r.left + r.width  / 2) - r.left  - 30;
  const y = (e.clientY ?? r.top  + r.height / 2) - r.top   - 30;
  const el = document.createElement('span');
  el.className = 'ripple';
  el.style.cssText = `left:${x}px;top:${y}px`;
  btn.appendChild(el);
  setTimeout(() => el.remove(), 520);
}

// ── Button clicks ─────────────────────────────────────────
document.querySelector('.buttons').addEventListener('click', e => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  ripple(btn, e);

  const { action, value } = btn.dataset;
  if (value !== undefined) return inputDigit(value);

  ({ clear: clearAll, sign: toggleSign, percent: applyPercent,
     add:    () => chooseOperator('add'),
     subtract: () => chooseOperator('subtract'),
     multiply: () => chooseOperator('multiply'),
     divide:   () => chooseOperator('divide'),
     equals: () => calculate(true),
  })[action]?.();
});

// ── Keyboard ──────────────────────────────────────────────
const keys = {
  '0':'0','1':'1','2':'2','3':'3','4':'4',
  '5':'5','6':'6','7':'7','8':'8','9':'9','.':'.',',':'.',
  '+': () => chooseOperator('add'),
  '-': () => chooseOperator('subtract'),
  '*': () => chooseOperator('multiply'),
  '/': () => chooseOperator('divide'),
  'Enter':     () => calculate(true),
  '=':         () => calculate(true),
  'Backspace': () => {
    if (state.current.length > 1 && state.current !== 'Error')
      state.current = state.current.slice(0, -1);
    else state.current = '0';
    updateDisplay();
  },
  'Escape': clearAll,
  'Delete': clearAll,
  '%': applyPercent,
};

document.addEventListener('keydown', e => {
  const action = keys[e.key];
  if (!action) return;
  e.preventDefault();

  if (typeof action === 'string') inputDigit(action);
  else action();

  // Visual press feedback
  const selMap = {
    'Enter':'[data-action="equals"]','=':'[data-action="equals"]',
    'Escape':'[data-action="clear"]','Delete':'[data-action="clear"]',
    '+':'[data-action="add"]','-':'[data-action="subtract"]',
    '*':'[data-action="multiply"]','/':'[data-action="divide"]',
  };
  const sel = selMap[e.key] ?? (!isNaN(e.key) || e.key==='.' ? `[data-value="${e.key}"]` : null);
  if (sel) {
    const b = document.querySelector(sel);
    if (b) { b.classList.add('pressed'); setTimeout(() => b.classList.remove('pressed'), 120); }
  }
});

// ── Init ──────────────────────────────────────────────────
updateDisplay();
