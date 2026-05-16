// ── config.js ──────────────────────────────────────────────
// Central place for API endpoints, shared state, and fallback data.
// If you need to add a new API, add its URL here.

// API endpoints
const FEMA_URL     = 'https://gis.fema.gov/arcgis/rest/services/NSS/OpenShelters/MapServer/0/query';
const WA_FIRE_URL  = 'https://services.arcgis.com/jsIt88o7TZTB5wLX/arcgis/rest/services/WA_Wildfires/FeatureServer/0/query';
const WA_FIRE_FALLBACK = 'https://geo.wa.gov/datasets/dabefcb8f03549b49bee7564d4c3c4b5_2/FeatureServer/2/query';

// Shared app state — all JS files read/write these
let allShelters   = [];
let allFires      = [];
let shelterMarkers = [];
let fireMarkers   = [];
let shelterFilter  = 'all';
let fireYearFilter = 'all';
let searchQuery    = '';

// Fallback shelter locations used when FEMA has no active disaster shelters.
// FEMA only populates their live feed during declared disasters, so these
// known WA venues are shown as "sample" data in the meantime.
const FALLBACK_SHELTERS = [
  { name: 'Seattle Center',              address: '305 Harrison St, Seattle, WA 98109',                  status: 'Open', capacity: 800,  lat: 47.6205, lon: -122.3493, mock: true },
  { name: 'CenturyLink Field Event Center', address: '800 Occidental Ave S, Seattle, WA 98134',          status: 'Open', capacity: 1200, lat: 47.5952, lon: -122.3316, mock: true },
  { name: 'Tacoma Dome',                 address: '2727 E D St, Tacoma, WA 98421',                       status: 'Open', capacity: 2000, lat: 47.2354, lon: -122.4281, mock: true },
  { name: 'Spokane Convention Center',   address: '334 W Spokane Falls Blvd, Spokane, WA 99201',         status: 'Open', capacity: 1500, lat: 47.6588, lon: -117.4260, mock: true },
  { name: 'Yakima SunDome',              address: '1301 S Fair Ave, Yakima, WA 98901',                   status: 'Open', capacity: 900,  lat: 46.5995, lon: -120.5322, mock: true },
  { name: 'Bellingham Civic Field',      address: '1001 N State St, Bellingham, WA 98225',               status: 'Open', capacity: 500,  lat: 48.7519, lon: -122.4787, mock: true },
  { name: 'Wenatchee Convention Center', address: '121 N Wenatchee Ave, Wenatchee, WA 98801',            status: 'Open', capacity: 400,  lat: 47.4235, lon: -120.3103, mock: true },
  { name: 'Kennewick Toyota Center',     address: '7000 W Grandridge Blvd, Kennewick, WA 99336',         status: 'Open', capacity: 700,  lat: 46.2087, lon: -119.2248, mock: true },
  { name: 'Olympia Timberland Library',  address: '313 8th Ave SE, Olympia, WA 98501',                   status: 'Open', capacity: 300,  lat: 47.0379, lon: -122.9007, mock: true },
  { name: 'Everett Community College',   address: '2000 Tower St, Everett, WA 98201',                    status: 'Open', capacity: 600,  lat: 47.9790, lon: -122.2021, mock: true },
];