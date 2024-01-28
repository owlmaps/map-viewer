import ms from 'milsymbol';
import './styles/_main.scss';
import * as mapper from './map';
import { fetchBaseData, fetchDateData } from './fetcher';
import * as helper from './helper';
import * as L from 'leaflet';
import { BaseData, TimeLineDirections, UnitProps } from './types';

class MapViewer {
  map: any;
  currentDateKey: string | null;
  firstDateKey: string;
  lastDateKey: string;
  baseData: BaseData;
  latestData: any;
  layer_frontline: any;
  layer_fortifications: any;
  layer_dragon_teeth: any;
  layer_units: any[];
  layer_geos: [];
  maxCacheSize: number;
  cache: Map<string, any>;
  search: string;
  layer_status: {
    units: boolean;
    geos: boolean;
    fortifications: boolean;
    dragon_teeth: boolean;
    timeline: boolean
  };
  showLabels: boolean;
  baseUnitIcon: any;

  constructor() {
    this.map = null;
    this.currentDateKey = null;
    this.firstDateKey = '2023-01-01'; // fallback-default
    this.lastDateKey = '2024-12-31'; // fallback-default
    this.baseData = null;
    this.latestData = null;
    this.layer_frontline = null;
    this.layer_fortifications = null;
    this.layer_dragon_teeth = null;
    this.layer_units = [];
    this.layer_geos = [];
    this.cache = new Map<string, any>();
    this.maxCacheSize = 10;
    this.search = '';
    this.layer_status = {
      units: true,
      geos: true,
      fortifications: false,
      dragon_teeth: false,
      timeline: true
    };
    this.showLabels = false;
    this.baseUnitIcon = this.createUnitIconBaseClass();
  }

  run = async () => {
    // load basemap
    this.map = mapper.initBaseMap();

    // load base data
    this.baseData = await fetchBaseData();

    // if we don't have any data, display nothing
    if (this.baseData === null) {
      this.removeLoadingScreen();
      this.displayErrorScreen();
      return;
    }

    // set initial dateKeys
    this.setDateKeys();

    // set min, max in input calendar
    this.setTimelineMinMax();

    // set date input to correct date
    this.updateDateInput();

    // add listener
    this.addTimelineControlListener();
    this.addZoomListener();
    this.addSearchInputListener();

    // this.map.on('overlayadd', () => {
    //   this.layer_geos.forEach((layer: any) => {
    //     if (this.map.hasLayer(layer)) {
    //       layer.bringToFront();
    //     }
    //   })
    // });

    // add toggle buttons
    this.addTimelineControlToggle();
    this.addFortificationsToggle();
    this.addDragonTeethToggle();
    this.addUnitsToggle();
    this.addGeosToggle();
    this.addGeosToggle();

    // fetch latest data
    await this.fetchData();

    // generate static layers (fortifications, dragon teeth)
    this.generateFortificationsLayer();
    this.generateDragonTeethLayer();

    // update dynamic layers (frontline, units, geos)
    this.updateDynamicLayers();

    // remove loading screen
    this.removeLoadingScreen();
  };

  //=================================================
  // Base Methods
  //=================================================

  setDateKeys = () => {
    if (this.baseData === null) {
      return;
    }
    const { dates } = this.baseData;
    this.firstDateKey = dates[0];
    this.lastDateKey = dates[dates.length - 1];
    this.currentDateKey = this.lastDateKey;
  };

  setTimelineMinMax = () => {
    const input = document.getElementById('timeline-input');
    const min = helper.dateKey2dateString(this.firstDateKey);
    const max = helper.dateKey2dateString(this.lastDateKey);
    input?.setAttribute('min', min);
    input?.setAttribute('max', max);
  };

  // create the basic unit Icon, which we extend later
  // based on sidc, zoom ect.
  createUnitIconBaseClass = () => {
    return L.Icon.extend({
      options: {
        iconUrl: 'img/symbols/unknown.svg', // fallback icon
      },
    });
  };

  createUnitIcon = (unitProps: UnitProps) => {
    const { iw, ih } = this.calculateIconSize(unitProps);

    const { unitSIDC, unitSIDCText, unitSide } = unitProps;
    const sidcOptions: any = {};
    if (unitSIDCText !== '') {
      sidcOptions.specialHeadquarters = unitSIDCText
    }
    const symbol = new ms.Symbol(unitSIDC, sidcOptions);

    return new this.baseUnitIcon({
      iconUrl: symbol.toDataURL(),
      iconSize: [iw, ih],
      popupAnchor: [0, (ih / 1.5) * -1],
      className: 'unit-marker',
      unitSIDC: unitSIDC,
      unitSide: unitSide,
      unitSIDCText: unitSIDCText
    });

  }

