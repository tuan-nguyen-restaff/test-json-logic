const set = require('lodash/set');
const get = require('lodash/get');
const unset = require('lodash/unset');
const isEmpty = require('lodash/isEmpty');
const isArray = require('lodash/isArray');
const isObject = require('lodash/isObject');
const cloneDeep = require('lodash/cloneDeep');
const moment = require('moment');
const contextTypeTexts = ['Company', 'Vessel', 'Berth', 'Port', 'Terminal'];
const locationTypes = ['Berth', 'Port', 'Terminal', 'masterData.pois', 'location.multi'];
const FORMAT_PROPERTY_LOOKUP = {
  loationUdfLookup: 'loationUdfLookup',
  companyUdfLookup: 'companyUdfLookup',
  vesselUdfLookup: 'vesselUdfLookup',
  locationLookup: 'locationLookup',
};
function flatProperties(properties) {
  if (properties) {
    let flatObjects = properties.filter((x) => !x.list);
    const flatHasList = properties.filter((x) => x.list && x.list.length);
    if (flatHasList) {
      flatHasList.forEach((item) => {
        if (item.list) flatObjects = [...flatObjects, ...item.list];
      });
    }
    return flatObjects;
  }
  return null;
}

const getDifference = (data) => {
  const diff = Math.trunc(data / 1000);
  if (diff <= 0) {
    return 'Choose a time of departure after time of arrival.';
  }
  const minutes = Math.trunc(diff / 60) % 60;
  const minutesDisplay = minutes > 0 ? (minutes !== 1 ? ' minutes' : ' minute') : '';
  const hours = Math.trunc(diff / 3600) % 24;
  const hoursDisplay = hours > 0 ? (hours !== 1 ? ' hours ' : ' hour ') : '';
  const days = Math.trunc(diff / 86400);
  let daysDisplay = days > 0 ? (days !== 1 ? ' days ' : ' day ') : '';
  let string = `${days > 0 ? days : ''}${daysDisplay}${hours > 0 ? hours : ''}${hoursDisplay}${minutes > 0 ? minutes : ''}${minutesDisplay}`;
  return string.trim();
};

function convertDataType(data, properties) {
  const cloneData = cloneDeep(data);
  if (cloneData && properties) {
    if (cloneData.actualDuration) {
      cloneData.actualDuration = getDifference(cloneData.actualDuration);
    } else {
      const dateProperties = properties.filter((x) => (x.objectProperty && x.objectProperty.type === 'date') || x.type === 'expansionPanel');
      if (dateProperties) {
        for (const pro of dateProperties) {
          if (pro.type === 'expansionPanel' && pro.list) {
            const datetimess = pro.list.filter((x) => x.objectProperty && x.objectProperty.type === 'datetime');
            if (datetimess && datetimess.length) {
              for (const field of datetimess) {
                const value = cloneData[field.dataPath];
                if (value) {
                  const tzOffset = new Date().getTimezoneOffset();
                  // Unuse now
                  // eslint-disable-next-line no-unused-vars
                  const dtString = tzOffset > 0 ? moment(value).add(tzOffset, 'm') : moment(value).subtract(tzOffset, 'm');
                  // data[field.dataPath] = dtString;
                }
              }
            }
          } else if (pro.dataPath) {
            const value = cloneData[pro.dataPath];
            if (value) {
              const dateTime = moment(value);
              cloneData[pro.dataPath] = dateTime.format('YYYY-MM-DD');
            }
          }
        }
      }
      const booleanProperties = properties.filter((x) => x.objectProperty && x.objectProperty.type === 'boolean');
      if (!isEmpty(booleanProperties)) {
        for (const booleanPro of booleanProperties) {
          const value = get(cloneData, booleanPro.dataPath);
          set(cloneData, booleanPro.dataPath, !!value);
        }
      }
      const numberProperties = properties.filter((x) => x.objectProperty && x.objectProperty.type === 'double');
      if (!isEmpty(numberProperties)) {
        for (const numberPro of numberProperties) {
          const value = get(cloneData, numberPro.dataPath);
          if (value) {
            set(cloneData, numberPro.dataPath, parseInt(value));
          }
        }
      }
      // convert for question
      if (!isEmpty(cloneData.questions)) {
        const questionsData = cloneData.questions.filter((x) => x.answerType === 'Number');
        if (!isEmpty(questionsData)) {
          for (const numberPro of questionsData) {
            const value = get(cloneData, numberPro.guid);
            if (value) {
              set(cloneData, numberPro.guid, parseInt(value));
            }
          }
        }
      }
    }
  }
  return cloneData;
}

