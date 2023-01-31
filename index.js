/* eslint-disable no-unused-vars */
const jsonLogic = require('json-logic-js');
const moment = require('moment');
const { isArray, isObject, isEqual, isEmpty, get } = require('lodash');
const { compareLocationOneOf, compareLocationNotOneOf } = require('./locationHelpers');
const operator = {
  equal: '==',
  notEqual: '!=',
};

// NOTE: copy from frontend until it gets moved to common package
jsonLogic.add_operation('plus', function (a, b) {
  let d = new Date();
  b = b.toLowerCase();
  if (b === 'day') {
    // To add Days
    d.setDate(d.getDate() + Number(a));
  } else if (b === 'month') {
    // To add Months
    d.setMonth(d.getMonth() + Number(a));
  } else if (b === 'year') {
    // To add Years
    d.setFullYear(d.getFullYear() + Number(a));
  }

  const userTimezoneOffset = d.getTimezoneOffset() * 60000;
  const d2 = new Date(d.getTime() - userTimezoneOffset);
  d2.setSeconds(0);
  d2.setMilliseconds(0);
  return d2;
});

jsonLogic.add_operation('minus', function (a, b) {
  let d = new Date();
  b = b.toLowerCase();
  if (b === 'day') {
    // To sub Days
    d.setDate(d.getDate() - Number(a));
  } else if (b === 'month') {
    // To sub Months
    d.setMonth(d.getMonth() - Number(a));
  } else if (b === 'year') {
    // To sub Years
    d.setFullYear(d.getFullYear() - Number(a));
  }

  const userTimezoneOffset = d.getTimezoneOffset() * 60000;
  const d2 = new Date(d.getTime() - userTimezoneOffset);
  d2.setSeconds(0);
  d2.setMilliseconds(0);
  return d2;
});

jsonLogic.add_operation('plusDate', function (a, b) {
  let d = new Date();
  b = b.toLowerCase();
  if (b === 'day') {
    // To add Days
    d.setDate(d.getDate() + Number(a));
  } else if (b === 'month') {
    // To add Months
    d.setMonth(d.getMonth() + Number(a));
  } else if (b === 'year') {
    // To add Years
    d.setFullYear(d.getFullYear() + Number(a));
  }

  d.setSeconds(0);
  d.setMilliseconds(0);
  d.setMinutes(0);
  d = moment(d, 'DD-MMM-YYYY').format('DD-MMM-YYYY');
  return moment.utc(d);
});

jsonLogic.add_operation('minusDate', function (a, b) {
  let d = new Date();
  b = b.toLowerCase();
  if (b === 'day') {
    // To sub Days
    d.setDate(d.getDate() - Number(a));
  } else if (b === 'month') {
    // To sub Months
    d.setMonth(d.getMonth() - Number(a));
  } else if (b === 'year') {
    // To sub Years
    d.setFullYear(d.getFullYear() - Number(a));
  }

  d.setSeconds(0);
  d.setMilliseconds(0);
  d.setMinutes(0);
  d = moment(d, 'DD-MMM-YYYY').format('DD-MMM-YYYY');
  return moment.utc(d);
});

jsonLogic.add_operation('equalOneOf', function (a, b) {
  if (isObject(a) && isArray(b) && a && b.length) {
    const result = compareLocationSingleManyOneOfFullPath(a, b);
    return result;
  } else if (!a && b && b.length) {
    return false;
  } else if (a && (!b || !b.length)) {
    return false;
  }
});

jsonLogic.add_operation('oneOf', function (a, b) {
  return oneOfCompare(a, b, operator.equal);
});

jsonLogic.add_operation('notOneOf', function (a, b) {
  return oneOfCompare(a, b, operator.notEqual);
});

jsonLogic.add_operation('oneOfAndExtract', function (a, b) {
  return oneOfCompare(a, b, operator.equal, true);
});

jsonLogic.add_operation('notOneOfAndExtract', function (a, b) {
  return oneOfCompare(a, b, operator.notEqual, true);
});

