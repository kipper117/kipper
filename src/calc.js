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
