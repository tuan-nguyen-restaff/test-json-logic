const { compact, clone, set, isObject, isArray } = require('lodash');

function getDisplayText(item) {
  let components = compact([item.portName, item.terminalName, item.berthName]);
  item.display = components[components.length - 1];
  item.tooltipContent = components.join(' - ');
  return item;
}

const flatLocationArray = (array, isGetDisPlayText = true) => {
  const results = [];
  array.forEach((poi) => {
    if (poi.terminals && poi.terminals.length) {
      poi.terminals.forEach((terminal) => {
        if (terminal.berths && terminal.berths.length) {
          // If select Port-Terminal-Berth
          terminal.berths.forEach((berth) => {
            const newItem = { ...terminal, ...poi, ...berth };
            delete newItem.terminals;
            delete newItem.berths;
            results.push(isGetDisPlayText ? getDisplayText(newItem) : newItem);
          });
        } else {
          // If only select Terminal of the Port
          const newItem = { ...terminal, ...poi };
          delete newItem.terminals;
          delete newItem.berths;
          results.push(isGetDisPlayText ? getDisplayText(newItem) : newItem);
        }
      });
    } else if (isObject(poi)) {
      // If only selected Port
      results.push(isGetDisPlayText ? getDisplayText(poi) : poi);
    }
  });
  return results;
};

const filterLocation = (flatArr1, obj) => {
  return flatArr1.some((p) => obj.berthId === p.berthId && obj.portId === p.portId && obj.terminalId === p.terminalId);
};


const compareLocationEqualsOneOf = (item, array2) => {
  if (isObject(item) && isArray(array2) && item && array2.length) {
    if (!item.portId && !item.terminalId && !item.berthId) {
      return false;
    }
    const flatArr = flatLocationArray(array2, false);
    const result = flatArr.some(
      (p) =>
        ((!p.berthId && !item.berthId) || item.berthId === p.berthId) &&
        ((!p.portId && !item.portId) || item.portId === p.portId) &&
        ((!p.terminalId && !item.terminalId) || item.terminalId === p.terminalId)
    );
    return result;
  }
  return false;
};

const compareLocationOneOf = (fromTransaction, fromConfig, extractResult = false) => {
  const validInput = [];
  if (isArray(fromConfig) && isArray(fromTransaction) && fromConfig.length && fromTransaction.length) {
    const flatArr1 = flatLocationArray(fromConfig, false);
    const flatArr2 = flatLocationArray(fromTransaction, false);
    for (const item of flatArr2) {
      let result = flatArr1.find((x) => {
        if (x.portId && x.terminalId && x.berthId) {
          return x.portId === item.portId && x.terminalId === item.terminalId && x.berthId === item.berthId;
        } else if (x.portId && x.terminalId) {
          return x.portId === item.portId && x.terminalId === item.terminalId;
        } else if (x.portId) {
          return x.portId === item.portId;
        }
        return false;
      });
      if (result) {
        validInput.push(item);
        if (!extractResult) {
          return validInput;
        }
      }
    }
  } else if (isObject(fromTransaction) && isArray(fromConfig) && fromTransaction && fromConfig.length) {
    const flatArr = flatLocationArray(fromConfig, false);
    for (const item of flatArr) {
      let result;
      if (item.portId && item.terminalId && item.berthId) {
        result = fromTransaction.portId === item.portId && fromTransaction.terminalId === item.terminalId && fromTransaction.berthId === item.berthId;
      } else if (item.portId && item.terminalId) {
        result = fromTransaction.portId === item.portId && fromTransaction.terminalId === item.terminalId;
      } else {
        result = fromTransaction.portId === item.portId;
      }
      if (result) {
        validInput.push(fromTransaction);
        if (!extractResult) {
          return validInput;
        }
      }
    }
  }
  return validInput;
};

const compareLocationNotOneOf = (fromTransaction, fromConfig, extractResult = false) => {
  const validInput = [];
  if (isArray(fromConfig) && isArray(fromTransaction) && fromConfig.length && fromTransaction.length) {
    const flatArr1 = flatLocationArray(fromConfig, false);
    const flatArr2 = flatLocationArray(fromTransaction, false);
    // If any item in array2 different all items in the array 1 ==> true.
    for (const item of flatArr2) {
      let result = flatArr1.every((x) => {
        return notOneOf(x, item);
      });
      if (result) {
        validInput.push(item);
        if (!extractResult) {
          return validInput;
        }
      } else {
        continue;
      }
    }
  } else if (isObject(fromTransaction) && isArray(fromConfig) && fromTransaction && fromConfig.length) {
    const flatArr = flatLocationArray(fromConfig, false);
    let result = flatArr.every((x) => {
      const result = notOneOf(x, fromTransaction);
      return result;
    });
    if (result) {
      validInput.push(fromTransaction);
      if (!extractResult) {
        return validInput;
      }
    }
  }
  return validInput;
};

function notOneOf(x, fromTransaction) {
  if (x.portId && x.terminalId && x.berthId) {
    if (x.portId === fromTransaction.portId && x.terminalId === fromTransaction.terminalId) {
      return x.berthId !== fromTransaction.berthId;
    } else if (x.portId === fromTransaction.portId) {
      return x.terminalId !== fromTransaction.terminalId && x.berthId !== fromTransaction.berthId;
    } else {
      return x.portId !== fromTransaction.portId && x.terminalId !== fromTransaction.terminalId && x.berthId !== fromTransaction.berthId;
    }
  } else if (x.portId && x.terminalId) {
    if (x.portId === fromTransaction.portId) {
      return x.terminalId !== fromTransaction.terminalId;
    } else {
      return x.portId !== fromTransaction.portId && x.terminalId !== fromTransaction.terminalId;
    }
  } else if (x.portId) {
    return x.portId !== fromTransaction.portId;
  }
  return true;
}


module.exports = {
  compareLocationEqualsOneOf,
  compareLocationOneOf,
  compareLocationNotOneOf,
};
