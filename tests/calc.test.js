const test = require('node:test');
const assert = require('node:assert/strict');
const { generateSchedule, summarize } = require('../src/calc.js');

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

test('월복리에서도 연도별 수익률 오버라이드가 해당 연도에만 적용된다', () => {
  const rows = generateSchedule({
    initialInvestment: 1000,
    annualRate: 0.12,
    compoundingFrequency: 'monthly',
    years: 2,
    rateOverrides: { 2: 0.24 }
  });
  const expectedYear1 = 1000 * Math.pow(1 + 0.12 / 12, 12);
  const expectedYear2 = expectedYear1 * Math.pow(1 + 0.24 / 12, 12);
  assert.ok(Math.abs(rows[0].totalAsset - expectedYear1) < 0.01);
  assert.ok(Math.abs(rows[1].totalAsset - expectedYear2) < 0.01);
  assert.equal(rows[0].rate, 0.12);
  assert.equal(rows[1].rate, 0.24);
});

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
  const summary = summarize([]);
  assert.deepEqual(summary, { finalAsset: 0, realFinalAsset: 0, totalPrincipal: 0, totalProfit: 0 });
});