  calculateIconSize = (unitProps: any) => {
    // the size depends on multiple factors:
    // - zoom-level
    // - showLabels true/false
    // - unit has amplifier or not
    // - ua or ru unit (rectangular vs. square)
    const zoomLevel = this.map.getZoom();
    const { unitSIDC, unitSide } = unitProps;
    const hasAmplifier = unitSIDC.charAt(9) !== '0';

    // console.log(zoomLevel, this.showLabels, unitSIDC, unitSide, hasAmplifier)

    // zoom factor
    // also we want big enough icons on higher zoom
    // and not so big ones in lower zoom
    // map zoom level from low (4) to high (18)
    let zoomLevelFactor = 3.5;
    if (zoomLevel <= 7) {
      zoomLevelFactor = 2.5;
    } else if (zoomLevel <= 10) {
      zoomLevelFactor = 3;
    } else if (zoomLevel <= 14) {
      zoomLevelFactor = 3.5;
    }
    // const zoomLevelFactor = zoomLevel <= 8 ? 3 : 3;
    // side factor
    // as ru units use square icons compared to rectangle for ua
    // we need to increase the size a bit
    const identityFactor = unitSide === 'ua' ? 1 : 1.3;
    // amplifier factor
    // if a unit has no amplifier, we need to decrease the size
    // we also need to check the side, as this has also an effect here
    // again the reactangle vs. square problem
    const amplifierFactor = hasAmplifier ? 1 : unitSide === 'ua' ? 1 : 0.8;


    const iw = zoomLevel * zoomLevelFactor * identityFactor * amplifierFactor;
    const ih = zoomLevel * zoomLevelFactor * identityFactor * amplifierFactor;

    // return width & height
    return { iw, ih }
  }

  //=================================================
  // Toggle Buttons Setup
  //=================================================

  addTimelineControlToggle = () => {
    const timelineToggleButton = mapper.createTimelineToggleButton(
      () => this.toggleTimelineControl(),
      this.layer_status.timeline
    );
    timelineToggleButton.addTo(this.map);
  };

  addFortificationsToggle = () => {
    const fortificationsToggleButton = mapper.createToogleLayerButton(
      () => this.toggleFortificationsLayer(),
      'Toggle fortifications',
      'fortifications-toggle-button',
      this.layer_status.fortifications
    );
    fortificationsToggleButton.addTo(this.map);
  };

  addDragonTeethToggle = () => {
    const dragonTeethToggleButton = mapper.createToogleLayerButton(
      () => this.toggleDragonTeethLayer(),
      'Toggle dragon teeth',
      'dragonteeth-toggle-button',
      this.layer_status.dragon_teeth
    );
    dragonTeethToggleButton.addTo(this.map);
  };

  addUnitsToggle = () => {
    const unitsToggleButton = mapper.createToogleLayerButton(
      () => this.toggleUnitsLayer(),
      'Toggle units',
      'units-toggle-button',
      this.layer_status.units
    );
    unitsToggleButton.addTo(this.map);
  };

  addGeosToggle = () => {
    const geosToggleButton = mapper.createToogleLayerButton(
      () => this.toggleGeosLayer(),
      'Toggle geolocations',
      'geolocations-toggle-button',
      this.layer_status.geos
    );
    geosToggleButton.addTo(this.map);
  };

  //=================================================
  // Add Listener
  //=================================================

  addTimelineControlListener = () => {
    const timelineStepButtons = document.querySelectorAll('.timeline-step-btn');
    for (const el of timelineStepButtons) {
      ['click', 'dblclick'].forEach((eventType: string) => {
        el.addEventListener(eventType, (e) => this.handleControlButton(e));
      });
    }
    const inputDate = document.querySelector('#timeline-input');
    inputDate?.addEventListener('change', (e) => this.handleControlInput(e))
  };

  addZoomListener = () => {
    this.map.on('zoomend', () => this.onZoomEnd());
  };

  addSearchInputListener = () => {
    const search = document.getElementById('search') as HTMLInputElement;
    let timeout: any = null;
    const cb = this.updateCurrentSearchString;
    search?.addEventListener('keyup', function (e: Event) {
      const el = e.currentTarget as HTMLInputElement;
      if (el === null) {
        return;
      }
      // Clear the timeout if it has already been set.
      // This will prevent the previous task from executing
      // if it has been less than <MILLISECONDS>
      clearTimeout(timeout);

      // Make a new timeout set to go off in 1000ms (1 second)
      timeout = setTimeout(function () {
        cb(el.value);
      }, 1000);
    });
    // reset button
    const searchReset = document.getElementById('search-reset') as HTMLButtonElement;
    searchReset?.addEventListener('click', function() {
      if (search !== null && search.value !== '') {
        search.value = '';
        cb('');
      }
    })
  };

