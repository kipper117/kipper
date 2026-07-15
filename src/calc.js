(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
  } else {
    root.CompoundCalc = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  function generateSchedule(params) {
    const {
      initialInvestment,
      contributionAmount = 0,
      contributionFrequency = 'monthly',
      contributionGrowthRate = 0,
      contributionStopYear = null,
      annualRate,
      compoundingFrequency,
      years,
      inflationRate = 0,
      rateOverrides = {}
    } = params;

    const contributionMonths = { monthly: 1, quarterly: 3, yearly: 12 }[contributionFrequency];
    const rows = [];
    let balance = initialInvestment;
    let cumulativePrincipal = initialInvestment;
    let cumulativeProfit = 0;

    for (let year = 1; year <= years; year++) {
      const rate = rateOverrides[year] !== undefined ? rateOverrides[year] : annualRate;
      const monthlyRate = rate / 12;
      const yearStartBalance = balance;
      let yearContribution = 0;

      const contributionActive = contributionStopYear == null || year <= contributionStopYear;
      const currentContribution = contributionActive
        ? contributionAmount * Math.pow(1 + contributionGrowthRate, year - 1)
        : 0;

      for (let month = 1; month <= 12; month++) {
        let monthContribution = 0;
        if (currentContribution > 0 && month % contributionMonths === 0) {
          monthContribution = currentContribution;
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
        balance += balance * rate;
      }

      const yearProfit = balance - yearStartBalance - yearContribution;
      cumulativeProfit += yearProfit;

      const inflationFactor = Math.pow(1 + inflationRate, year);

      rows.push({
        year,
        rate,
        contribution: yearContribution,
        profit: yearProfit,
        cumulativePrincipal,
        cumulativeProfit,
        totalAsset: balance,
        realTotalAsset: balance / inflationFactor
      });
    }

    return rows;
  }

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
});
