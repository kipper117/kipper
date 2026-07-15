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