jsonLogic.add_operation('>=', function (a, b) {
  if (isArray(a)) {
    const listExists = compareMultipleSingleValue(a, b, '>=');
    if (listExists.length) {
      return {
        isValid: true,
        matches: listExists,
      };
    }
    return false;
  } else {
    let x = a;
    let y = b;
    if (a === null) {
      return false;
    }
    if (isDate(a) && isDate(b) && isNaN(a) && isNaN(b)) {
      x = new Date(x).valueOf();
      y = new Date(y).valueOf();
    }
    return x >= y;
  }
});

jsonLogic.add_operation('>', function (a, b) {
  if (isArray(a)) {
    const listExists = compareMultipleSingleValue(a, b, '>');
    if (listExists.length) {
      return {
        isValid: true,
        matches: listExists,
      };
    }
    return false;
  } else {
    let x = a;
    let y = b;
    if (isDate(a) && isDate(b) && isNaN(a) && isNaN(b)) {
      x = new Date(x).valueOf();
      y = new Date(y).valueOf();
    }
    return x > y;
  }
});

jsonLogic.add_operation('<=', function (a, b, c) {
  if (a && isArray(a)) {
    const listExists = compareMultipleSingleValue(a, b, '<=');
    if (listExists.length) {
      return {
        isValid: true,
        matches: listExists,
      };
    }
    return false;
  } else {
    let x = a;
    let y = b;
    let z = c;
    if (x === null) {
      return false;
    }
    if (isDate(a) && isDate(b) && isNaN(a) && isNaN(b) && isNaN(z)) {
      x = new Date(x).valueOf();
      y = new Date(y).valueOf();
      if (z) z = new Date(z).valueOf();
    }

    return z === undefined ? x <= y : x <= y && y <= z;
  }
});
jsonLogic.add_operation('<', function (a, b, c) {
  if (Array.isArray(a)) {
    const listExists = compareMultipleSingleValue(a, b, '<');
    if (listExists.length) {
      return {
        isValid: true,
        matches: listExists,
      };
    }
    return false;
  } else {
    let x = a;
    let y = b;
    let z = c;
    if (x === null) {
      return false;
    }
    if (isDate(a) && isDate(b) && isNaN(a) && isNaN(b) && isNaN(z)) {
      x = new Date(x).valueOf();
      y = new Date(y).valueOf();
      if (z) z = new Date(z).valueOf();
    }

    return z === undefined ? x < y : x < y && y < z;
  }
});

jsonLogic.add_operation('!=', function (a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < a.length; i++) {
      let iIsEqual = false;
      if (isObject(a[i])) {
        iIsEqual = !complexObjectIsEqual(a[i], b[i]);
      } else {
        iIsEqual = !isEqual(a, b);
      }
      if (!iIsEqual) return false;
    }
    // all array items are the same and in the same order
    return true;
  } else if ((Array.isArray(a) && a.length) || (isObject(b) && !Array.isArray(b))) {
    const listExists = compareMultipleSingleValue(a, b, '!=');
    if (listExists.length) {
      return {
        isValid: true,
        matches: listExists,
      };
    }
    return false;
  } else if ((isObject(a) && !Array.isArray(a)) || isObject(b)) {
    if (a === null) {
      return !isEqual(a, b);
    }
    if (a instanceof moment || a instanceof Date) {
      a = a.valueOf();
      b = new moment(b).valueOf();

      return !isEqual(a, b);
    }

    if (b instanceof moment || b instanceof Date) {
      b = b.valueOf();
      a = new moment(a).valueOf();

      return !isEqual(a, b);
    }
    return !complexObjectIsEqual(a, b);
  } else {
    return !isEqual(a, b);
  }
});

