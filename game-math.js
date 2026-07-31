(function (root, factory) {
  "use strict";

  var api = factory();
  if (typeof module === "object" && module && module.exports) {
    module.exports = api;
  }
  root.StellarMath = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var MAX_GAME_NUMBER = 1e300;
  var MAX_GAME_COUNT = 9007199254740991;
  var LOG_MAX_GAME_NUMBER = Math.log(MAX_GAME_NUMBER);

  function isFiniteNumber(value) {
    return typeof value === "number" && isFinite(value);
  }

  function clampGameNumber(value, fallback) {
    var numeric = Number(value);
    var safeFallback = arguments.length > 1 ? Number(fallback) : 0;
    if (!isFiniteNumber(safeFallback) || safeFallback < 0) safeFallback = 0;
    if (numeric === Infinity) return MAX_GAME_NUMBER;
    if (!isFiniteNumber(numeric)) return safeFallback;
    if (numeric <= 0) return 0;
    return Math.min(numeric, MAX_GAME_NUMBER);
  }

  function clampGameCount(value) {
    var numeric = Math.floor(Number(value));
    if (numeric === Infinity) return MAX_GAME_COUNT;
    if (!isFiniteNumber(numeric) || numeric <= 0) return 0;
    return Math.min(numeric, MAX_GAME_COUNT);
  }

  function safeAdd() {
    var total = 0;
    for (var index = 0; index < arguments.length; index += 1) {
      var value = clampGameNumber(arguments[index]);
      if (total >= MAX_GAME_NUMBER - value) return MAX_GAME_NUMBER;
      total += value;
    }
    return total;
  }

  function safeMultiply() {
    var result = 1;
    if (arguments.length === 0) return result;
    for (var index = 0; index < arguments.length; index += 1) {
      var value = clampGameNumber(arguments[index]);
      if (value === 0) return 0;
      if (result >= MAX_GAME_NUMBER / value) return MAX_GAME_NUMBER;
      result *= value;
    }
    return clampGameNumber(result);
  }

  function safePow(base, exponent) {
    var safeBase = clampGameNumber(base);
    var safeExponent = clampGameNumber(exponent);
    if (safeExponent === 0) return 1;
    if (safeBase === 0) return 0;
    if (safeBase === 1) return 1;
    if (Math.log(safeBase) * safeExponent >= LOG_MAX_GAME_NUMBER) {
      return MAX_GAME_NUMBER;
    }
    return clampGameNumber(Math.pow(safeBase, safeExponent));
  }

  function softCapGameNumber(value, start, power) {
    var safeValue = clampGameNumber(value);
    var safeStart = Math.max(1, clampGameNumber(start, 1));
    var safePower = Math.max(0.01, Math.min(1, Number(power) || 1));
    if (safeValue <= safeStart) return safeValue;
    return safeMultiply(
      safeStart,
      safePow(safeValue / safeStart, safePower)
    );
  }

  function expandSoftCappedGameNumber(value, start, power) {
    var safeValue = clampGameNumber(value);
    var safeStart = Math.max(1, clampGameNumber(start, 1));
    var safePower = Math.max(0.01, Math.min(1, Number(power) || 1));
    if (safeValue <= safeStart) return safeValue;
    return safeMultiply(
      safeStart,
      safePow(safeValue / safeStart, 1 / safePower)
    );
  }

  function trimDecimalPadding(text) {
    return text.indexOf(".") >= 0 ? text.replace(/\.?0+$/, "") : text;
  }

  function formatNumber(value, precision) {
    var numeric = Number(value);
    var safePrecision = typeof precision === "number" ? precision : 2;
    if (numeric === Infinity) numeric = MAX_GAME_NUMBER;
    if (!isFiniteNumber(numeric)) return "0";

    var sign = numeric < 0 ? "-" : "";
    var absolute = Math.min(Math.abs(numeric), MAX_GAME_NUMBER);
    if (absolute < 1000) {
      var digits = absolute >= 100 ? 0 : absolute >= 10 ? 1 : safePrecision;
      return sign + trimDecimalPadding(absolute.toFixed(digits));
    }

    if (absolute >= 1e27) {
      var exponent = Math.floor(
        Math.log(absolute) / Math.LN10 + 1e-12
      );
      var mantissa = absolute / Math.pow(10, exponent);
      var exponentDigits = mantissa >= 100 ? 0 : mantissa >= 10 ? 1 : 2;
      return (
        sign +
        trimDecimalPadding(mantissa.toFixed(exponentDigits)) +
        "e" +
        exponent
      );
    }

    var units = [
      [1e24, "Y"],
      [1e21, "Z"],
      [1e18, "E"],
      [1e15, "P"],
      [1e12, "T"],
      [1e9, "B"],
      [1e6, "M"],
      [1e3, "K"],
    ];
    var unit = units[units.length - 1];
    for (var index = 0; index < units.length; index += 1) {
      if (absolute >= units[index][0]) {
        unit = units[index];
        break;
      }
    }
    var scaled = absolute / unit[0];
    var scaledDigits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
    return sign + trimDecimalPadding(scaled.toFixed(scaledDigits)) + unit[1];
  }

  function geometricSeriesCost(baseCost, growth, owned, amount, multiplier) {
    var safeAmount = clampGameCount(amount);
    if (safeAmount <= 0) return 0;

    var safeGrowth = Math.max(1, Number(growth) || 1);
    var firstCost = safeMultiply(
      baseCost,
      safePow(safeGrowth, clampGameCount(owned)),
      arguments.length > 4 ? multiplier : 1
    );
    if (firstCost >= MAX_GAME_NUMBER) return MAX_GAME_NUMBER;
    if (safeGrowth === 1) return safeMultiply(firstCost, safeAmount);

    var growthPower = safePow(safeGrowth, safeAmount);
    if (growthPower >= MAX_GAME_NUMBER) return MAX_GAME_NUMBER;
    var seriesFactor = (growthPower - 1) / (safeGrowth - 1);
    return safeMultiply(firstCost, seriesFactor);
  }

  function maxAffordableGeometric(
    baseCost,
    growth,
    available,
    owned,
    multiplier
  ) {
    var safeAvailable = clampGameNumber(available);
    var safeGrowth = Math.max(1, Number(growth) || 1);
    var safeOwned = clampGameCount(owned);
    var safeMultiplier = arguments.length > 4 ? multiplier : 1;
    var firstCost = safeMultiply(
      baseCost,
      safePow(safeGrowth, safeOwned),
      safeMultiplier
    );
    if (
      firstCost <= 0 ||
      firstCost >= MAX_GAME_NUMBER ||
      safeAvailable < firstCost
    ) {
      return 0;
    }
    if (safeGrowth === 1) {
      return clampGameCount(Math.floor(safeAvailable / firstCost));
    }

    var argument =
      1 + (safeAvailable * (safeGrowth - 1)) / firstCost;
    var raw = Math.floor(Math.log(argument) / Math.log(safeGrowth));
    var amount = clampGameCount(raw);
    var correctionSteps = 0;
    while (correctionSteps < 8) {
      var nextCost = geometricSeriesCost(
        baseCost,
        safeGrowth,
        safeOwned,
        amount + 1,
        safeMultiplier
      );
      if (nextCost >= MAX_GAME_NUMBER || nextCost > safeAvailable) break;
      amount += 1;
      correctionSteps += 1;
    }
    correctionSteps = 0;
    while (
      amount > 0 &&
      correctionSteps < 8 &&
      geometricSeriesCost(
        baseCost,
        safeGrowth,
        safeOwned,
        amount,
        safeMultiplier
      ) > safeAvailable
    ) {
      amount -= 1;
      correctionSteps += 1;
    }
    return amount;
  }

  function countFixedIntervalEvents(nextAt, endAt, interval, maxEvents) {
    var safeNextAt = Math.max(0, Number(nextAt) || 0);
    var safeEndAt = Math.max(0, Number(endAt) || 0);
    var safeInterval = Math.max(1, Number(interval) || 1);
    var safeMaxEvents = Math.max(0, clampGameCount(maxEvents));
    if (safeMaxEvents === 0 || safeNextAt > safeEndAt) {
      return { count: 0, nextAt: safeNextAt };
    }
    var dueCount = Math.floor((safeEndAt - safeNextAt) / safeInterval) + 1;
    var count = Math.min(safeMaxEvents, clampGameCount(dueCount));
    return {
      count: count,
      nextAt: safeNextAt + count * safeInterval
    };
  }

  return {
    MAX_GAME_NUMBER: MAX_GAME_NUMBER,
    MAX_GAME_COUNT: MAX_GAME_COUNT,
    isFiniteNumber: isFiniteNumber,
    clampGameNumber: clampGameNumber,
    clampGameCount: clampGameCount,
    safeAdd: safeAdd,
    safeMultiply: safeMultiply,
    safePow: safePow,
    softCapGameNumber: softCapGameNumber,
    expandSoftCappedGameNumber: expandSoftCappedGameNumber,
    formatNumber: formatNumber,
    geometricSeriesCost: geometricSeriesCost,
    maxAffordableGeometric: maxAffordableGeometric,
    countFixedIntervalEvents: countFixedIntervalEvents
  };
});