function structureJsonLogicRule(logic) {
  for (const operator in logic) {
    const tmpLogic = logic[operator];
    if (Array.isArray(tmpLogic)) {
      for (const newLogic of tmpLogic) {
        if (newLogic.context || newLogic.contextType || newLogic.onlyParent) {
          const context = newLogic.context;
          const contextType = newLogic.contextType;
          unset(newLogic, 'context');
          unset(newLogic, 'contextType');
          unset(newLogic, 'label');
          if (newLogic.onlyParent) {
            unset(newLogic, 'onlyParent');
            continue;
          }

          for (let datumLogicIndex in newLogic) {
            if (['context', 'contextType', 'label'].includes(datumLogicIndex))
              continue;
            const obj = newLogic[datumLogicIndex];
            const field = obj[0]?.var;
            if (isArray(obj) && field) {
              let newValue = context + '.' + obj[0].var;
              if (
                FORMAT_PROPERTY_LOOKUP[field] ||
                (contextTypeTexts.includes(contextType) && context.includes('udfs'))
              ) {
                newValue = context;
              }
              newLogic[datumLogicIndex][0].var = newValue;
            } else if (isObject(obj)) {
              let newValue = context + '.' + obj.var;
              if (
                FORMAT_PROPERTY_LOOKUP[obj.var] ||
                (contextTypeTexts.includes(contextType) && context.includes('udfs'))
              ) {
                newValue = context;
              }
              newLogic[datumLogicIndex].var = newValue;
            }
          }
        } else if (isObject(newLogic)) {
          structureJsonLogicRule(newLogic);
        }
      }
    }
  }
}

function getFieldConfig(properties, data, datumLogic) {
  if (properties) {
    const field = properties.find((x) => x.dataPath === datumLogic.context);
    if (field && field.hidden) {
      unset(data, datumLogic.context);
      return null;
    }
  }
  if (datumLogic.onlyParent) return null;

  const context = datumLogic.context;
  const contextType = datumLogic.contextType;
  const currentItemData = get(data, context);
  let operatorName = '';

  let masterDataPathName = null;
  for (let datumLogicIndex in datumLogic) {
    if (['context', 'onlyParent', 'contextType'].includes(datumLogicIndex)) continue;
    const operator = datumLogic[datumLogicIndex];
    if (Array.isArray(operator) && operator[0]) {
      masterDataPathName = operator[0].var;
    } else if (datumLogic['!'] || (datumLogic['!!'] && operator)) {
      masterDataPathName = operator.var;
    }
    operatorName = datumLogicIndex;
  }
  // only for udf and empty, not empty
  if (!masterDataPathName && context && context.includes('udfs') && Array.isArray(currentItemData)) {
    const operator = datumLogic['!'] || datumLogic['!!'];
    if (operator && operator.var) {
      return {
        currentItemData,
        itemId: null,
        contextType,
        masterDataPathName: operator.var,
        context,
      };
    }
  }
  if (!masterDataPathName) return null;
  if (FORMAT_PROPERTY_LOOKUP[masterDataPathName]) return null;

  if (isArray(currentItemData)) {
    return {
      currentItemData,
      itemId: null,
      contextType,
      masterDataPathName,
      context,
      operatorName,
    };
  } else if (currentItemData) {
    const { contextId, type } = getItemId(currentItemData, contextType);
    return { itemId: contextId, contextType: type, masterDataPathName, context };
  }
  return { itemId: undefined, contextType, masterDataPathName, context };
}

