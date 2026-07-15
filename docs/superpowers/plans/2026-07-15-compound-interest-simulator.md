# Compound Interest Simulator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-file HTML compound interest simulator (v1) that lets a user model asset growth from an initial investment plus recurring contributions, with configurable compounding, contribution growth/stop, per-year rate overrides, and inflation-adjusted (real) values — displayed as a one-page navy-dark dashboard.

**Architecture:** A pure calculation module (`src/calc.js`, UMD-style so it works in both Node and the browser) is developed test-first with Node's built-in test runner. A small Node build script concatenates `src/template.html`, `src/styles.css`, `src/calc.js`, and `src/ui.js` into a single self-contained `index.html`. `src/ui.js` reads form inputs, calls the calculation module, and renders results with Chart.js (loaded from CDN).

**Tech Stack:** Vanilla JS (no framework), Node.js built-in test runner (`node --test`, no npm dependencies), Chart.js via CDN, plain CSS with custom properties for theming.

## Global Constraints

- 세금(이자소득세 등)은 v1 범위에서 계산하지 않는다.
- 계산 로직은 항상 원(KRW) 단위로 수행하고, 화면 표시에서만 만원 단위로 변환한다.
- 최종 배포 산출물은 저장소 루트의 단일 파일 `index.html`이며, `scripts/build.js`로 생성한다. `index.html`을 직접 손으로 수정하지 않는다.
- Chart.js는 `https://cdn.jsdelivr.net/npm/chart.js@4`로 CDN 로드한다. 오프라인 지원은 v1 범위 밖이다.
- 테마는 네이비 다크가 기본이며, 라이트 모드로 토글 가능해야 한다.
- 모바일에서는 `<meta name="viewport" content="width=device-width, initial-scale=1.0">`을 반드시 포함하고, 입력 패널은 바텀시트 형태로 전환된다.
- 계산 로직 테스트는 Node 내장 `node --test`만 사용한다. npm 의존성을 추가하지 않는다.
- 프로젝트 루트: `C:\Users\user\compound-interest-sim`

---

### Task 1: 프로젝트 스캐폴딩 + 기본 복리 계산 (초기금 + 고정 수익률)

**Files:**
- Create: `package.json`
- Create: `src/calc.js`
- Create: `tests/calc.test.js`

**Interfaces:**
- Produces: `CompoundCalc.generateSchedule(params)` where `params` at this stage is `{ initialInvestment: number, annualRate: number, compoundingFrequency: 'monthly'|'yearly', years: number }`, returning an array of `{ year: number, totalAsset: number }`.

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "compound-interest-sim",
  "private": true,
  "version": "1.0.0",
  "scripts": {
    "test": "node --test tests/",
    "build": "node scripts/build.js"
  }
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`tests/calc.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { generateSchedule } = require('../src/calc.js');

test('연복리, 납입 없음: 10% 수익률로 2년 후 자산', () => {
  const rows = generateSchedule({
    initialInvestment: 1000000,
    annualRate: 0.1,
    compoundingFrequency: 'yearly',
    years: 2
  });
  assert.equal(rows.length, 2);
  assert.ok(Math.abs(rows[0].totalAsset - 1100000) < 1);
  assert.ok(Math.abs(rows[1].totalAsset - 1210000) < 1);
});

test('월복리, 납입 없음: 연 12% 를 월 1%로 12번 복리', () => {
  const rows = generateSchedule({
    initialInvestment: 1000000,
    annualRate: 0.12,
    compoundingFrequency: 'monthly',
    years: 1
  });
  const expected = 1000000 * Math.pow(1.01, 12);
  assert.ok(Math.abs(rows[0].totalAsset - expected) < 1);
});
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `node --test tests/`
Expected: FAIL — `Cannot find module '../src/calc.js'`

- [ ] **Step 4: 최소 구현 작성**

`src/calc.js`:
```js
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.CompoundCalc = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function generateSchedule(params) {
    const { initialInvestment, annualRate, compoundingFrequency, years } = params;
    const rows = [];
    let balance = initialInvestment;

    for (let year = 1; year <= years; year++) {
      if (compoundingFrequency === 'monthly') {
        const monthlyRate = annualRate / 12;
        for (let month = 1; month <= 12; month++) {
          balance = balance * (1 + monthlyRate);
        }
      } else {
        balance = balance * (1 + annualRate);
      }
      rows.push({ year, totalAsset: balance });
    }

    return rows;
  }

  return { generateSchedule };
});
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `node --test tests/`
Expected: PASS (2 tests)

- [ ] **Step 6: 커밋**

```bash
git add package.json src/calc.js tests/calc.test.js
git commit -m "feat: add baseline compounding calculation"
```

---

### Task 2: 정기 납입 (금액 + 주기) 및 수익 추적 추가

**Files:**
- Modify: `src/calc.js`
- Modify: `tests/calc.test.js`

