(function () {
  const eok = (v) => (v / 100000000).toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
      '<div class="summary-card"><div class="label">최종 자산</div><div>' + eok(finalAsset) + '억원</div></div>' +
      '<div class="summary-card"><div class="label">누적 원금</div><div>' + eok(summary.totalPrincipal) + '억원</div></div>' +
      '<div class="summary-card"><div class="label">누적 수익</div><div>' + eok(summary.totalProfit) + '억원</div></div>';
  }

  function renderAssetChart(schedule, showReal) {
    const ctx = document.getElementById('asset-chart');
    const data = {
      labels: schedule.map((r) => r.year + '년'),
      datasets: [{
        label: showReal ? '실질 총자산 (억원)' : '총자산 (억원)',
        data: schedule.map((r) => Number(((showReal ? r.realTotalAsset : r.totalAsset) / 100000000).toFixed(2))),
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
        data: [Number((summary.totalPrincipal / 100000000).toFixed(2)), Number((summary.totalProfit / 100000000).toFixed(2))],
        backgroundColor: ['#3b82f6', '#22c55e']
      }]
    };
    const options = {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      plugins: {
        datalabels: {
          color: '#ffffff',
          font: { weight: 'bold' },
          formatter: (value) => value.toLocaleString('ko-KR') + '억원'
        }
      }
    };
    if (ratioChart) {
      ratioChart.data = data;
      ratioChart.update();
    } else {
      ratioChart = new Chart(ctx, { type: 'doughnut', data, options, plugins: [ChartDataLabels] });
    }
  }

  function renderTable(schedule) {
    const tbody = document.querySelector('#schedule-table tbody');
    tbody.innerHTML = schedule.map((r) =>
      '<tr data-year="' + r.year + '">' +
        '<td>' + r.year + '</td>' +
        '<td data-editable="rate" contenteditable="true">' + (r.rate * 100).toFixed(1) + '</td>' +
        '<td>' + eok(r.contribution) + '</td>' +
        '<td>' + eok(r.profit) + '</td>' +
        '<td>' + eok(r.cumulativePrincipal) + '</td>' +
        '<td>' + eok(r.cumulativeProfit) + '</td>' +
        '<td>' + eok(r.totalAsset) + '</td>' +
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

  function recalculate() {
    const inputs = readInputs();
    const schedule = CompoundCalc.generateSchedule(inputs);
    const summary = CompoundCalc.summarize(schedule);
    const showReal = document.getElementById('showReal').checked;
    renderSummary(summary, showReal);
    renderAssetChart(schedule, showReal);
    renderRatioChart(summary);
    renderTable(schedule);
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

  document.getElementById('theme-toggle').addEventListener('click', () => {
    const body = document.body;
    body.dataset.theme = body.dataset.theme === 'dark' ? 'light' : 'dark';
  });

  document.getElementById('input-panel-toggle').addEventListener('click', () => {
    document.getElementById('input-panel').classList.toggle('open');
  });

  document.querySelectorAll('.tab-button').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-simulate').hidden = btn.dataset.tab !== 'simulate';
      document.getElementById('tab-goal').hidden = btn.dataset.tab !== 'goal';
    });
  });

  function manwonLabel(v) {
    return Math.round(v / 10000).toLocaleString('ko-KR') + '만원';
  }

  function findYearsToGoal(inputs, contributionAmount, goalWon, showReal) {
    for (let year = 1; year <= 100; year++) {
      const schedule = CompoundCalc.generateSchedule(Object.assign({}, inputs, { years: year, contributionAmount }));
      const last = schedule[schedule.length - 1];
      const asset = showReal ? last.realTotalAsset : last.totalAsset;
      if (asset >= goalWon) return year;
    }
    return null;
  }

  function renderGoalRace(baseYears, boostedYears, boostWon, baseContribution) {
    const el = document.getElementById('goal-race');
    if (!baseYears && !boostedYears) {
      el.innerHTML = '';
      return;
    }

    const raceMax = Math.max(baseYears || 100, boostedYears || 100, 1);
    const baseDuration = baseYears ? Math.max(0.4, 2 * (baseYears / raceMax)) : 2;
    const boostDuration = boostedYears ? Math.max(0.4, 2 * (boostedYears / raceMax)) : 2;

    el.innerHTML =
      '<div class="race-lane">' +
        '<div class="race-label">현재 납입액 (' + manwonLabel(baseContribution) + ') — ' + (baseYears ? baseYears + '년' : '100년 이내 미도달') + '</div>' +
        '<div class="race-track"><div class="race-marker" id="race-marker-base" style="transition-duration:' + baseDuration + 's"></div></div>' +
      '</div>' +
      '<div class="race-lane boost">' +
        '<div class="race-label">납입액 +' + (boostWon / 10000) + '만원 (' + manwonLabel(baseContribution + boostWon) + ') — ' + (boostedYears ? boostedYears + '년' : '100년 이내 미도달') + '</div>' +
        '<div class="race-track"><div class="race-marker" id="race-marker-boost" style="transition-duration:' + boostDuration + 's"></div></div>' +
      '</div>';

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (baseYears) document.getElementById('race-marker-base').classList.add('go');
        if (boostedYears) document.getElementById('race-marker-boost').classList.add('go');
      });
    });
  }

  document.getElementById('goal-calculate').addEventListener('click', () => {
    const inputs = readInputs();
    const goalWon = Number(document.getElementById('goalAmount').value) * 100000000;
    const boostWon = Number(document.getElementById('contributionBoost').value) * 10000;
    const showReal = document.getElementById('showReal').checked;

    const baseYears = findYearsToGoal(inputs, inputs.contributionAmount, goalWon, showReal);
    const boostedYears = findYearsToGoal(inputs, inputs.contributionAmount + boostWon, goalWon, showReal);

    const resultEl = document.getElementById('goal-result');
    if (baseYears) {
      resultEl.textContent = '목표 금액 도달까지 약 ' + baseYears + '년이 걸립니다.';
      if (boostedYears && boostedYears < baseYears) {
        resultEl.textContent += ' 납입액을 ' + (boostWon / 10000) + '만원 늘리면 ' + boostedYears + '년으로 ' + (baseYears - boostedYears) + '년 단축됩니다.';
      } else if (boostedYears && boostedYears === baseYears) {
        resultEl.textContent += ' 납입액을 늘려도 도달 기간은 동일합니다.';
      }
    } else {
      resultEl.textContent = '100년 이내에는 목표 금액에 도달하지 못합니다. 조건을 조정해 보세요.';
    }

    renderGoalRace(baseYears, boostedYears, boostWon, inputs.contributionAmount);
  });

  recalculate();
})();
