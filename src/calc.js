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

  return { generateSchedule };
});