jsonLogic.add_operation('==', function (a, b) {
  if (isArray(a) && isArray(b)) {
    if ((!a || !a.length) && b) return false;
    // comparing multiple location UDF.

    for (let i = 0; i < a.length; i++) {
      let iIsEqual = false;
      if (isObject(a[i])) {
        iIsEqual = complexObjectIsEqual(a[i], b[i]);
      } else {
        iIsEqual = isEqual(a, b);
      }

      if (!iIsEqual) return false;
    }
    // all array items are the same and in the same order
    return true;
  } else if ((Array.isArray(a) && a.length) || (isObject(b) && !Array.isArray(b))) {
    const listExists = compareMultipleSingleValue(a, b, '==');
    if (listExists.length) {
      return {
        isValid: true,
        matches: listExists,
      };
    }
    return false;
  } else if ((isObject(a) && !Array.isArray(a)) || isObject(b)) {
    if (a === null) {
      return undefined;
    }
    if (a instanceof moment || a instanceof Date) {
      a = a.valueOf();
      b = new moment(b).valueOf();

      return isEqual(a, b);
    }

    if (b instanceof moment || b instanceof Date) {
      b = b.valueOf();
      a = new moment(a).valueOf();

      return isEqual(a, b);
    }

    return complexObjectIsEqual(a, b);
  } else if (a) {
    return isEqual(a, b);
  }
  return false;
});

jsonLogic.add_operation('!!', function (a) {
  if (Array.isArray(a) && a.length && a[0].hasOwnProperty('property')) {
    const property = getProperty(a, '!!');
    const checkRule = a.some((x) => x[property]);
    return checkRule;
  }
  return jsonLogic.truthy(a);
});

jsonLogic.add_operation('!', function (a) {
  if (Array.isArray(a) && a.length && a[0].hasOwnProperty('operators')) {
    const property = getProperty(a, '!');
    const checkRule = a.some((x) => !x[property]);
    return checkRule;
  }
  return !jsonLogic.truthy(a);
});

jsonLogic.add_operation('+', function (a, b) {
  a = a || 0;
  b = b || 0;
  // is a number and the length of a js timestamp try to convert to a date or is a number and the length of a ISO date string
  if (
    (typeof a == 'number' && a.toString().length === 13) ||
    (typeof a === 'string' && a.length === 24)
  ) {
    a = new Date(a);
  } else a = parseFloat(a);

  if (
    (typeof b == 'number' && b.toString().length === 13) ||
    (typeof b === 'string' && b.length === 24)
  ) {
    b = new Date(b);
  } else b = parseFloat(b);

  // adding timespan to a date
  if (typeof a === 'number' && typeof b === 'object') {
    return b.setTime(b.getTime() + a);
  }
  // adding timespan to a date
  if (typeof b === 'number' && typeof a === 'object') {
    return a.setTime(a.getTime() + b);
  }

  return a + b;
});

jsonLogic.add_operation('-', function (a, b) {
  b = b || 0;
  // is a number and the length of a js timestamp try to convert to a date or is a number and the length of a ISO date string
  if (
    (typeof a == 'number' && a.toString().length === 13) ||
    (typeof a === 'string' && a.length === 24)
  ) {
    a = new Date(a);
  } else a = parseFloat(a);

  if (
    (typeof b == 'number' && b.toString().length === 13) ||
    (typeof b === 'string' && b.length === 24)
  ) {
    b = new Date(b);
  } else b = parseFloat(b);

  // adding timespan to a date
  if (typeof a === 'number' && typeof b === 'object') {
    return b.setTime(b.getTime() - a);
  }
  // adding timespan to a date
  if (typeof b === 'number' && typeof a === 'object') {
    return a.setTime(a.getTime() - b);
  }

  return a - b;
});