  //=================================================
  // Loading & Error Screen
  //=================================================

  removeLoadingScreen = () => {
    const element = document.getElementById('loading');
    element?.remove();
  };

  displayErrorScreen = () => {
    const nodata = document.getElementById('nodata');
    if (nodata !== null && nodata.style !== null) {
      nodata.style.display = 'flex';
    }
  };

  //=================================================
  // Toggle timeline Control UI
  //=================================================

  toggleTimelineControl = () => {
    const timelineControlsContainer = document.getElementById(
      'timeline-controls-container'
    );
    timelineControlsContainer?.classList.toggle('hide');
    const btn = document.querySelector('.timeline-toggle-button');
    if (timelineControlsContainer?.classList.contains('hide')) {
      btn?.classList.remove('active');
      btn?.classList.add('inactive');
      this.layer_status.timeline = false;
    } else {
      btn?.classList.remove('inactive');
      btn?.classList.add('active');
      this.layer_status.timeline = true;
    }
  };

  //=================================================
  // Toggle Static Layers Handler
  //=================================================

  toggleFortificationsLayer = () => {
    if (this.layer_fortifications === null) {
      return;
    }
    const btn = document.querySelector('.fortifications-toggle-button');
    if (this.map.hasLayer(this.layer_fortifications)) {
      this.map.removeLayer(this.layer_fortifications);
      btn?.classList.remove('active');
      btn?.classList.add('inactive');
      this.layer_status.fortifications = false;
    } else {
      this.map.addLayer(this.layer_fortifications);
      btn?.classList.remove('inactive');
      btn?.classList.add('active');
      this.layer_status.fortifications = true;
    }
  };

  toggleDragonTeethLayer = () => {
    if (this.layer_dragon_teeth === null) {
      return;
    }
    const btn = document.querySelector('.dragonteeth-toggle-button');
    if (this.map.hasLayer(this.layer_dragon_teeth)) {
      this.map.removeLayer(this.layer_dragon_teeth);
      btn?.classList.remove('active');
      btn?.classList.add('inactive');
      this.layer_status.dragon_teeth = false;
    } else {
      this.map.addLayer(this.layer_dragon_teeth);
      btn?.classList.remove('inactive');
      btn?.classList.add('active');
      this.layer_status.dragon_teeth = true;
    }
  };

  //=================================================
  // Toggle Timeline Layers Handler
  //=================================================

  toggleGeosLayer() {
    if (this.layer_geos === null) {
      return;
    }
    const btn = document.querySelector('.geolocations-toggle-button');
    this.layer_geos.forEach((layer) => {
      if (this.map.hasLayer(layer)) {
        this.map.removeLayer(layer);
        btn?.classList.remove('active');
        btn?.classList.add('inactive');
        this.layer_status.geos = false;
      } else {
        this.map.addLayer(layer);
        btn?.classList.remove('inactive');
        btn?.classList.add('active');
        this.layer_status.geos = true;
      }
    });
  }

  toggleUnitsLayer() {
    const btn = document.querySelector('.units-toggle-button');
    this.layer_units.forEach((layer) => {
      if (this.map.hasLayer(layer)) {
        this.map.removeLayer(layer);
        btn?.classList.remove('active');
        btn?.classList.add('inactive');
        this.layer_status.units = false;
      } else {
        this.map.addLayer(layer);
        btn?.classList.remove('inactive');
        btn?.classList.add('active');
        this.layer_status.units = true;
        this.updateCurrentSearchString(this.search);
      }
    });
  }

  //=================================================
  // Search String Update Handler
  //=================================================

  updateCurrentSearchString = (searchString: string | number) => {
    // console.log('update search string with:', searchString);
    this.search = searchString.toString().toLowerCase();
    // triger search
    this.searchUnits();
  };

  //=================================================
  // Zoom Handler
  //=================================================

  onZoomEnd = () => {
    // based on zoom, adjust unit icon size
    this.layer_units.forEach((unitLayer) => {
      unitLayer.eachLayer((layer: any) => {
        const currentIcon = layer.getIcon();
        const unitIcon = this.createUnitIcon(currentIcon.options);
        layer.setIcon(unitIcon);
      });
    });
    // triger search again
    this.searchUnits();
  };

