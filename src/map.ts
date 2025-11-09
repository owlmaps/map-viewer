import 'leaflet/dist/leaflet.css';
import * as L from 'leaflet';
import 'leaflet-contextmenu';
import 'leaflet-contextmenu/dist/leaflet.contextmenu.min.css';

// add property "name" to interface TileLayerOptions
declare module 'leaflet' {
  interface TileLayerOptions {
    name: string;
  }
  interface MapOptions {
    contextmenu: boolean;
    contextmenuWidth: number;
    contextmenuItems: any[];
  }
}

/**
 * Initializes the leaflet base map.
 * @returns The leaflet map.
 */
export const initBaseMap = () => {
  const initialZoom = 7;
  const mapCenter: any = [47.5, 36.0];

  // OSM tile layer
  const cyclosmUrl =
    'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png';
  const cyclosmAttrib =
    '<a href="https://github.com/cyclosm/cyclosm-cartocss-style/releases" title="CyclOSM - Open Bicycle render">CyclOSM</a> | Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors"';
  const cyclosm = L.tileLayer(cyclosmUrl, {
    maxZoom: 18,
    attribution: cyclosmAttrib,
    noWrap: true,
    name: 'cyclosm',
  });

  // OSM tile layer
  const osmUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const osmAttrib =
    '&copy; <a href="https://openstreetmap.org/copyright">' +
    'OpenStreetMap</a> contributors';
  const osm = L.tileLayer(osmUrl, {
    maxZoom: 18,
    attribution: osmAttrib,
    noWrap: true,
    name: 'osm',
  });

  // OpenTopoMap
  const topoUrl = 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png';
  const topoAttrib =
    'Kartendaten: © OpenStreetMap-Mitwirkende, SRTM | Kartendarstellung: © OpenTopoMap (CC-BY-SA) ';
  const topo = L.tileLayer(topoUrl, {
    maxZoom: 18,
    attribution: topoAttrib,
    noWrap: true,
    name: 'topo',
  });

  // ESRI
  const esriUrl =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const esriAttrib =
    'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
  const esri = L.tileLayer(esriUrl, {
    maxZoom: 18,
    attribution: esriAttrib,
    noWrap: true,
    name: 'esri',
  });

  // Carto tile Layer
  const cartoUrl =
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  const carto = L.tileLayer(cartoUrl, {
    maxZoom: 18,
    noWrap: true,
    name: 'carto',
  });


  // Here tile Layer
  const hereUrl =
    'https://1.aerial.maps.ls.hereapi.com/maptile/2.1/maptile/newest/satellite.day/{z}/{x}/{y}/512/jpg?apiKey=aRrXMN6rNeDunujbIgCqESvkttKlk4Pp2j5N7xTp4Ek';
  const here = L.tileLayer(hereUrl, {
    maxZoom: 18,
    noWrap: true,
    name: 'here',
  });

  // RU tile Layer - https://qms.nextgis.com/geoservices/563/
  // const ruUrl =
    // 'http://88.99.52.155/cgi-bin/tapp/tilecache.py/1.0.0/topomapper_v2/{z}/{x}/{y}.jpg';
  const ruUrl =
    'https://proxy.nakarte.me/http/88.99.52.156/tmg/{z}/{x}/{y}';
  const ruAttriib = '<a href="http://www.topomapper.com">Topomapper</a>';
  const ru = L.tileLayer(ruUrl, {
    // minZoom: 10,
    maxZoom: 18,
    noWrap: true,
    name: 'ruarmy',
    attribution: ruAttriib,
  });

  // set basemaps (from tile layers above)
  const baseMaps = {
    CyclOSM: cyclosm,
    OpenStreetMap: osm,
    OpenTopoMap: topo,
    EsriWorldMap: esri,
    CartoDB: carto,
    RuArmy: ru,
    Here: here,
  };

  // create base map with OSM layer as default
  const map = L.map('map', {
    layers: [osm],
    center: mapCenter,
    zoom: initialZoom,
    minZoom: 4,
    maxZoom: 18,
    maxBounds: [
      [90, -180],
      [-90, 180],
    ],
    contextmenu: true,
    contextmenuWidth: 140,
    contextmenuItems: [
      {
        text: 'Copy Coordinates',
        callback: (e: any): void => {
          const latlng = `${e.latlng.lat}, ${e.latlng.lng}`;
          navigator.clipboard.writeText(latlng);
        },
      },
      '-',
      {
        text: 'Center map here',
        callback: (e: any): void => {
          map.panTo(e.latlng);
        },
      },
      '-',
      {
        text: 'Go to Coords',
        callback: (): void => {
          const coordsString = prompt('Enter coordinates (format: lat, lng)');
          if (coordsString && coordsString !== '' && coordsString.includes(',')) {
            const coords = coordsString?.split(',')
            const latlng = new L.LatLng(parseFloat(coords[0]), parseFloat(coords[1]));
            map.panTo(latlng);
            const marker = L.marker(latlng).addTo(map);
            marker.on('click', () => {
              map.removeLayer(marker);
            })
          }
        }
      }
    ],
  });

  // add base map switcher to map
  L.control.layers(baseMaps).addTo(map);

  // add scale
  L.control
    .scale({
      metric: true,
      imperial: true,
      maxWidth: 100,
      position: 'bottomleft',
    })
    .addTo(map);

  return map;
};

export const createToggleButton = (
  callback: Function,
  title: string,
  cls: string,
  initialStatus: boolean
) => {
  const toggleButtonControl = L.Control.extend({
    onAdd: () => {
      const statusCls = initialStatus ? 'active' : 'inactive';
      
      const button = L.DomUtil.create(
        'button',
        `toggle-button ${cls} ${statusCls}`
      );

      button.title = title;
      L.DomEvent.disableClickPropagation(button);
      
      L.DomEvent.on(button, 'click', () => {
        callback();
      });
      
      return button;
    }
  });

  const toggleButton = new toggleButtonControl({ position: 'topright' });
  return toggleButton;
};