jsonLogic.add_operation('*', function (a, b) {
  a = a || 0;
  b = b || 0;
  // is a number and the length of a js timestamp try to convert to a date or is a number and the length of a ISO date string
  if (
    (typeof a == 'number' && a.toString().length === 13) ||
    (typeof a === 'string' && a.length === 24)
  ) {
    a = new Date(a);
  } else a = parseFloat(a);

  if (
    (typeof b == 'number' && b.toString().length === 13) ||
    (typeof b === 'string' && b.length === 24)
  ) {
    b = new Date(b);
  } else b = parseFloat(b);

  // adding timespan to a date
  if (typeof a === 'number' && typeof b === 'object') {
    return b.setTime(b.getTime() * a);
  }
  // adding timespan to a date
  if (typeof b === 'number' && typeof a === 'object') {
    return a.setTime(a.getTime() * b);
  }

  return a * b;
});

jsonLogic.add_operation('/', function (a, b) {
  a = a || 0;
  // is a number and the length of a js timestamp try to convert to a date or is a number and the length of a ISO date string
  if (
    (typeof a == 'number' && a.toString().length === 13) ||
    (typeof a === 'string' && a.length === 24)
  ) {
    a = new Date(a);
  } else a = parseFloat(a);

  if (
    (typeof b == 'number' && b.toString().length === 13) ||
    (typeof b === 'string' && b.length === 24)
  ) {
    b = new Date(b);
  } else b = parseFloat(b);

  // adding timespan to a date
  if (typeof a === 'number' && typeof b === 'object') {
    return b.setTime(b.getTime() / a);
  }
  // adding timespan to a date
  if (typeof b === 'number' && typeof a === 'object') {
    return a.setTime(a.getTime() / b);
  }

  return a / b;
});

jsonLogic.add_operation('sum', function (...results) {
  if (results.length === 1) return results[0];

  let sum = results[0];

  for (let i = 1; i < results.length; i++) {
    if (isNaN(results[i])) continue;
    sum += parseFloat(results[i]);
  }

  return sum;
});

jsonLogic.add_operation('difference', function (...results) {
  if (results.length === 1) return results[0];

  let difference = results[0];

  for (let i = 1; i < results.length; i++) {
    if (isNaN(results[i])) continue;
    difference -= parseFloat(results[i]);
  }

  return difference;
});

jsonLogic.add_operation('multiply', function (...results) {
  if (results.length === 1) return results[0];

  let product = results[0];

  for (let i = 1; i < results.length; i++) {
    if (isNaN(results[i])) continue;
    product *= parseFloat(results[i]);
  }

  return product;
});

jsonLogic.add_operation('divide', function (...results) {
  if (results.length === 1) return results[0];

  let quotient = results[0];

  for (let i = 1; i < results.length; i++) {
    if (isNaN(results[i])) continue;
    quotient /= parseFloat(results[i]);
  }

  return quotient;
});

const complexObjectIsEqual = (a, b) => {
  let isequal = false;

  // check if 'id' is equal
  if (a?.id && b) {
    isequal = isEqual(a.id ? a.id.toString() : '', b.id ? b.id.toString() : '');
  }

  // check location ids, port, terminal, and berth
  if (!isequal && a?.portId && b) {
    const aLocationId = a.portId + '|' + a.terminalId + '|' + a.berthId;
    const bLocationId = b.portId + '|' + b.terminalId + '|' + b.berthId;
    isequal = isEqual(aLocationId, bLocationId);
  }

  // check assigned user username
  if (!isequal && a?.username && b) {
    isequal = isEqual(a.username, b.username);
  }

  return isequal;
};