**Interfaces:**
- Consumes: Task 1의 `generateSchedule` 골격
- Produces: `params`에 `contributionAmount: number`, `contributionFrequency: 'monthly'|'quarterly'|'yearly'` 추가. 반환 row에 `contribution`, `profit`, `cumulativePrincipal`, `cumulativeProfit` 필드 추가.

- [ ] **Step 1: 실패하는 테스트 추가**

`tests/calc.test.js`에 추가:
```js
test('월 납입, 수익률 0%: 1년간 누적 원금과 자산이 일치', () => {
  const rows = generateSchedule({
    initialInvestment: 1000000,
    contributionAmount: 100000,
    contributionFrequency: 'monthly',
    annualRate: 0,
    compoundingFrequency: 'yearly',
    years: 1
  });
  assert.equal(rows[0].contribution, 1200000);
  assert.equal(rows[0].cumulativePrincipal, 2200000);
  assert.equal(rows[0].totalAsset, 2200000);
  assert.equal(rows[0].profit, 0);
  assert.equal(rows[0].cumulativeProfit, 0);
});

test('분기 납입: 1년간 4회만 납입된다', () => {
  const rows = generateSchedule({
    initialInvestment: 0,
    contributionAmount: 300000,
    contributionFrequency: 'quarterly',
    annualRate: 0,
    compoundingFrequency: 'yearly',
    years: 1
  });
  assert.equal(rows[0].contribution, 1200000);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test tests/`
Expected: FAIL — `rows[0].contribution` is `undefined`

- [ ] **Step 3: 구현 확장**

`src/calc.js`의 `generateSchedule`를 아래로 교체:
```js
function generateSchedule(params) {
  const {
    initialInvestment,
    contributionAmount = 0,
    contributionFrequency = 'monthly',
    annualRate,
    compoundingFrequency,
    years
  } = params;

  const contributionMonths = { monthly: 1, quarterly: 3, yearly: 12 }[contributionFrequency];
  const rows = [];
  let balance = initialInvestment;
  let cumulativePrincipal = initialInvestment;
  let cumulativeProfit = 0;

  for (let year = 1; year <= years; year++) {
    const monthlyRate = annualRate / 12;
    const yearStartBalance = balance;
    let yearContribution = 0;

    for (let month = 1; month <= 12; month++) {
      let monthContribution = 0;
      if (contributionAmount > 0 && month % contributionMonths === 0) {
        monthContribution = contributionAmount;
        yearContribution += monthContribution;
        cumulativePrincipal += monthContribution;
      }
      if (compoundingFrequency === 'monthly') {
        balance = (balance + monthContribution) * (1 + monthlyRate);
      } else {
        balance += monthContribution;
      }
    }

    if (compoundingFrequency === 'yearly') {
      balance += balance * annualRate;
    }

    const yearProfit = balance - yearStartBalance - yearContribution;
    cumulativeProfit += yearProfit;

    rows.push({
      year,
      contribution: yearContribution,
      profit: yearProfit,
      cumulativePrincipal,
      cumulativeProfit,
      totalAsset: balance
    });
  }

  return rows;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test tests/`
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/calc.js tests/calc.test.js
git commit -m "feat: add periodic contributions with configurable frequency"
```

---

### Task 3: 납입액 연 증가율 및 납입 중단 시점 추가

**Files:**
- Modify: `src/calc.js`
- Modify: `tests/calc.test.js`

**Interfaces:**
- Consumes: Task 2의 `generateSchedule`
- Produces: `params`에 `contributionGrowthRate: number = 0`, `contributionStopYear: number|null = null` 추가

- [ ] **Step 1: 실패하는 테스트 추가**

```js
test('납입액 연 증가율: 2년차 납입액이 증가율만큼 커진다', () => {
  const rows = generateSchedule({
    initialInvestment: 0,
    contributionAmount: 100000,
    contributionFrequency: 'yearly',
    contributionGrowthRate: 0.1,
    annualRate: 0,
    compoundingFrequency: 'yearly',
    years: 2
  });
  assert.equal(rows[0].contribution, 100000);
  assert.ok(Math.abs(rows[1].contribution - 110000) < 1);
});

