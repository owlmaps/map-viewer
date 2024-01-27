export type Coordinate = [number, number];
export type CoordinateList = Coordinate[];
export type ListOfCoordinateLists = CoordinateList[];

export type BaseData = {
  unit_map: UnitMap;
  dates: string[];
  fortifications: FortificationsData;
  dragon_teeth: DragonTeethData;
  styles: Styles;
} | null;

export type UnitMap = {
  [key: number]: {
    n: string;
    s: string;
    sidc: string;
    sidc_custom_text?: string
  };
};

export type Styles = {
  [key: string]: string;
};

export type DateData = {};

// frontline data is a list of coordinates
export type FrontlineData = Coordinate[];

export type FortificationsData = Coordinate[][];
export type DragonTeethData = Coordinate[][];

// unit data is a list of UnitPositions
export type UnitPosition = [number, Coordinate];
export type UnitData = {
  ua: UnitPosition[];
  ru: UnitPosition[];
};

export type UnitCount = {
  ru: number;
  ua: number;
};

export type GeoLoc = {
  c: Coordinate;
  d: string;
};

export type GeosData = {
  [key: string]: GeoLoc[];
};

export type TimelineData = {
  [key: number]: {
    unit_count: UnitCount;
    units: {
      ru: UnitPosition[];
      ua: UnitPosition[];
    };
    frontline: FrontlineData;
    geos: GeosData;
  };
};
export type Data = {
  timeline: TimelineData;
  unit_map: any;
};

export type BaseMapProps = {
  startDate: string;
  endDate: string;
};

export type FeatureTypes =
  | 'Point'
  | 'MultiPoint'
  | 'LineString'
  | 'MultiLineString'
  | 'Polygon'
  | 'MultiPolygon'
  | 'GeometryCollection'
  | 'Feature'
  | 'FeatureCollection';

export type UnitFeature = {
  type: string;
  geometry: {
    type: string;
    coordinates: Coordinate;
  };
  properties: {
    time?: string;
    times?: string[];
    unitId?: number;
    unitName?: string;
  };
};
export type UnitFeatures = UnitFeature[];
export type UnitsCollection = {
  type: string;
  features: UnitFeatures;
};

export type LocFeature = {
  type: string;
  geometry: {
    type: string;
    coordinates: Coordinate;
  };
  properties: {
    time?: string;
    times?: string[];
    description?: string;
  };
};
export type LocFeatures = LocFeature[];
export type LocCollection = {
  type: string;
  features: LocFeatures;
};

export type TimeLineDirections = 'first' | 'last' | 'previous' | 'next' | 'previous-7' | 'next-7';

export type Sides = 'ua' | 'ru';
