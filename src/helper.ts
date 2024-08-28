import { UnitData, UnitPosition, UnitMap, GeosData } from './types';

export const dateKey2dateString = (dateKey: any): string => {
  const pattern = /(\d{4})(\d{2})(\d{2})/;
  const match = pattern.exec(dateKey);
  let dateString = '2023-01-01'; // fallback
  if (match !== null) {
    dateString = `${match[1]}-${match[2]}-${match[3]}`;
  }
  return dateString;
};

export const prepareGeosData = (data: GeosData) => {
  const geosCollections: any = [];
  const uaGeosFeatures: any = [];
  const ruGeosFeatures: any = [];

  ['ua', 'ru'].forEach((side: string) => {
    if (Array.isArray(data[side]) && data[side].length > 0) {
      for (let i = 0; i < data[side].length; i++) {
        const geosData = data[side][i];
        const geosFeature = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: geosData['c'],
          },
          properties: {
            description: geosData['d'],
            side: side,
            cls: side,
          },
        };
        if (side === 'ua') {
          uaGeosFeatures.push(geosFeature);
        } else if (side === 'ru') {
          ruGeosFeatures.push(geosFeature);
        }
      }
    }
  });
  geosCollections.push(uaGeosFeatures);
  geosCollections.push(ruGeosFeatures);
  return geosCollections;
};

export const prepareUnitData = (data: UnitData, unit_map: UnitMap) => {
  const unitCollections: any = [];

  /**
   * Helper function for populating `unitCollections` with features.
   * @param units A list of units and their positions.
   * @param unitSide Shorthand for the unit sides.
   */
  const _populateUnitFeatures = (
    units: UnitPosition[],
    unitSide: string
  ) => {
    const unitFeatures: any = [];

    if (Array.isArray(units) && units.length > 0) {
      for (let i = 0; i < units.length; i++) {
        const unitData = units[i];
        const unitId = unitData[0];
        const unitCoordinates = unitData[1];
        let unitName = 'Unknown';
        let unitSIDC = '30000000000000000000'; // fallback
        let unitSIDCText = '';

        if (unit_map.hasOwnProperty(unitId)) {
          const aUnitData = unit_map[unitId];

          if (
            aUnitData.hasOwnProperty('n') && 
            aUnitData.n !== undefined
          ) {
            unitName = aUnitData.n;
          }
          
          if (
            aUnitData.hasOwnProperty('sidc') && 
            aUnitData.sidc !== undefined
          ) {
            unitSIDC = aUnitData.sidc;
          }
          
          if (
            aUnitData.hasOwnProperty('sidc_custom_text') && 
            aUnitData.sidc_custom_text !== undefined
          ) {
            unitSIDCText = aUnitData.sidc_custom_text;
          }
        }

        unitFeatures.push({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: unitCoordinates,
          },
          properties: {
            unitId: unitId,
            unitName: unitName,
            unitSide: unitSide,
            unitSIDC: unitSIDC,
            unitSIDCText: unitSIDCText
          },
        });
      }
    }

    if (unitFeatures.length > 0) {
      const featureCollection = {
        type: 'FeatureCollection',
        features: unitFeatures,
      }

      unitCollections.push(featureCollection);
    } else {
      console.error('failed to create unit features!!!');
      unitCollections.push(null);
    }
  };

  // Create unit features.
  _populateUnitFeatures(data.ua, 'ua');
  _populateUnitFeatures(data.ru, 'ru');

  return unitCollections;
};

const URL_PATTERN = /(((https?:\/\/)|(www\.))[^\s|<]+)/g;
export const transformURLs = (aText: string | null) => {
  if (aText === null) {
    return '';
  }
  return aText.replace(URL_PATTERN, (url) => {
    let href = url;
    if (!href.match('^https?://')) {
      href = 'http://' + href;
    }
    return (
      '<a href="' +
      href +
      '" target="_blank" rel="noopener noreferrer">' +
      url +
      '</a>'
    );
  });
};
