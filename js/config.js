// config.js
// Central API endpoints, shared state, and Washington city search data.

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const SHELTER_SEARCH_RADIUS_METERS = 50000;
const WA_ENVELOPE = '-124.95,45.45,-116.85,49.05';
const FIRE_PERIMETER_2024_URL = 'https://services1.arcgis.com/CD5mKowwN6nIaqd8/arcgis/rest/services/project_landscape_planning_tool_fire_perimeter_history/FeatureServer/0/query';

let allShelters = [];
let allFires = [];
let shelterMarkers = [];
let fireMarkers = [];
let fireYearFilter = '2024';
let searchQuery = '';
let selectedCity = null;
let selectedCityMarker = null;

const WASHINGTON_CITIES = [
  { name: 'Aberdeen', region: 'Grays Harbor County', lat: 46.9754, lon: -123.8157 },
  { name: 'Anacortes', region: 'Skagit County', lat: 48.5126, lon: -122.6127 },
  { name: 'Arlington', region: 'Snohomish County', lat: 48.1987, lon: -122.1251 },
  { name: 'Auburn', region: 'King County', lat: 47.3073, lon: -122.2285 },
  { name: 'Bellingham', region: 'Whatcom County', lat: 48.7519, lon: -122.4787 },
  { name: 'Bellevue', region: 'King County', lat: 47.6101, lon: -122.2015 },
  { name: 'Bothell', region: 'King/Snohomish County', lat: 47.7623, lon: -122.2054 },
  { name: 'Bremerton', region: 'Kitsap County', lat: 47.5673, lon: -122.6326 },
  { name: 'Cashmere', region: 'Chelan County', lat: 47.5223, lon: -120.4698 },
  { name: 'Centralia', region: 'Lewis County', lat: 46.7162, lon: -122.9543 },
  { name: 'Chelan', region: 'Chelan County', lat: 47.8408, lon: -120.0168 },
  { name: 'Cheney', region: 'Spokane County', lat: 47.4874, lon: -117.5758 },
  { name: 'Cle Elum', region: 'Kittitas County', lat: 47.1954, lon: -120.9392 },
  { name: 'Colville', region: 'Stevens County', lat: 48.5466, lon: -117.9043 },
  { name: 'Connell', region: 'Franklin County', lat: 46.6635, lon: -118.8611 },
  { name: 'Coulee Dam', region: 'Okanogan County', lat: 47.9654, lon: -118.9764 },
  { name: 'Darrington', region: 'Snohomish County', lat: 48.2554, lon: -121.6015 },
  { name: 'Eatonville', region: 'Pierce County', lat: 46.8673, lon: -122.2660 },
  { name: 'Ellensburg', region: 'Kittitas County', lat: 46.9965, lon: -120.5478 },
  { name: 'Enumclaw', region: 'King County', lat: 47.2043, lon: -121.9915 },
  { name: 'Ephrata', region: 'Grant County', lat: 47.3176, lon: -119.5537 },
  { name: 'Everett', region: 'Snohomish County', lat: 47.9789, lon: -122.2021 },
  { name: 'Federal Way', region: 'King County', lat: 47.3223, lon: -122.3126 },
  { name: 'Forks', region: 'Clallam County', lat: 47.9504, lon: -124.3855 },
  { name: 'Goldendale', region: 'Klickitat County', lat: 45.8207, lon: -120.8217 },
  { name: 'Grand Coulee', region: 'Grant County', lat: 47.9390, lon: -119.0033 },
  { name: 'Hoquiam', region: 'Grays Harbor County', lat: 46.9809, lon: -123.8893 },
  { name: 'Issaquah', region: 'King County', lat: 47.5301, lon: -122.0326 },
  { name: 'Kelso', region: 'Cowlitz County', lat: 46.1468, lon: -122.9084 },
  { name: 'Kennewick', region: 'Benton County', lat: 46.2087, lon: -119.1190 },
  { name: 'Kent', region: 'King County', lat: 47.3809, lon: -122.2348 },
  { name: 'Kettle Falls', region: 'Stevens County', lat: 48.6107, lon: -118.0558 },
  { name: 'Leavenworth', region: 'Chelan County', lat: 47.5962, lon: -120.6615 },
  { name: 'Longview', region: 'Cowlitz County', lat: 46.1382, lon: -122.9382 },
  { name: 'Moses Lake', region: 'Grant County', lat: 47.1301, lon: -119.2781 },
  { name: 'Mount Vernon', region: 'Skagit County', lat: 48.4212, lon: -122.3340 },
  { name: 'Newport', region: 'Pend Oreille County', lat: 48.1796, lon: -117.0433 },
  { name: 'North Bend', region: 'King County', lat: 47.4957, lon: -121.7868 },
  { name: 'Oak Harbor', region: 'Island County', lat: 48.2932, lon: -122.6432 },
  { name: 'Ocean Shores', region: 'Grays Harbor County', lat: 46.9737, lon: -124.1563 },
  { name: 'Okanogan', region: 'Okanogan County', lat: 48.3610, lon: -119.5834 },
  { name: 'Olympia', region: 'Thurston County', lat: 47.0379, lon: -122.9007 },
  { name: 'Omak', region: 'Okanogan County', lat: 48.4107, lon: -119.5276 },
  { name: 'Pasco', region: 'Franklin County', lat: 46.2396, lon: -119.1006 },
  { name: 'Pateros', region: 'Okanogan County', lat: 48.0521, lon: -119.9034 },
  { name: 'Port Angeles', region: 'Clallam County', lat: 48.1181, lon: -123.4307 },
  { name: 'Port Townsend', region: 'Jefferson County', lat: 48.1170, lon: -122.7604 },
  { name: 'Pullman', region: 'Whitman County', lat: 46.7313, lon: -117.1796 },
  { name: 'Quincy', region: 'Grant County', lat: 47.2343, lon: -119.8526 },
  { name: 'Raymond', region: 'Pacific County', lat: 46.6865, lon: -123.7329 },
  { name: 'Renton', region: 'King County', lat: 47.4829, lon: -122.2171 },
  { name: 'Republic', region: 'Ferry County', lat: 48.6482, lon: -118.7378 },
  { name: 'Richland', region: 'Benton County', lat: 46.2804, lon: -119.2752 },
  { name: 'Ritzville', region: 'Adams County', lat: 47.1274, lon: -118.3797 },
  { name: 'Seattle', region: 'King County', lat: 47.6062, lon: -122.3321 },
  { name: 'Sedro-Woolley', region: 'Skagit County', lat: 48.5039, lon: -122.2361 },
  { name: 'Shelton', region: 'Mason County', lat: 47.2151, lon: -123.1007 },
  { name: 'Snoqualmie', region: 'King County', lat: 47.5287, lon: -121.8254 },
  { name: 'Spokane', region: 'Spokane County', lat: 47.6588, lon: -117.4260 },
  { name: 'Stevenson', region: 'Skamania County', lat: 45.6957, lon: -121.8845 },
  { name: 'Tacoma', region: 'Pierce County', lat: 47.2529, lon: -122.4443 },
  { name: 'Tonasket', region: 'Okanogan County', lat: 48.7052, lon: -119.4398 },
  { name: 'Toppenish', region: 'Yakima County', lat: 46.3774, lon: -120.3087 },
  { name: 'Twisp', region: 'Okanogan County', lat: 48.3635, lon: -120.1217 },
  { name: 'Vancouver', region: 'Clark County', lat: 45.6387, lon: -122.6615 },
  { name: 'Walla Walla', region: 'Walla Walla County', lat: 46.0646, lon: -118.3430 },
  { name: 'Wenatchee', region: 'Chelan County', lat: 47.4235, lon: -120.3103 },
  { name: 'White Salmon', region: 'Klickitat County', lat: 45.7276, lon: -121.4865 },
  { name: 'Winthrop', region: 'Okanogan County', lat: 48.4779, lon: -120.1862 },
  { name: 'Yakima', region: 'Yakima County', lat: 46.6021, lon: -120.5059 },
  { name: 'Yelm', region: 'Thurston County', lat: 46.9420, lon: -122.6059 },
];

function matchingCities() {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return [];

  return WASHINGTON_CITIES
    .filter(city => city.name.toLowerCase().startsWith(q))
    .sort((a, b) => a.name.localeCompare(b.name));
}
