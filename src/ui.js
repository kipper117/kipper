(function () {
  const manwon = (v) => Math.round(v / 10000).toLocaleString('ko-KR');

  const syncedIds = [
    'initialInvestment', 'contributionAmount', 'contributionGrowthRate',
    'annualRate', 'years', 'inflationRate'
  ];

  let rateOverrides = {};
  let assetChart = null;
  let ratioChart = null;

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

  function recalculate() {
    const inputs = readInputs();
    const schedule = CompoundCalc.generateSchedule(inputs);
    const summary = CompoundCalc.summarize(schedule);
    const showReal = document.getElementById('showReal').checked;
    renderSummary(summary, showReal);
    renderAssetChart(schedule, showReal);
    renderRatioChart(summary);
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