  //=================================================
  // Time Control Handler (click, doubleclick)
  //=================================================
  _getNewDateKey = (direction: TimeLineDirections) => {
    if (this.currentDateKey === null) {
      return null;
    }
    if (this.baseData === null) {
      return null;
    }
    const { dates } = this.baseData;
    const currentIndex = dates.indexOf(this.currentDateKey);
    let newDateKey = this.currentDateKey;
    switch (direction) {
      case 'next':
        if (currentIndex + 1 < dates.length) {
          newDateKey = dates[currentIndex + 1];
        }
        break;
      case 'previous':
        if (currentIndex > 0) {
          newDateKey = dates[currentIndex - 1];
        }
        break;
      case 'first':
        newDateKey = dates[0];
        break;
      case 'last':
        newDateKey = dates[dates.length - 1];
        break;
      case 'next-7':
        if (currentIndex + 7 < dates.length) {
          newDateKey = dates[currentIndex + 7];
        } else {
          newDateKey = dates[dates.length - 1];
        }
        break;
      case 'previous-7':
        if (currentIndex >= 7) {
          newDateKey = dates[currentIndex - 7];
        } else {
          newDateKey = dates[0];
        }
        break;
    }
    return newDateKey;
  };

  handleControlButton = async (e: Event): Promise<void> => {
    e.stopPropagation();

    const el = e.currentTarget as HTMLButtonElement;

    if (el.disabled) {
      return;
    }

    // disable button
    el.disabled = true;

    if (el === null || this.baseData === null) {
      return;
    }

    // calculate new dateKey
    const action = el.getAttribute('name') as TimeLineDirections;
    this.currentDateKey = this._getNewDateKey(action);
    // update display
    this.updateDateInput();
    // fetch new data
    await this.fetchData();
    // update all dynamic layers
    this.updateDynamicLayers();

    // enable button
    el.disabled = false;
  };

  handleControlInput = async (e: Event): Promise<void> => {
    const el = e.currentTarget as HTMLInputElement;

    if (el === null || this.baseData === null) {
      return;
    }
    const newDate = el.value;
    // convert input to our format
    const newDateKey = newDate.replace(/-/g, '');

    // set new date
    this.currentDateKey = newDateKey;
    // fetch new data
    await this.fetchData();
    // update all dynamic layers
    this.updateDynamicLayers();
  }
  //=================================================
  // Generate Static Layers (and add to map)
  //=================================================

  generateFortificationsLayer = () => {
    if (this.baseData === null) {
      return;
    }
    // create new fortifications layer and add to map
    const fortificationsOptions = {
      weight: 2,
      color: '#000000',
      fillOpacity: 1,
      interactive: false,
    };
    this.layer_fortifications = L.polyline(
      this.baseData['fortifications'],
      fortificationsOptions
    );
    const btn = document.querySelector('.fortifications-toggle-button');
    const isActive = btn?.classList.contains('active');
    if (isActive) {
      this.layer_fortifications.addTo(this.map);
    }
  };

  generateDragonTeethLayer = () => {
    if (this.baseData === null) {
      return;
    }
    // create new dragon teeth layer and add to map
    const dragonteethOptions = {
      weight: 2,
      color: '#f403fc',
      fillOpacity: 1,
      interactive: false,
    };
    this.layer_dragon_teeth = L.polyline(
      this.baseData['dragon_teeth'],
      dragonteethOptions
    );
    const btn = document.querySelector('.dragonteeth-toggle-button');
    const isActive = btn?.classList.contains('active');
    if (isActive) {
      this.layer_dragon_teeth.addTo(this.map);
    }
  };

  //=================================================
  // Dynamic Layers (delete, create, add, update)
  //=================================================

  createFrontlineLayer = () => {
    const frontlineOptions = {
      weight: 3,
      color: '#ff0000',
      fillOpacity: 0.05,
      interactive: false,
    };
    this.layer_frontline = L.polyline(
      this.latestData['frontline'],
      frontlineOptions
    );
  };

  addFrontlineLayer = () => {
    this.layer_frontline.addTo(this.map);
  };

  removeFrontlineLayer = () => {
    if (this.layer_frontline !== null) {
      this.map.removeLayer(this.layer_frontline);
    }
  };

  updateFrontlineLayer() {
    this.removeFrontlineLayer();
    this.createFrontlineLayer();
    this.addFrontlineLayer();
  }

  //---------------------------------------------------------

