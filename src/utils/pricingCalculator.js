/**
 * MahattaART Pricing Calculator
 *
 * Formula (from admin documentation):
 *   companyMargin = rate * (1 + companyMarginPct / 100)
 *   mrp           = rate * (1 + mrpMarkupPct / 100)
 *   displayPrice  = rate * (1 + displayMarkupPct / 100)
 *   maxDisplayPrice = rate * (1 + maxDisplayMarkupPct / 100)
 *
 * All results are rounded to 2 decimal places.
 */

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Calculate all price tiers from a base rate and markup percentages.
 *
 * @param {number} rate - Base cost/rate (e.g. per sq inch, per unit)
 * @param {object} markups - { companyMarginPct, mrpPct, displayPct, maxDisplayPct }
 * @returns {{ companyMargin, mrp, displayPrice, maxDisplayPrice }}
 */
const calculatePrices = (rate, markups = {}) => {
  const {
    companyMarginPct = 0,
    mrpPct = 0,
    displayPct = 0,
    maxDisplayPct = 0,
  } = markups;

  return {
    rate: round2(rate),
    companyMargin: round2(rate * (1 + companyMarginPct / 100)),
    mrp: round2(rate * (1 + mrpPct / 100)),
    displayPrice: round2(rate * (1 + displayPct / 100)),
    maxDisplayPrice: round2(rate * (1 + maxDisplayPct / 100)),
  };
};

/**
 * Calculate paper cost per sq inch from roll specs.
 *
 * @param {number} rollPrice - Total cost of roll
 * @param {number} rollHeightInches
 * @param {number} rollWidthInches
 * @param {number} inkCostPerSqIn
 * @param {number} printCostPerSqIn
 * @returns {{ totalSqIn, costPerSqIn, inkCostPerSqIn, printCostPerSqIn, totalCostPerSqIn }}
 */
const calculatePaperCost = (rollPrice, rollHeightInches, rollWidthInches, inkCostPerSqIn = 0, printCostPerSqIn = 0) => {
  const totalSqIn = rollHeightInches * rollWidthInches;
  if (totalSqIn === 0) return null;

  const costPerSqIn = round2(rollPrice / totalSqIn);
  const totalCostPerSqIn = round2(costPerSqIn + inkCostPerSqIn + printCostPerSqIn);

  return { totalSqIn, costPerSqIn, inkCostPerSqIn, printCostPerSqIn, totalCostPerSqIn };
};

/**
 * Calculate price for a given print size using paper cost.
 *
 * @param {number} widthInches
 * @param {number} heightInches
 * @param {number} totalCostPerSqIn
 * @param {object} markups
 */
const calculateSizePricing = (widthInches, heightInches, totalCostPerSqIn, markups = {}) => {
  const sqIn = widthInches * heightInches;
  const rate = round2(sqIn * totalCostPerSqIn);
  return { size: `${widthInches}×${heightInches}`, sqIn, ...calculatePrices(rate, markups) };
};

module.exports = { calculatePrices, calculatePaperCost, calculateSizePricing };