const oneOfCompare = (a, b, oper, extractResult = false) => {
  let result = {
    isValid: false,
    matches: [],
  };
  // Single <=> Many. Many <==> Many
  // Location
  if (isArray(b) && a) {
    if (b[0].isPoi) {
      if (oper === operator.equal) {
        result.matches = compareLocationOneOf(a, b, oper, extractResult);
        result.isValid = result.matches.length > 0;
      } else {
        result.matches = compareLocationNotOneOf(a, b, oper, extractResult);
        result.isValid = result.matches.length > 0;
      }
    } else if (b[0].isVessel || b[0].isCompany) {
      // Company and Vessel
      if (isObject(a) && !isArray(a)) {
        if (oper === operator.equal) {
          if (extractResult) {
            if (b[0].isVesselType) {
              result.matches = b.filter(
                (x) =>
                  x.value?.toLowerCase() === a.oceanSmartVesselType?.toLowerCase()
              );
            } else {
              result.matches = b.filter((x) => x.id === a.id);
            }
          } else {
            if (b[0].isVesselType) {
              result.isValid = b.some(
                (x) =>
                  x.value?.toLowerCase() === a.oceanSmartVesselType?.toLowerCase()
              );
            } else {
              result.isValid = b.some((x) => x.id === a.id);
            }
          }
        } else {
          if (extractResult) {
            if (b[0].isVesselType) {
              result.matches = b.filter(
                (x) =>
                  x.value?.toLowerCase() !== a.oceanSmartVesselType?.toLowerCase()
              );
            } else {
              result.matches = b.filter((x) => x.id !== a.id);
            }
          } else {
            if (b[0].isVesselType) {
              result.isValid = b.every(
                (x) =>
                  x.value?.toLowerCase() !== a.oceanSmartVesselType?.toLowerCase()
              );
            } else {
              result.isValid = b.every((x) => x.id !== a.id);
            }
          }
        }
      } else if (isArray(a) && a.length) {
        if (oper === operator.equal) {
          if (extractResult) {
            if (b[0].isVesselType) {
              result.matches = a.filter((x) =>
                b.find(
                  (c) =>
                    c.value?.toLowerCase() === x.oceanSmartVesselType?.toLowerCase()
                )
              );
            } else {
              result.matches = a.filter((x) => b.find((p) => x.id === p.id));
            }
          } else {
            if (b[0].isVesselType) {
              result.isValid = a.some((x) =>
                b.find(
                  (c) =>
                    c.value?.toLowerCase() === x.oceanSmartVesselType?.toLowerCase()
                )
              );
            } else {
              result.isValid = a.some((x) => b.find((p) => x.id === p.id));
            }
          }
        } else {
          if (extractResult) {
            if (b[0].isVesselType) {
              result.matches = a.filter(
                (x) =>
                  !b.find(
                    (c) =>
                      c.value?.toLowerCase() ===
                      x.oceanSmartVesselType?.toLowerCase()
                  )
              );
            } else {
              result.matches = a.filter((x) => !b.find((p) => x.id === p.id));
            }
          } else {
            if (b[0].isVesselType) {
              result.isValid = a.some(
                (x) =>
                  !b.find(
                    (c) =>
                      c.value?.toLowerCase() ===
                      x.oceanSmartVesselType?.toLowerCase()
                  )
              );
            } else {
              result.isValid = a.some((x) => !b.find((p) => x.id === p.id));
            }
          }
        }
      }
    }
  }

  if (!a || (Array.isArray(a) && !a.length)) {
    result.isValid = oper === operator.equal ? false : true;
  }
  if (extractResult) {
    result.isValid = result.matches.length ? true : false;
    if (result.isValid) {
      return result;
    }
  }
  return result.isValid;
};

const isDate = (a) => {
  const result = moment(a, moment.ISO_8601, true).isValid();
  return result;
};

const compareMultipleSingleValue = (a, b, oper) => {
  if (a && a.length) {
    // eslint-disable-next-line no-unused-vars
    let property = getProperty(a, oper);
    const listExists = a.filter((x) => {
      if (x[property] === null) return false;
      // eslint-disable-next-line no-eval
      const command = eval(`x[property] ${oper} b`);
      return command;
    });
    return listExists;
  }
  return false;
};

const getProperty = (a, oper) => {
  if (a && a.length) {
    let property = get(a[0], 'property');
    const operators = get(a[0], 'operators') || [];
    if (operators) {
      const operator = operators.find((x) => x.operator === oper);
      if (operator) {
        property = operator.property;
      }
    }
    return property;
  }
  return null;
};

module.exports = jsonLogic;