  createUnitLayers = () => {
    if (this.baseData === null) {
      return;
    }
    const newLayers: any = [];
    const unitFeatures = helper.prepareUnitData(
      this.latestData['units'],
      this.baseData.unit_map
    );

    // create new unit layers
    unitFeatures.forEach((unitFeature: any) => {
      if (unitFeature === null) {
        return;
      }

      const aLayer = L.geoJSON(unitFeature, {
        onEachFeature: function (feature, layer) {
          layer.bindPopup(feature.properties.unitName);
        },
        pointToLayer: (feature, latlng) => {
          const unitIcon = this.createUnitIcon(feature.properties);
          return L.marker(latlng, {
            icon: unitIcon,
          });
        },
      });
      newLayers.push(aLayer);
    });
    this.layer_units = newLayers;
  };

  addUnitsLayers = () => {
    if (Array.isArray(this.layer_units)) {
      this.layer_units.forEach((aLayer: any) => {
        aLayer.addTo(this.map);
      });
    }
  };

  removeUnitsLayers = () => {
    if (Array.isArray(this.layer_units)) {
      this.layer_units.forEach((aLayer: any) => {
        this.map.removeLayer(aLayer);
      });
    }
  };

  updateUnitsLayers = () => {
    this.removeUnitsLayers();
    this.createUnitLayers();
    if (this.layer_status.units) {
      this.addUnitsLayers();
      this.searchUnits();
    }
  };

  //---------------------------------------------------------

  createGeosLayers = () => {
    const newLayers: any = [];
    const geosFeatures = helper.prepareGeosData(this.latestData['geos']);
    // console.log(this.latestData['geos']);
    // console.log(geosFeatures);

    // create new unit layers
    geosFeatures.forEach((geoFeature: any) => {
      if (geoFeature === null) {
        return;
      }
      const aLayer = L.geoJSON(geoFeature, {
        onEachFeature: function (feature, layer) {
          const text = helper.transformURLs(feature.properties.description);
          layer.bindPopup(text);
        },
        pointToLayer: function (feature, latlng) {
          // const cls = `geos-marker ${feature.properties.cls}`;
          // console.log(feature, cls);
          const iconUrl =
            feature.properties.side === 'ua'
              ? 'img/symbols/icon-1.png'
              : 'img/symbols/icon-2.png';
          const icon = L.icon({
            iconUrl: iconUrl,
            iconSize: [40, 40],
          });
          return L.marker(latlng, {
            icon: icon,
          });
        },
      });
      newLayers.push(aLayer);
    });
    this.layer_geos = newLayers;
  };

  addGeosLayers = () => {
    if (Array.isArray(this.layer_geos)) {
      this.layer_geos.forEach((aLayer: any) => {
        aLayer.addTo(this.map);
      });
    }
  };

  removeGeosLayers = () => {
    if (Array.isArray(this.layer_geos)) {
      this.layer_geos.forEach((aLayer: any) => {
        this.map.removeLayer(aLayer);
      });
    }
  };

  updateGeosLayers = () => {
    this.removeGeosLayers();
    this.createGeosLayers();
    if (this.layer_status.geos) {
      this.addGeosLayers();
    }
  };

  //=================================================
  // update all dynamic layers
  //=================================================
  updateDynamicLayers = () => {
    this.updateFrontlineLayer();
    this.updateUnitsLayers();
    this.updateGeosLayers();
  };

  //=================================================
  // fetch date data (or use cache)
  //=================================================

  fetchData = async () => {
    // if we have no dateKey, do nothing
    if (this.currentDateKey === null) {
      return;
    }

    // if dateKey is already cache, set latestData to
    // value form cache, otherwise fetch new data
    // and update the cache
    if (this.cache.has(this.currentDateKey)) {
      this.latestData = this.cache.get(this.currentDateKey);
    } else {
      this.latestData = await fetchDateData(this.currentDateKey);
      this.cache.set(this.currentDateKey, this.latestData);
    }
    // check size of cache, remove items is needed
    if (this.cache.size > this.maxCacheSize) {
      const it = this.cache.keys();
      const diff = this.cache.size - this.maxCacheSize;
      for (let i = 0; i < diff; i++) {
        this.cache.delete(it.next().value);
      }
    }
  };

  //=================================================
  // ...
  //=================================================

  searchUnits() {
    const current_search_string = this.search.toLowerCase();

    this.layer_units.forEach((unitLayer) => {
      unitLayer.eachLayer(function (layer: any) {
        const elem = layer.getElement();
        if (
          !layer.feature.properties.unitName
            .toLowerCase()
            .includes(current_search_string)
        ) {
          elem?.classList.add('hide');
        } else {
          elem?.classList.remove('hide');
        }
      });
    });
  }

  updateDateInput() {
    // update input date
    const dateControl: HTMLInputElement | null =
      document.querySelector('#timeline-input');
    if (dateControl !== null) {
      dateControl.value = helper.dateKey2dateString(this.currentDateKey);
    }
  }
}

const map = new MapViewer();
map.run();