function getItemId(item, contextType) {
  if (!item) return {};
  if (item && item.portId && item.terminals && item.terminals.length) {
    const terminal = item.terminals[0];
    if (terminal && terminal.berths && terminal.berths.length) {
      return { contextId: terminal.berths[0].berthId, type: 'Berth' };
    }
    return { contextId: terminal.terminalId, type: 'Terminal' };
  }
  let contextId = item.id;
  let type = contextType;
  if (item.id) {
    contextId = item.id;
  } else if (item.berthId) {
    type = 'Berth';
    contextId = item.berthId;
  } else if (item.terminalId) {
    type = 'Terminal';
    contextId = item.terminalId;
  } else if (item.portId) {
    type = 'Port';
    contextId = item.portId;
  }
  return { contextId, type };
}


function getValueFromContextData(ItemId, type, masterDataPath, contextData, context) {
  if (!ItemId) return null;
  let newDataPathValue = null;
  const dataPath = masterDataPath;
  if (contextData) {
    const data = get(contextData, context);
    if (data) {
      if (type === 'Company') {
        let item = data;
        if (Array.isArray(data)) {
          item = data.find((x) => x.id.toString() === ItemId.toString());
        }
        newDataPathValue = get(item, dataPath);
        if (dataPath === 'shortCompanyName' && !newDataPathValue) {
          newDataPathValue = get(item, 'shortName');
        }
      } else if (type === 'Vessel') {
        let item = data;
        if (Array.isArray(data)) {
          item = data.find((x) => x.id.toString() === ItemId.toString());
        }
        newDataPathValue = get(item, dataPath);
      } else if (locationTypes.includes(type)) {
        if (type === 'Port') {
          let item = data;
          if (Array.isArray(data)) {
            item = data.find((x) => x.portId && x.portId.toString() === ItemId.toString());
          }
          newDataPathValue = get(item, dataPath);
        } else if (type === 'Terminal') {
          let item = data;
          if (Array.isArray(data)) {
            item = data.find((x) => x.terminalId && x.terminalId.toString() === ItemId.toString());
          }
          newDataPathValue = get(item, dataPath);
        } else if (type === 'Berth') {
          let item = data;
          if (Array.isArray(data)) {
            item = data.find((x) => x.berthId && x.berthId.toString() === ItemId.toString());
          }
          newDataPathValue = get(item, dataPath);
        }
      }
    }
  }

  return newDataPathValue;
}

async function addMasterDataFromLogicRule(cvcData, logic, data, properties) {
  for (const operator in logic) {
    const tmpLogic = logic[operator];
    for (const datumLogic of tmpLogic) {
      let newDataPathValue = null;
      const fieldConfig = getFieldConfig(properties, cvcData, datumLogic);
      if (!fieldConfig) continue;
      const { currentItemData, itemId, contextType, masterDataPathName, context, operatorName } = fieldConfig;
      if (itemId) {
        newDataPathValue = getValueFromContextData(itemId, contextType, masterDataPathName, cvcData, context);
        const dataKey = context + '.' + masterDataPathName;
        set(cvcData, dataKey, newDataPathValue);
        set(data, dataKey, newDataPathValue);
      } else if (currentItemData && currentItemData.length) {
        for (const item of currentItemData) {
          const { contextId, type } = getItemId(item, contextType);
          const newDataPathValue = getValueFromContextData(contextId, type, masterDataPathName, cvcData, context);
          const operators = get(item, 'operators') || [];
          if (!operators.includes((x) => x.operator === operatorName)) {
            const operator = {
              operator: operatorName,
              property: masterDataPathName,
            };
            operators.push(operator);
          }
          set(item, masterDataPathName, newDataPathValue);
          set(item, 'operators', operators);
          set(item, 'contextType', type);
        }
        set(cvcData, context, currentItemData);
      }
    }
  }
}


module.exports = {
  flatProperties,
  convertDataType,
  structureJsonLogicRule,
  addMasterDataFromLogicRule
};