test('납입 중단 연차 이후에는 납입이 발생하지 않는다', () => {
  const rows = generateSchedule({
    initialInvestment: 0,
    contributionAmount: 100000,
    contributionFrequency: 'yearly',
    contributionStopYear: 1,
    annualRate: 0,
    compoundingFrequency: 'yearly',
    years: 2
  });
  assert.equal(rows[0].contribution, 100000);
  assert.equal(rows[1].contribution, 0);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test tests/`
Expected: FAIL — 2년차 `contribution`이 100000으로 나와야 할 자리에 증가/중단이 반영되지 않음

- [ ] **Step 3: 구현 확장**

`generateSchedule`의 destructuring에 두 파라미터 추가:
```js
const {
  initialInvestment,
  contributionAmount = 0,
  contributionFrequency = 'monthly',
  contributionGrowthRate = 0,
  contributionStopYear = null,
  annualRate,
  compoundingFrequency,
  years
} = params;
```

루프 내부에서 `yearContribution` 계산 직전에 추가하고, 기존 `if (contributionAmount > 0 && ...)` 조건을 `currentContribution` 기준으로 교체:
```js
const contributionActive = contributionStopYear == null || year <= contributionStopYear;
const currentContribution = contributionActive
  ? contributionAmount * Math.pow(1 + contributionGrowthRate, year - 1)
  : 0;
```
그리고 월 루프 내부 조건을:
```js
if (currentContribution > 0 && month % contributionMonths === 0) {
  monthContribution = currentContribution;
  yearContribution += monthContribution;
  cumulativePrincipal += monthContribution;
}
```
로 교체.

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test tests/`
Expected: PASS (6 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/calc.js tests/calc.test.js
git commit -m "feat: add contribution growth rate and stop year"
```

---

### Task 4: 연도별 수익률 오버라이드 추가

**Files:**
- Modify: `src/calc.js`
- Modify: `tests/calc.test.js`

**Interfaces:**
- Consumes: Task 3의 `generateSchedule`
- Produces: `params`에 `rateOverrides: { [year: number]: number } = {}` 추가. row에 `rate` 필드 추가 (해당 연도 실제 적용 수익률).

- [ ] **Step 1: 실패하는 테스트 추가**

```js
test('연도별 수익률 오버라이드가 지정된 해에만 적용된다', () => {
  const rows = generateSchedule({
    initialInvestment: 1000,
    annualRate: 0.05,
    compoundingFrequency: 'yearly',
    years: 2,
    rateOverrides: { 2: 0.2 }
  });
  assert.ok(Math.abs(rows[0].totalAsset - 1050) < 0.01);
  assert.ok(Math.abs(rows[1].totalAsset - 1260) < 0.01);
  assert.equal(rows[0].rate, 0.05);
  assert.equal(rows[1].rate, 0.2);
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test tests/`
Expected: FAIL — `rows[1].totalAsset`가 오버라이드 미반영으로 1102.5가 나옴, `rows[0].rate`는 `undefined`

- [ ] **Step 3: 구현 확장**

destructuring에 `rateOverrides = {}` 추가. 루프 최상단에서 `annualRate`를 그대로 쓰던 `monthlyRate` 계산과 연복리 계산부를 아래로 교체:
```js
for (let year = 1; year <= years; year++) {
  const rate = rateOverrides[year] !== undefined ? rateOverrides[year] : annualRate;
  const monthlyRate = rate / 12;
  const yearStartBalance = balance;
  let yearContribution = 0;

  // ...월 루프는 그대로 두되, monthContribution 계산 후:
  if (compoundingFrequency === 'monthly') {
    balance = (balance + monthContribution) * (1 + monthlyRate);
  } else {
    balance += monthContribution;
  }
  // 월 루프 종료 후:
  if (compoundingFrequency === 'yearly') {
    balance += balance * rate;
  }
  // rows.push에 rate 필드 추가:
  rows.push({
    year,
    rate,
    contribution: yearContribution,
    profit: yearProfit,
    cumulativePrincipal,
    cumulativeProfit,
    totalAsset: balance
  });
}
```
(즉, 루프 안에서 이전에 `annualRate`를 참조하던 곳을 모두 `rate`로 바꾼다.)

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test tests/`
Expected: PASS (7 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/calc.js tests/calc.test.js
git commit -m "feat: add per-year rate overrides"
```

---

### Task 5: 물가상승률 반영(실질 자산) 및 summarize() 추가

**Files:**
- Modify: `src/calc.js`
- Modify: `tests/calc.test.js`

**Interfaces:**
- Consumes: Task 4의 `generateSchedule`
- Produces: `params`에 `inflationRate: number = 0` 추가. row에 `realTotalAsset` 필드 추가. 새 함수 `summarize(schedule)` → `{ finalAsset, realFinalAsset, totalPrincipal, totalProfit }`. 모듈이 `{ generateSchedule, summarize }`를 export.

- [ ] **Step 1: 실패하는 테스트 추가**

```js
test('물가상승률 반영: 실질 자산은 명목 자산을 (1+물가)^연차로 나눈 값', () => {
  const rows = generateSchedule({
    initialInvestment: 1000000,
    annualRate: 0.02,
    compoundingFrequency: 'yearly',
    years: 1,
    inflationRate: 0.02
  });
  assert.ok(Math.abs(rows[0].totalAsset - 1020000) < 1);
  assert.ok(Math.abs(rows[0].realTotalAsset - 1000000) < 1);
});

test('summarize: 마지막 연도 값을 요약한다', () => {
  const { summarize } = require('../src/calc.js');
  const rows = generateSchedule({
    initialInvestment: 1000000,
    contributionAmount: 100000,
    contributionFrequency: 'yearly',
    annualRate: 0.1,
    compoundingFrequency: 'yearly',
    years: 2
  });
  const summary = summarize(rows);
  assert.equal(summary.finalAsset, rows[1].totalAsset);
  assert.equal(summary.totalPrincipal, rows[1].cumulativePrincipal);
  assert.equal(summary.totalProfit, rows[1].cumulativeProfit);
  assert.equal(summary.realFinalAsset, rows[1].realTotalAsset);
});

test('summarize: 빈 스케줄은 0 값을 반환한다', () => {
  const { summarize } = require('../src/calc.js');
  const summary = summarize([]);
  assert.deepEqual(summary, { finalAsset: 0, realFinalAsset: 0, totalPrincipal: 0, totalProfit: 0 });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `node --test tests/`
Expected: FAIL — `rows[0].realTotalAsset`가 `undefined`, `summarize`가 export되지 않음

- [ ] **Step 3: 구현 확장**

destructuring에 `inflationRate = 0` 추가. `rows.push` 직전에:
```js
const inflationFactor = Math.pow(1 + inflationRate, year);
```
그리고 `rows.push`에 `realTotalAsset: balance / inflationFactor` 필드 추가.

파일 하단에 `summarize` 추가하고 반환 객체 수정:
```js
function summarize(schedule) {
  if (schedule.length === 0) {
    return { finalAsset: 0, realFinalAsset: 0, totalPrincipal: 0, totalProfit: 0 };
  }
  const last = schedule[schedule.length - 1];
  return {
    finalAsset: last.totalAsset,
    realFinalAsset: last.realTotalAsset,
    totalPrincipal: last.cumulativePrincipal,
    totalProfit: last.cumulativeProfit
  };
}

return { generateSchedule, summarize };
```
(마지막 `return` 문을 `{ generateSchedule }`에서 `{ generateSchedule, summarize }`로 교체)

- [ ] **Step 4: 테스트 통과 확인**

Run: `node --test tests/`
Expected: PASS (10 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/calc.js tests/calc.test.js
git commit -m "feat: add inflation-adjusted real asset value and summarize()"
```

---

### Task 6: 빌드 파이프라인 (template + styles + build.js → index.html)

**Files:**
- Create: `src/template.html`
- Create: `src/styles.css`
- Create: `src/ui.js` (빈 즉시실행함수로 시작, 다음 태스크에서 채움)
- Create: `scripts/build.js`

**Interfaces:**
- Consumes: `src/calc.js` (Task 1-5), `src/ui.js`
- Produces: 저장소 루트에 `index.html` 생성. placeholder 문자열: `/*STYLES*/`, `/*CALC_JS*/`, `/*UI_JS*/`

- [ ] **Step 1: 빈 UI 진입점 작성**

`src/ui.js`:
```js
(function () {
  // 다음 태스크에서 입력 패널 로직을 채운다.
})();
```

- [ ] **Step 2: 기본 스타일 작성**

`src/styles.css`:
```css
:root {
  --bg: #0f172a;
  --panel-bg: #1e293b;
  --text: #f8fafc;
  --muted: #94a3b8;
  --accent: #3b82f6;
  --accent-2: #22c55e;
  --border: #334155;
}
body[data-theme="light"] {
  --bg: #f8fafc;
  --panel-bg: #ffffff;
  --text: #0f172a;
  --muted: #475569;
  --accent: #2563eb;
  --accent-2: #16a34a;
  --border: #e2e8f0;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, "Segoe UI", sans-serif;
  background: var(--bg);
  color: var(--text);
}
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border);
}
.app-layout {
  display: flex;
  gap: 16px;
  padding: 16px;
}
.input-panel {
  flex: 0 0 280px;
  background: var(--panel-bg);
  border-radius: 8px;
  padding: 16px;
}
.results {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.field { margin-bottom: 14px; }
.field label { display: block; font-size: 13px; color: var(--muted); margin-bottom: 4px; }
.field input[type="range"] { width: 100%; }
.field input[type="number"], .field select {
  width: 100%;
  padding: 6px 8px;
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 4px;
}
.summary-cards {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.summary-card {
  background: var(--panel-bg);
  border-radius: 8px;
  padding: 12px 16px;
  flex: 1;
  min-width: 160px;
}
.summary-card .label { font-size: 12px; color: var(--muted); margin-bottom: 4px; }
.chart-section, .table-section {
  background: var(--panel-bg);
  border-radius: 8px;
  padding: 12px;
}
#schedule-table { width: 100%; border-collapse: collapse; }
#schedule-table th, #schedule-table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--border);
  text-align: right;
  font-size: 13px;
}
#schedule-table td[data-editable="rate"] { cursor: text; color: var(--accent); }
.mobile-only { display: none; }

@media (max-width: 720px) {
  .app-layout { flex-direction: column; }
  .input-panel {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    max-height: 70vh;
    overflow-y: auto;
    transform: translateY(100%);
    transition: transform 0.2s ease;
    z-index: 10;
    border-radius: 12px 12px 0 0;
  }
  .input-panel.open { transform: translateY(0); }
  .mobile-only { display: block; margin: 0 16px 8px; }
}
```

- [ ] **Step 3: HTML 템플릿 작성**

`src/template.html`:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>복리 투자 시뮬레이터</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
/*STYLES*/
</style>
</head>
<body data-theme="dark">
  <header class="app-header">
    <h1>복리 투자 시뮬레이터</h1>
    <button id="theme-toggle" type="button">다크 / 라이트</button>
  </header>

  <button id="input-panel-toggle" class="mobile-only" type="button">입력값 열기</button>

  <div class="app-layout">
    <aside id="input-panel" class="input-panel">
      <div class="field">
        <label for="initialInvestment">초기 투자금 (만원)</label>
        <input type="range" id="initialInvestment-range" min="0" max="100000" step="10">
        <input type="number" id="initialInvestment" min="0" step="10">
      </div>
      <div class="field">
        <label for="contributionAmount">정기 납입액 (만원)</label>
        <input type="range" id="contributionAmount-range" min="0" max="1000" step="1">
        <input type="number" id="contributionAmount" min="0" step="1">
      </div>
      <div class="field">
        <label for="contributionFrequency">납입 주기</label>
        <select id="contributionFrequency">
          <option value="monthly">매월</option>
          <option value="quarterly">분기</option>
          <option value="yearly">매년</option>
        </select>
      </div>
      <div class="field">
        <label for="contributionGrowthRate">납입액 연 증가율 (%)</label>
        <input type="range" id="contributionGrowthRate-range" min="0" max="20" step="0.5">
        <input type="number" id="contributionGrowthRate" min="0" step="0.5">
      </div>
      <div class="field">
        <label for="contributionStopYear">납입 중단 연차 (0=중단 없음)</label>
        <input type="number" id="contributionStopYear" min="0" step="1" value="0">
      </div>
      <div class="field">
        <label for="annualRate">연 수익률 (%)</label>
        <input type="range" id="annualRate-range" min="-20" max="30" step="0.1">
        <input type="number" id="annualRate" step="0.1">
      </div>
      <div class="field">
        <label for="compoundingFrequency">복리 주기</label>
        <select id="compoundingFrequency">
          <option value="monthly">월복리</option>
          <option value="yearly">연복리</option>
        </select>
      </div>
      <div class="field">
        <label for="years">투자 기간 (년)</label>
        <input type="range" id="years-range" min="1" max="50" step="1">
        <input type="number" id="years" min="1" step="1">
      </div>
      <div class="field">
        <label for="inflationRate">물가상승률 (%)</label>
        <input type="range" id="inflationRate-range" min="0" max="10" step="0.1">
        <input type="number" id="inflationRate" min="0" step="0.1">
      </div>
      <div class="field">
        <label><input type="checkbox" id="showReal"> 실질 가치로 보기</label>
      </div>
    </aside>

    <main class="results">
      <section class="summary-cards" id="summary-cards"></section>
      <section class="chart-section">
        <canvas id="asset-chart" height="120"></canvas>
      </section>
      <section class="chart-section">
        <canvas id="ratio-chart" height="120"></canvas>
      </section>
      <section class="table-section">
        <table id="schedule-table">
          <thead>
            <tr>
              <th>연도</th><th>수익률(%)</th><th>납입액</th><th>수익금</th><th>누적 원금</th><th>누적 수익</th><th>총자산</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </section>
    </main>
  </div>

<script>
/*CALC_JS*/
</script>
<script>
/*UI_JS*/
</script>
</body>
</html>
```

- [ ] **Step 4: 빌드 스크립트 작성**

`scripts/build.js`:
```js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const template = fs.readFileSync(path.join(root, 'src', 'template.html'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'src', 'styles.css'), 'utf8');
const calcJs = fs.readFileSync(path.join(root, 'src', 'calc.js'), 'utf8');
const uiJs = fs.readFileSync(path.join(root, 'src', 'ui.js'), 'utf8');

const output = template
  .replace('/*STYLES*/', styles)
  .replace('/*CALC_JS*/', calcJs)
  .replace('/*UI_JS*/', uiJs);

fs.writeFileSync(path.join(root, 'index.html'), output);
console.log('Built index.html');
```

- [ ] **Step 5: 빌드 실행 및 결과 확인**

Run: `node scripts/build.js`
Expected: `Built index.html` 출력, 저장소 루트에 `index.html` 생성됨

Run: `node --test tests/`
Expected: PASS (기존 10개 테스트, 빌드와 무관하게 계속 통과)

- [ ] **Step 6: 브라우저로 수동 확인**

`index.html`을 브라우저로 직접 열어 페이지가 깨지지 않고 표시되는지 확인 (아직 계산/렌더링 로직은 없으므로 빈 결과 영역만 보이는 것이 정상).

- [ ] **Step 7: 커밋**

```bash
git add src/template.html src/styles.css src/ui.js scripts/build.js index.html
git commit -m "feat: add build pipeline that assembles single-file index.html"
```

---

### Task 7: 입력 패널 연동 + 요약 카드 렌더링

**Files:**
- Modify: `src/ui.js`

**Interfaces:**
- Consumes: `CompoundCalc.generateSchedule(params)`, `CompoundCalc.summarize(schedule)` (Task 1-5)
- Produces: `recalculate()` 전역 함수(모듈 내부), 슬라이더/숫자 입력 동기화, `#summary-cards`에 최종자산/누적원금/누적수익 렌더링

- [ ] **Step 1: 구현**

`src/ui.js` 전체를 아래로 교체:
```js
(function () {
  const manwon = (v) => Math.round(v / 10000).toLocaleString('ko-KR');

  const syncedIds = [
    'initialInvestment', 'contributionAmount', 'contributionGrowthRate',
    'annualRate', 'years', 'inflationRate'
  ];

  let rateOverrides = {};

  function syncPair(id) {
    const range = document.getElementById(id + '-range');
    const number = document.getElementById(id);
    range.addEventListener('input', () => { number.value = range.value; recalculate(); });
    number.addEventListener('input', () => { range.value = number.value; recalculate(); });
  }

  function readInputs() {
    return {
      initialInvestment: Number(document.getElementById('initialInvestment').value) * 10000,
      contributionAmount: Number(document.getElementById('contributionAmount').value) * 10000,
      contributionFrequency: document.getElementById('contributionFrequency').value,
      contributionGrowthRate: Number(document.getElementById('contributionGrowthRate').value) / 100,
      contributionStopYear: Number(document.getElementById('contributionStopYear').value) || null,
      annualRate: Number(document.getElementById('annualRate').value) / 100,
      compoundingFrequency: document.getElementById('compoundingFrequency').value,
      years: Number(document.getElementById('years').value),
      rateOverrides,
      inflationRate: Number(document.getElementById('inflationRate').value) / 100
    };
  }

  function renderSummary(summary, showReal) {
    const el = document.getElementById('summary-cards');
    const finalAsset = showReal ? summary.realFinalAsset : summary.finalAsset;
    el.innerHTML =
      '<div class="summary-card"><div class="label">최종 자산</div><div>' + manwon(finalAsset) + '만원</div></div>' +
      '<div class="summary-card"><div class="label">누적 원금</div><div>' + manwon(summary.totalPrincipal) + '만원</div></div>' +
      '<div class="summary-card"><div class="label">누적 수익</div><div>' + manwon(summary.totalProfit) + '만원</div></div>';
  }

  function recalculate() {
    const inputs = readInputs();
    const schedule = CompoundCalc.generateSchedule(inputs);
    const summary = CompoundCalc.summarize(schedule);
    const showReal = document.getElementById('showReal').checked;
    renderSummary(summary, showReal);
  }

  syncedIds.forEach(syncPair);
  document.getElementById('contributionFrequency').addEventListener('change', recalculate);
  document.getElementById('contributionStopYear').addEventListener('input', recalculate);
  document.getElementById('compoundingFrequency').addEventListener('change', recalculate);
  document.getElementById('showReal').addEventListener('change', recalculate);

  document.getElementById('initialInvestment').value = 1000;
  document.getElementById('initialInvestment-range').value = 1000;
  document.getElementById('contributionAmount').value = 50;
  document.getElementById('contributionAmount-range').value = 50;
  document.getElementById('contributionGrowthRate').value = 0;
  document.getElementById('contributionGrowthRate-range').value = 0;
  document.getElementById('annualRate').value = 7;
  document.getElementById('annualRate-range').value = 7;
  document.getElementById('years').value = 20;
  document.getElementById('years-range').value = 20;
  document.getElementById('inflationRate').value = 2;
  document.getElementById('inflationRate-range').value = 2;

  recalculate();
})();
```

- [ ] **Step 2: 빌드 후 브라우저 수동 확인**

Run: `node scripts/build.js`

브라우저로 `index.html`을 열어:
- 초기 로드 시 요약 카드 3개(최종 자산/누적 원금/누적 수익)에 숫자가 표시되는지 확인
- 슬라이더를 움직이면 옆 숫자 입력창과 요약 카드가 함께 갱신되는지 확인
- 숫자 입력창에 직접 타이핑해도 슬라이더와 요약 카드가 갱신되는지 확인
- "실질 가치로 보기" 체크박스를 켜면 최종 자산 숫자가 바뀌는지 확인

- [ ] **Step 3: 커밋**

```bash
git add src/ui.js index.html
git commit -m "feat: wire input panel to calculation and render summary cards"
```

---

### Task 8: 자산 증가 그래프 + 원금/수익 비율 그래프

**Files:**
- Modify: `src/ui.js`

**Interfaces:**
- Consumes: Task 7의 `recalculate()`, `readInputs()`
- Produces: `#asset-chart`에 Chart.js 선 그래프, `#ratio-chart`에 도넛 그래프 렌더링

- [ ] **Step 1: 구현**

`src/ui.js`에서 `let rateOverrides = {};` 아래에 추가:
```js
let assetChart = null;
let ratioChart = null;
```

`renderSummary` 함수 뒤에 아래 두 함수 추가:
```js
function renderAssetChart(schedule, showReal) {
  const ctx = document.getElementById('asset-chart');
  const data = {
    labels: schedule.map((r) => r.year + '년'),
    datasets: [{
      label: showReal ? '실질 총자산 (만원)' : '총자산 (만원)',
      data: schedule.map((r) => Math.round((showReal ? r.realTotalAsset : r.totalAsset) / 10000)),
      borderColor: '#3b82f6',
      fill: false
    }]
  };
  if (assetChart) {
    assetChart.data = data;
    assetChart.update();
  } else {
    assetChart = new Chart(ctx, { type: 'line', data });
  }
}

function renderRatioChart(summary) {
  const ctx = document.getElementById('ratio-chart');
  const data = {
    labels: ['누적 원금', '누적 수익'],
    datasets: [{
      data: [Math.round(summary.totalPrincipal / 10000), Math.round(summary.totalProfit / 10000)],
      backgroundColor: ['#3b82f6', '#22c55e']
    }]
  };
  if (ratioChart) {
    ratioChart.data = data;
    ratioChart.update();
  } else {
    ratioChart = new Chart(ctx, { type: 'doughnut', data });
  }
}
```

`recalculate()` 함수를 아래로 교체:
```js
function recalculate() {
  const inputs = readInputs();
  const schedule = CompoundCalc.generateSchedule(inputs);
  const summary = CompoundCalc.summarize(schedule);
  const showReal = document.getElementById('showReal').checked;
  renderSummary(summary, showReal);
  renderAssetChart(schedule, showReal);
  renderRatioChart(summary);
}
```

- [ ] **Step 2: 빌드 후 브라우저 수동 확인**

Run: `node scripts/build.js`

브라우저에서:
- 자산 증가 선 그래프가 연도별로 우상향하는지 확인
- 원금/수익 도넛 그래프가 두 조각으로 나뉘어 표시되는지 확인
- 투자 기간(years)을 바꾸면 그래프의 x축 길이가 함께 바뀌는지 확인
- "실질 가치로 보기"를 토글하면 선 그래프 값이 바뀌는지 확인

- [ ] **Step 3: 커밋**

```bash
git add src/ui.js index.html
git commit -m "feat: render asset growth line chart and principal/profit ratio chart"
```

---

### Task 9: 연도별 상세 테이블 + 수익률 개별 오버라이드

**Files:**
- Modify: `src/ui.js`

**Interfaces:**
- Consumes: Task 8의 `recalculate()`
- Produces: `#schedule-table tbody`에 연도별 행 렌더링, 수익률 셀 편집 시 `rateOverrides`를 갱신하고 재계산

- [ ] **Step 1: 구현**

`src/ui.js`에서 `renderRatioChart` 함수 뒤에 추가:
```js
function renderTable(schedule) {
  const tbody = document.querySelector('#schedule-table tbody');
  tbody.innerHTML = schedule.map((r) =>
    '<tr data-year="' + r.year + '">' +
      '<td>' + r.year + '</td>' +
      '<td data-editable="rate" contenteditable="true">' + (r.rate * 100).toFixed(1) + '</td>' +
      '<td>' + manwon(r.contribution) + '</td>' +
      '<td>' + manwon(r.profit) + '</td>' +
      '<td>' + manwon(r.cumulativePrincipal) + '</td>' +
      '<td>' + manwon(r.cumulativeProfit) + '</td>' +
      '<td>' + manwon(r.totalAsset) + '</td>' +
    '</tr>'
  ).join('');

  tbody.querySelectorAll('td[data-editable="rate"]').forEach((cell) => {
    cell.addEventListener('blur', () => {
      const year = Number(cell.closest('tr').dataset.year);
      const value = Number(cell.textContent);
      if (!Number.isNaN(value)) {
        rateOverrides[year] = value / 100;
        recalculate();
      }
    });
  });
}
```

`recalculate()`의 마지막 줄 `renderRatioChart(summary);` 다음에 추가:
```js
renderTable(schedule);
```

- [ ] **Step 2: 빌드 후 브라우저 수동 확인**

Run: `node scripts/build.js`

브라우저에서:
- 연도별 테이블에 설정한 투자 기간만큼 행이 표시되는지 확인
- 특정 연도의 "수익률(%)" 셀을 클릭해서 값을 바꾼 뒤 다른 곳을 클릭(blur)하면, 해당 연도부터 이후 자산/수익 값이 재계산되는지 확인
- 재계산 후 요약 카드와 그래프도 함께 갱신되는지 확인

- [ ] **Step 3: 커밋**

```bash
git add src/ui.js index.html
git commit -m "feat: render year-by-year table with editable rate overrides"
```

---

### Task 10: 다크/라이트 테마 토글 + 모바일 바텀시트

**Files:**
- Modify: `src/ui.js`

**Interfaces:**
- Consumes: `src/template.html`의 `#theme-toggle`, `#input-panel-toggle`, `body[data-theme]` (Task 6에서 이미 마크업/CSS 존재)
- Produces: 테마 전환 클릭 핸들러, 모바일 입력 패널 열기/닫기 핸들러

- [ ] **Step 1: 구현**

`src/ui.js`의 `recalculate();` 호출(파일 마지막 줄) 바로 위에 추가:
```js
document.getElementById('theme-toggle').addEventListener('click', () => {
  const body = document.body;
  body.dataset.theme = body.dataset.theme === 'dark' ? 'light' : 'dark';
});

document.getElementById('input-panel-toggle').addEventListener('click', () => {
  document.getElementById('input-panel').classList.toggle('open');
});
```

- [ ] **Step 2: 빌드 후 브라우저 수동 확인**

Run: `node scripts/build.js`

브라우저 개발자 도구에서:
- 데스크톱 너비: 상단 "다크 / 라이트" 버튼을 누르면 배경/글자색이 라이트 테마로 전환되는지 확인, 다시 누르면 네이비 다크로 복귀하는지 확인
- 뷰포트를 720px 이하 모바일 크기로 좁혔을 때: 좌측 입력 패널이 사라지고 "입력값 열기" 버튼이 나타나는지 확인
- 그 버튼을 누르면 입력 패널이 하단에서 올라오는 바텀시트로 열리는지, 다시 누르면 닫히는지 확인
- 모바일 크기에서도 그래프/테이블이 가로로 잘리지 않고 세로로 쌓여 보이는지 확인

- [ ] **Step 3: 커밋**

```bash
git add src/ui.js index.html
git commit -m "feat: add dark/light theme toggle and mobile bottom sheet input panel"
```

---

### Task 11: 최종 통합 검증

**Files:**
- 없음 (검증 전용 태스크, 코드 변경 없음)

**Interfaces:**
- Consumes: Task 1-10에서 완성된 `index.html` 전체

- [ ] **Step 1: 전체 계산 테스트 재실행**

Run: `node --test tests/`
Expected: PASS (모든 계산 로직 테스트, 총 10개)

- [ ] **Step 2: 빌드 재실행**

Run: `node scripts/build.js`
Expected: `Built index.html` 출력

- [ ] **Step 3: 브라우저 골든 패스 검증**

`index.html`을 브라우저로 열고, 기본값(초기 투자금 1,000만원, 월 납입 50만원, 연 수익률 7%, 20년, 물가상승률 2%) 상태에서:
- 요약 카드, 자산 그래프, 비율 그래프, 연도별 테이블이 모두 오류 없이 렌더링되는지 확인
- 값을 하나씩 바꿔가며 결과가 즉시 갱신되는지 확인

- [ ] **Step 4: 경계 케이스 검증**

다음 각각을 입력해보고 오류(빈 화면, NaN 표시, 콘솔 에러) 없이 동작하는지 확인:
- 정기 납입액 0원
- 납입 중단 연차를 투자 기간보다 짧게 설정
- 연 수익률에 음수 입력 (예: -5%)
- 연도별 테이블에서 특정 연도 수익률을 직접 수정
- "실질 가치로 보기" 토글 on/off

- [ ] **Step 5: 모바일 뷰 검증**

브라우저 개발자 도구로 모바일 뷰포트(예: 375px 너비)로 전환한 뒤:
- 레이아웃이 깨지지 않고 세로로 쌓이는지
- 입력 패널 바텀시트가 정상적으로 열리고 닫히는지
- 다크/라이트 토글이 모바일에서도 동작하는지

- [ ] **Step 6: 최종 커밋**

검증 중 문제를 발견해 수정했다면:
```bash
git add -A
git commit -m "fix: address issues found in final verification pass"
```
문제가 없었다면 커밋할 변경사항이 없으므로 이 단계는 생략한다.
