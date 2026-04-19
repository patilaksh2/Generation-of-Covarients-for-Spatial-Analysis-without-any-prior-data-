// ============================================================
//  GOOGLE EARTH ENGINE SCRIPT
//  Title  : Environmental Covariate Generator for Soil Survey
//  Purpose: Generate and export 24 individual environmental
//           covariates for any district/study area in India
//           Used for: cLHS (Conditioned Latin Hypercube Sampling)
//                     DSM (Digital Soil Mapping)
//  Author : Akshay Bhagwan Patil
//  Date   : 2024
//  Reference: Minasny & McBratney (2006) - cLHS method
//
//  ✅ NO EXTERNAL DATA NEEDED — All datasets are freely
//     available inside Google Earth Engine's public catalog.
//
//  HOW TO USE THIS SCRIPT:
//  1. Open https://code.earthengine.google.com
//  2. Paste this entire script into the Code Editor
//  3. Edit ONLY Section 1 (STATE NAME + DISTRICT NAME)
//  4. Click RUN
//  5. Go to the Tasks tab (top-right) → Click RUN on each task
//  6. All 24 GeoTIFFs will appear in your Google Drive
//
//  OUTPUT: 24 individual GeoTIFF files (one per covariate)
//          Saved to Google Drive → folder: GEE_Exports_Covariates
//
//  COVARIATES GENERATED (24 total):
//  Terrain  (01-09): DEM, Slope, Aspect, TWI, TPI, TRI,
//                    Valley Bottom Flatness, LS Factor, Curvature
//  Spectral (10-20): NDVI, EVI, SAVI, BSI, Clay Index,
//                    Iron Oxide, Carbonate, Brightness,
//                    Salinity, NDWI, Red Edge Chlorophyll
//  LULC     (21)   : ESA WorldCover Land Use / Land Cover
//  Climate  (22-24): Annual Precipitation, Mean Temperature, PET
// ============================================================


// ============================================================
// SECTION 1: ⚙️ USER SETTINGS — EDIT THIS SECTION ONLY
//            Change the state and district name to match your
//            study area. All other sections run automatically.
// ============================================================

// ── STEP 1: Set your State and District name ──────────────────
// These names must match exactly as they appear in GAUL 2015
// dataset (English names, title case)
// Example: "Rajasthan" / "Barmer", "Karnataka" / "Dharwad"

var STATE_NAME    = "Your State Name Here";    // e.g. "Maharashtra"
var DISTRICT_NAME = "Your District Name Here"; // e.g. "Nanded"

// ── STEP 2: Set your Sentinel-2 date range ────────────────────
// Use the dry season of your region for best bare soil exposure
// Rabi (Nov–Mar) is ideal for semi-arid India
// Kharif (Jun–Oct) if you want monsoon/vegetation cover

var S2_START_DATE = "2022-11-01"; // Start date (YYYY-MM-DD)
var S2_END_DATE   = "2023-03-31"; // End date   (YYYY-MM-DD)

// ── STEP 3: Set your output CRS (Coordinate Reference System) ──
// Use the UTM zone that covers your district
// Zone 43N (EPSG:32643) → Western India (Gujarat, Rajasthan, MP west)
// Zone 44N (EPSG:32644) → Central India (Maharashtra, MP east, AP)
// Zone 45N (EPSG:32645) → Eastern India (WB, Odisha, Bihar)
// Find your zone: https://mangomap.com/robertyoung/maps/69585

var TARGET_CRS   = "EPSG:32644"; // ← Change this for your region
var TARGET_SCALE = 10;           // Output resolution in meters (10m recommended)

// ── STEP 4: Set your Google Drive export folder name ──────────
// All 24 files will be saved into this folder in your Drive
// The folder will be created automatically if it doesn't exist

var EXPORT_FOLDER = "GEE_Exports_Covariates";

// ── STEP 5: Set a short prefix for all output file names ──────
// Example: "Barmer" → files will be named "Barmer_01_DEM_10m.tif"

var AREA_PREFIX = "StudyArea"; // e.g. "Nanded" or "Barmer"


// ============================================================
// SECTION 2: LOAD STUDY AREA BOUNDARY
//            Uses FAO GAUL 2015 Level-2 (district boundaries)
//            No upload needed — boundary is loaded from GEE catalog
// ============================================================

// FAO GAUL 2015 is a global administrative boundary dataset
// Level-2 = district level for India
var districts = ee.FeatureCollection("FAO/GAUL/2015/level2");

// Filter to your specific state and district
var studyArea = districts
  .filter(ee.Filter.eq("ADM1_NAME", STATE_NAME))    // Filter by state
  .filter(ee.Filter.eq("ADM2_NAME", DISTRICT_NAME)); // Filter by district

// Extract the geometry (polygon) of the study area
var geometry = studyArea.geometry();

// Center the map on your study area and add boundary layer
Map.centerObject(geometry, 9);
Map.addLayer(
  studyArea.style({color: "FF0000", fillColor: "00000000", width: 2}),
  {},
  "Study Area Boundary"
);

// Print to console so you can verify the correct district loaded
print("✅ Study Area loaded:", studyArea);
print("State:", STATE_NAME, "| District:", DISTRICT_NAME);


// ============================================================
// SECTION 3: DIGITAL ELEVATION MODEL (DEM)
//            Source: JAXA ALOS AW3D30 (12.5m native resolution)
//            This is the best freely available DEM for India
//            No download needed — loaded directly from GEE
// ============================================================

// Load ALOS World 3D DEM image collection
// Filter to study area, select DSM band, mosaic tiles, clip to boundary
var alos = ee.ImageCollection("JAXA/ALOS/AW3D30/V3_2")
  .filterBounds(geometry)
  .select("DSM")   // DSM = Digital Surface Model (terrain elevation)
  .mosaic()        // Combine multiple tiles into one seamless image
  .clip(geometry)
  .rename("elevation");

// Use this as the primary DEM for all terrain calculations
var dem = alos;

// Add DEM to map for visual check
Map.addLayer(
  dem,
  {min: 200, max: 800, palette: ["green", "yellow", "brown", "white"]},
  "DEM (ALOS 12.5m)",
  false // false = layer is off by default, toggle on if needed
);


// ============================================================
// SECTION 4: TERRAIN DERIVATIVE COVARIATES (from DEM)
//            All computed directly in GEE — no external software
//            Covariates: Slope, Aspect, TWI, TPI, TRI,
//                        Valley Bottom Flatness, LS Factor, Curvature
// ============================================================

// GEE's built-in terrain analysis function
// Computes slope, aspect, and hillshade from a DEM in one call
var terrain = ee.Terrain.products(dem);

// ── 4a. SLOPE ────────────────────────────────────────────────
// Slope angle in degrees (0 = flat, 90 = vertical cliff)
// High slope → more erosion, less water retention → affects soil depth
var slope = terrain.select("slope").rename("slope");

// ── 4b. ASPECT ───────────────────────────────────────────────
// Direction the slope faces, in degrees (0/360=N, 90=E, 180=S, 270=W)
// Affects solar radiation → temperature → soil moisture → vegetation
var aspect = terrain.select("aspect").rename("aspect");

// ── 4c. CURVATURE ────────────────────────────────────────────
// Second derivative of elevation — measures surface concavity/convexity
// Positive = convex (ridge), Negative = concave (valley/hollow)
// Affects water flow, soil accumulation, and erosion patterns
var curvature = dem.convolve(ee.Kernel.laplacian8()).rename("curvature");

// ── 4d. TOPOGRAPHIC WETNESS INDEX (TWI) ─────────────────────
// TWI = ln(contributing area / tan(slope))
// High TWI → flat low areas with high soil moisture (valley floors)
// Low TWI  → steep ridges with fast drainage (dry soils)

// Convert slope from degrees to radians for trigonometry
var slopeRad = slope.multiply(Math.PI / 180);

// tan(slope) — avoid division by zero on perfectly flat areas
var tanSlope = slopeRad.tan().max(0.001);

// Compute gradient magnitude from DEM as a proxy for contributing area
// This is a GEE-compatible approximation of TWI
var gradX = dem.gradient().select("x"); // East-West gradient
var gradY = dem.gradient().select("y"); // North-South gradient

var gradMag = gradX.pow(2)
  .add(gradY.pow(2))
  .sqrt()
  .max(0.001)           // Avoid log(0)
  .rename("gradient_magnitude");

// TWI = ln(1/gradient) - ln(tan(slope))
// Note: For highly precise TWI, export DEM and compute in SAGA GIS
var twiFinal = gradMag.pow(-1).log()
  .subtract(tanSlope.log())
  .rename("TWI");

Map.addLayer(twiFinal,
  {min: 0, max: 15, palette: ["red", "yellow", "blue"]},
  "TWI", false);

// ── 4e. TOPOGRAPHIC POSITION INDEX (TPI) ─────────────────────
// TPI = pixel elevation − mean elevation of surrounding neighborhood
// Positive TPI = local high point (ridge/hilltop)
// Negative TPI = local low point (valley/depression)
// ~Zero TPI   = mid-slope or flat area

var tpiKernel = ee.Kernel.circle({radius: 300, units: "meters"});
var demMean   = dem.reduceNeighborhood(ee.Reducer.mean(), tpiKernel);
var tpi       = dem.subtract(demMean).rename("TPI");

Map.addLayer(tpi,
  {min: -50, max: 50, palette: ["blue", "white", "red"]},
  "TPI", false);

// ── 4f. TERRAIN RUGGEDNESS INDEX (TRI) ───────────────────────
// TRI = standard deviation of elevation in a circular neighborhood
// High TRI = rough/complex terrain (hills, ridges)
// Low TRI  = smooth/flat terrain (plains, plateaus)

var triKernel = ee.Kernel.circle({radius: 150, units: "meters"});
var tri = dem.reduceNeighborhood(ee.Reducer.stdDev(), triKernel)
  .rename("TRI");

Map.addLayer(tri,
  {min: 0, max: 30, palette: ["white", "orange", "red"]},
  "TRI", false);

// ── 4g. VALLEY BOTTOM FLATNESS (VBF) ─────────────────────────
// Identifies low-lying flat areas — likely valley floors
// Computed as: low slope (< 5°) AND negative TPI (below surroundings)
// VBF = 1 where conditions are met, 0 elsewhere (binary layer)
// Useful for mapping alluvial soils, waterlogging, irrigation potential

var vbf = slope.lt(5)          // Flat areas (slope < 5 degrees)
  .and(tpi.lt(0))              // Below surrounding landscape
  .rename("VBF")
  .toFloat();

// ── 4h. LS FACTOR (Slope Length × Steepness) ─────────────────
// Simplified RUSLE LS factor for soil erosion estimation
// LS = (sin(slope) / 0.0896)^1.3
// High LS = steep and long slopes → high erosion risk

var lsFactor = slope.divide(100).sin()
  .divide(0.0896)
  .pow(1.3)
  .rename("LS_factor");


// ============================================================
// SECTION 5: SENTINEL-2 SPECTRAL INDEX COVARIATES
//            Source: Copernicus S2 SR Harmonized (10m native)
//            Dry season imagery for maximum bare soil exposure
//            Dates controlled by S2_START_DATE / S2_END_DATE above
//            No download needed — imagery loaded from GEE catalog
// ============================================================

// ── 5a. Load and cloud-mask Sentinel-2 imagery ───────────────
// Cloud masking function using the Scene Classification Layer (SCL)
// Removes clouds, cloud shadows, cirrus, and snow pixels
function maskS2clouds(image) {
  var scl = image.select("SCL");
  var mask = scl.neq(3)   // Remove: cloud shadow
    .and(scl.neq(8))      // Remove: cloud medium probability
    .and(scl.neq(9))      // Remove: cloud high probability
    .and(scl.neq(10))     // Remove: thin cirrus
    .and(scl.neq(11));    // Remove: snow / ice
  return image.updateMask(mask);
}

// Load Sentinel-2 Surface Reflectance collection
// Filter by: study area boundary, date range, cloud cover < 10%
var s2Collection = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
  .filterBounds(geometry)
  .filterDate(S2_START_DATE, S2_END_DATE)
  .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 10))
  .map(maskS2clouds); // Apply cloud mask to each image

// Print how many cloud-free images were found in your date range
print("✅ Sentinel-2 cloud-free images found:", s2Collection.size());

// Create a median composite (most cloud-free, representative pixel)
// Divide by 10000 to convert DN values to 0–1 reflectance scale
var s2 = s2Collection
  .select(["B2","B3","B4","B5","B6","B7","B8","B8A","B11","B12"])
  .median()
  .divide(10000)  // Scale factor: S2 SR values are in units of 10,000
  .clip(geometry);

// ── 5b. NDVI — Normalized Difference Vegetation Index ─────────
// NDVI = (NIR - Red) / (NIR + Red)
// Range: -1 to +1 | High NDVI = dense vegetation | Low/negative = bare soil
// Essential for separating soil from vegetation in survey areas
var ndvi = s2.normalizedDifference(["B8", "B4"]).rename("NDVI");

Map.addLayer(ndvi,
  {min: -0.2, max: 0.8, palette: ["brown", "yellow", "green"]},
  "NDVI", false);

// ── 5c. EVI — Enhanced Vegetation Index ───────────────────────
// EVI = 2.5 × (NIR - Red) / (NIR + 6×Red - 7.5×Blue + 1)
// Less saturated than NDVI in dense vegetation areas
// Better performance in high-biomass and high-aerosol conditions
var evi = s2.expression(
  "2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))",
  {"NIR": s2.select("B8"), "RED": s2.select("B4"), "BLUE": s2.select("B2")}
).rename("EVI");

// ── 5d. SAVI — Soil Adjusted Vegetation Index ─────────────────
// SAVI = ((NIR - Red) / (NIR + Red + L)) × (1 + L) where L = 0.5
// Corrects NDVI for soil brightness — ideal for semi-arid/sparse veg areas
// L = 0.5 is standard for intermediate vegetation density
var L = 0.5;
var savi = s2.expression(
  "((NIR - RED) / (NIR + RED + L)) * (1 + L)",
  {"NIR": s2.select("B8"), "RED": s2.select("B4"), "L": L}
).rename("SAVI");

// ── 5e. BSI — Bare Soil Index ─────────────────────────────────
// BSI = ((SWIR1 + Red) - (NIR + Blue)) / ((SWIR1 + Red) + (NIR + Blue))
// Positive BSI = bare/exposed soil surface
// Negative BSI = vegetated surface
// Very useful for mapping soil spatial extent in cultivated areas
var bsi = s2.expression(
  "((SWIR1 + RED) - (NIR + BLUE)) / ((SWIR1 + RED) + (NIR + BLUE))",
  {
    "SWIR1": s2.select("B11"),
    "RED":   s2.select("B4"),
    "NIR":   s2.select("B8"),
    "BLUE":  s2.select("B2")
  }
).rename("BSI");

Map.addLayer(bsi,
  {min: -0.5, max: 0.5, palette: ["green", "white", "brown"]},
  "Bare Soil Index (BSI)", false);

// ── 5f. CLAY MINERAL INDEX ────────────────────────────────────
// Clay Index = SWIR1 / SWIR2 (B11 / B12)
// Detects clay minerals and hydroxyl-bearing minerals in soil
// High values → clay-rich or weathered soils (smectite, kaolinite)
var clayIndex = s2.select("B11")
  .divide(s2.select("B12"))
  .rename("Clay_Index");

Map.addLayer(clayIndex,
  {min: 0.5, max: 2.5, palette: ["white", "orange", "red"]},
  "Clay Mineral Index", false);

// ── 5g. IRON OXIDE INDEX ─────────────────────────────────────
// Iron Oxide = Red / Blue (B4 / B2)
// Detects iron-rich soils (laterite, red soils, ferrallic horizons)
// High ratio → Fe-rich surface (common in Deccan plateau soils)
var ironOxide = s2.select("B4")
  .divide(s2.select("B2"))
  .rename("Iron_Oxide");

// ── 5h. CARBONATE INDEX ──────────────────────────────────────
// Carbonate Index = Green / SWIR1 (B3 / B11)
// Detects carbonate-bearing materials (limestone, calcic horizons)
// Useful in semi-arid soils where CaCO3 accumulates in subsurface
var carbonate = s2.select("B3")
  .divide(s2.select("B11"))
  .rename("Carbonate_Index");

// ── 5i. BRIGHTNESS INDEX ──────────────────────────────────────
// Brightness Index = sqrt((Red² + NIR²) / 2)
// Measures overall surface reflectance / albedo
// High brightness = sandy/light-colored soils or bare surfaces
// Helps distinguish soil texture classes (sand vs. dark clay)
var brightness = s2.select("B4").pow(2)
  .add(s2.select("B8").pow(2))
  .divide(2)
  .sqrt()
  .rename("Brightness_Index");

// ── 5j. SALINITY INDEX ────────────────────────────────────────
// Salinity Index = sqrt(Blue × Red) — (sqrt of B2 × B4)
// Salt-affected soils have very high reflectance in blue and red
// High SI = potential saline/sodic soils (important in irrigated areas)
var salinity = s2.select("B2")
  .multiply(s2.select("B4"))
  .sqrt()
  .rename("Salinity_Index");

// ── 5k. NDWI — Normalized Difference Water Index ──────────────
// NDWI = (Green - NIR) / (Green + NIR)
// Positive = water bodies / waterlogged areas
// Negative = dry land / vegetation
// Useful for drainage mapping and identifying hydromorphic soils
var ndwi = s2.normalizedDifference(["B3", "B8"]).rename("NDWI");

// ── 5l. RED EDGE CHLOROPHYLL INDEX (CI Red Edge) ──────────────
// CI_re = (NIR / RedEdge1) - 1   (B8 / B5 - 1)
// Sensitive to chlorophyll content and crop health
// Helps separate vigorous crop areas from stressed or bare soil
var ciRededge = s2.select("B8")
  .divide(s2.select("B5"))
  .subtract(1)
  .rename("CI_RedEdge");


// ============================================================
// SECTION 6: LAND USE / LAND COVER (LULC)
//            Source: ESA WorldCover 2021 (10m resolution)
//            Global coverage — no upload needed
//            Classes: Trees, Shrubs, Grassland, Cropland,
//                     Built-up, Bare soil, Water, Wetland
// ============================================================

// ESA WorldCover class values:
// 10=Trees, 20=Shrubland, 30=Grassland, 40=Cropland,
// 50=Built-up, 60=Bare/sparse veg, 70=Snow/ice,
// 80=Water, 90=Herbaceous wetland, 95=Mangroves, 100=Moss/lichen
var worldcover = ee.ImageCollection("ESA/WorldCover/v200")
  .first()          // Only one image (2021 global mosaic)
  .clip(geometry)
  .rename("LULC");

Map.addLayer(worldcover, {
  min: 10, max: 100,
  palette: ["006400","ffbb22","ffff4c","f096ff",
            "fa0000","b4b4b4","f0f0f0","0064c8",
            "0096a0","00cf75","fae6a0"]
}, "ESA WorldCover LULC", false);


// ============================================================
// SECTION 7: CLIMATE COVARIATES
//            All climate data loaded directly from GEE catalog
//            Long-term means computed over 5 years (2018–2023)
//            Sources: CHIRPS (rainfall), ERA5-Land (temp), MODIS (PET)
// ============================================================

// ── 7a. ANNUAL MEAN PRECIPITATION ────────────────────────────
// Source: CHIRPS Pentad (Climate Hazards Group InfraRed Precipitation)
// Spatial resolution: ~5.5 km | Temporal: 5-day averages (pentad)
// We sum all pentads over 5 years, then divide by 5 → annual mean
// Rainfall is a primary driver of soil formation and leaching
var chirps = ee.ImageCollection("UCSB-CHG/CHIRPS/PENTAD")
  .filterBounds(geometry)
  .filterDate("2018-01-01", "2023-12-31")
  .select("precipitation")
  .sum()            // Total precipitation over 5 years
  .divide(5)        // Divide by 5 → annual mean in mm/year
  .clip(geometry)
  .rename("Annual_Precip_mm");

// ── 7b. MEAN ANNUAL TEMPERATURE ──────────────────────────────
// Source: ECMWF ERA5-Land Monthly Aggregates
// Spatial resolution: ~11 km | Unit: Kelvin → converted to Celsius
// Temperature drives soil weathering, organic matter decomposition
var era5 = ee.ImageCollection("ECMWF/ERA5_LAND/MONTHLY_AGGR")
  .filterBounds(geometry)
  .filterDate("2018-01-01", "2023-12-31")
  .select("temperature_2m")
  .mean()
  .subtract(273.15) // Convert Kelvin to Celsius (K - 273.15 = °C)
  .clip(geometry)
  .rename("Mean_Temp_C");

// ── 7c. POTENTIAL EVAPOTRANSPIRATION (PET) ───────────────────
// Source: MODIS MOD16A2GF (Global Evapotranspiration, 8-day, 500m)
// Scale factor: 0.1 (multiply raw values by 0.1 to get mm/day)
// PET indicates atmospheric water demand — controls soil water balance
var pet = ee.ImageCollection("MODIS/061/MOD16A2GF")
  .filterBounds(geometry)
  .filterDate("2018-01-01", "2023-12-31")
  .select("PET")
  .mean()
  .multiply(0.1)    // Apply MODIS scale factor → converts to mm/8-days
  .clip(geometry)
  .rename("PET_mm");


// ============================================================
// SECTION 8: REPROJECT ALL LAYERS TO COMMON GRID
//            All layers reprojected to the same CRS and scale
//            so they perfectly align for sampling operations
//            CRS and scale are set in Section 1 (User Settings)
// ============================================================

// Helper function to reproject and rename any image layer
// This ensures all layers have identical pixel alignment
function reprojectLayer(image, name) {
  return image
    .reproject({crs: TARGET_CRS, scale: TARGET_SCALE})
    .rename(name);
}

// ── Terrain layers (from ALOS DEM, Section 3–4) ──────────────
var dem_r   = reprojectLayer(dem,      "elevation");
var slope_r = reprojectLayer(slope,    "slope");
var aspect_r= reprojectLayer(aspect,   "aspect");
var twi_r   = reprojectLayer(twiFinal, "TWI");
var tpi_r   = reprojectLayer(tpi,      "TPI");
var tri_r   = reprojectLayer(tri,      "TRI");
var vbf_r   = reprojectLayer(vbf,      "VBF");
var ls_r    = reprojectLayer(lsFactor, "LS_factor");
var curv_r  = reprojectLayer(curvature,"curvature");

// ── Spectral layers (from Sentinel-2, Section 5) ─────────────
var ndvi_r   = reprojectLayer(ndvi,      "NDVI");
var evi_r    = reprojectLayer(evi,       "EVI");
var savi_r   = reprojectLayer(savi,      "SAVI");
var bsi_r    = reprojectLayer(bsi,       "BSI");
var clay_r   = reprojectLayer(clayIndex, "Clay_Index");
var iron_r   = reprojectLayer(ironOxide, "Iron_Oxide");
var carb_r   = reprojectLayer(carbonate, "Carbonate_Index");
var bright_r = reprojectLayer(brightness,"Brightness_Index");
var sal_r    = reprojectLayer(salinity,  "Salinity_Index");
var ndwi_r   = reprojectLayer(ndwi,      "NDWI");
var ci_r     = reprojectLayer(ciRededge, "CI_RedEdge");

// ── LULC layer (from ESA WorldCover, Section 6) ───────────────
var lulc_r   = worldcover
  .reproject({crs: TARGET_CRS, scale: TARGET_SCALE})
  .rename("LULC");

// ── Climate layers (from CHIRPS, ERA5, MODIS, Section 7) ──────
// Note: Climate data has coarse native resolution (5–11 km)
// Reprojecting to 10m is spatial resampling (bilinear interpolation)
// This provides pixel alignment but does NOT increase actual resolution
var precip_r = chirps
  .reproject({crs: TARGET_CRS, scale: TARGET_SCALE})
  .rename("Annual_Precip_mm");

var temp_r   = era5
  .reproject({crs: TARGET_CRS, scale: TARGET_SCALE})
  .rename("Mean_Temp_C");

var pet_r    = pet
  .reproject({crs: TARGET_CRS, scale: TARGET_SCALE})
  .rename("PET_mm");


// ============================================================
// SECTION 9: PRINT SUMMARY TO CONSOLE
//            Verify everything is working before exporting
// ============================================================

print("══════════════════════════════════════════");
print("✅ COVARIATE GENERATION SUMMARY");
print("══════════════════════════════════════════");
print("Study Area State    :", STATE_NAME);
print("Study Area District :", DISTRICT_NAME);
print("Sentinel-2 Period   :", S2_START_DATE, "to", S2_END_DATE);
print("Output CRS          :", TARGET_CRS);
print("Output Resolution   :", TARGET_SCALE, "meters");
print("Export Folder       :", EXPORT_FOLDER);
print("File Name Prefix    :", AREA_PREFIX);
print("──────────────────────────────────────────");
print("DEM Source     : JAXA ALOS AW3D30 (12.5m)");
print("Imagery Source : Sentinel-2 SR Harmonized (10m)");
print("LULC Source    : ESA WorldCover v200 (2021, 10m)");
print("Rainfall Source: CHIRPS Pentad (~5.5km)");
print("Temp Source    : ECMWF ERA5-Land Monthly (~11km)");
print("PET Source     : MODIS MOD16A2GF (500m)");
print("──────────────────────────────────────────");
print("Total covariates to export: 24");
print("Go to TASKS tab (top-right) → Click RUN on each task");
print("Files saved to Google Drive →", EXPORT_FOLDER);
print("══════════════════════════════════════════");


// ============================================================
// SECTION 10: EXPORT ALL 24 COVARIATES INDIVIDUALLY
//
//  📁 OUTPUT LOCATION IN GOOGLE DRIVE:
//     My Drive → GEE_Exports_Covariates → (your files here)
//     Example path: My Drive/GEE_Exports_Covariates/
//
//  📄 FILE NAMING FORMAT:
//     {AREA_PREFIX}_{number}_{CovariateNme}_10m.tif
//     Example: StudyArea_01_DEM_10m.tif
//
//  ⚙️  HOW TO EXPORT:
//     1. Click RUN to execute the script
//     2. Click the TASKS tab (top-right panel in GEE)
//     3. Click the blue RUN button next to each task
//     4. Choose your Google Drive destination and confirm
//     5. Monitor progress in the Tasks panel
//
//  ⚠️  NOTE: Large districts may take 10–30 mins per export
//             You can submit all tasks at once and they run in parallel
// ============================================================

// ── Helper export function to avoid code repetition ───────────
// This function creates one export task per covariate
function exportCovariate(image, number, name) {
  Export.image.toDrive({
    image         : image.toFloat(), // Convert to Float32 for compatibility
    description   : number + "_" + name,           // Task name in GEE Tasks panel
    folder        : EXPORT_FOLDER,                 // Google Drive folder
    fileNamePrefix: AREA_PREFIX + "_" + number + "_" + name + "_" + TARGET_SCALE + "m",
    scale         : TARGET_SCALE,                  // Pixel size in meters
    crs           : TARGET_CRS,                    // Coordinate reference system
    region        : geometry,                      // Clip to study area
    maxPixels     : 1e13,                          // Allow large exports
    fileFormat    : "GeoTIFF"                      // Standard raster format
  });
}

// ── GROUP 1: TERRAIN COVARIATES (01–09) ──────────────────────
// Source: JAXA ALOS AW3D30 DEM (12.5m → resampled to 10m)

exportCovariate(dem_r,    "01", "DEM_Elevation");
// Digital Elevation Model — base layer for all terrain derivatives

exportCovariate(slope_r,  "02", "Slope");
// Slope angle in degrees — controls runoff, erosion, soil depth

exportCovariate(aspect_r, "03", "Aspect");
// Slope facing direction — controls microclimate and moisture

exportCovariate(twi_r,    "04", "TWI_TopographicWetnessIndex");
// Soil moisture proxy — high TWI = wet valley floors

exportCovariate(tpi_r,    "05", "TPI_TopographicPositionIndex");
// Landscape position — ridge vs valley identification

exportCovariate(tri_r,    "06", "TRI_TerrainRuggednessIndex");
// Surface roughness — complex terrain vs smooth plains

exportCovariate(vbf_r,    "07", "VBF_ValleyBottomFlatness");
// Binary: 1=valley floor, 0=elsewhere — alluvial soil zones

exportCovariate(ls_r,     "08", "LS_SlopeLengthFactor");
// RUSLE erosion factor — soil erosion risk mapping

exportCovariate(curv_r,   "09", "Curvature");
// Surface curvature — water convergence/divergence zones


// ── GROUP 2: SPECTRAL INDEX COVARIATES (10–20) ───────────────
// Source: Sentinel-2 SR Harmonized (10m native resolution)

exportCovariate(ndvi_r,   "10", "NDVI_VegetationIndex");
// Vegetation health — separates crops from bare soil

exportCovariate(evi_r,    "11", "EVI_EnhancedVegetationIndex");
// Better NDVI for dense veg — less atmospheric noise

exportCovariate(savi_r,   "12", "SAVI_SoilAdjustedVegetationIndex");
// Vegetation index corrected for soil brightness — ideal for sparse veg

exportCovariate(bsi_r,    "13", "BSI_BareSoilIndex");
// Bare soil exposure — high BSI = uncovered/exposed soil surface

exportCovariate(clay_r,   "14", "ClayMineralIndex");
// Clay mineral detection — smectite, kaolinite identification

exportCovariate(iron_r,   "15", "IronOxideIndex");
// Iron-rich soils — laterite, red soils (common in Deccan)

exportCovariate(carb_r,   "16", "CarbonateIndex");
// Calcium carbonate (CaCO3) detection — calcic/petrocalcic horizons

exportCovariate(bright_r, "17", "BrightnessIndex");
// Overall soil albedo — separates sandy vs dark clay soils

exportCovariate(sal_r,    "18", "SalinityIndex");
// Salt-affected soil detection — saline/sodic soils in irrigated areas

exportCovariate(ndwi_r,   "19", "NDWI_WaterIndex");
// Water body and waterlogged area detection — hydromorphic soils

exportCovariate(ci_r,     "20", "CIRedEdge_ChlorophyllIndex");
// Chlorophyll and crop health index — stress vs vigorous vegetation


// ── GROUP 3: LULC AND CLIMATE COVARIATES (21–24) ─────────────

exportCovariate(lulc_r,   "21", "LULC_LandUseLandCover");
// Land use / land cover classes — ESA WorldCover 2021 (10m)
// Categorical: 10=Trees, 40=Cropland, 60=Bare, 80=Water, etc.

exportCovariate(precip_r, "22", "AnnualPrecipitation_mm");
// Mean annual rainfall in mm — CHIRPS pentad (2018–2023 average)

exportCovariate(temp_r,   "23", "MeanAnnualTemperature_C");
// Mean annual temperature in °C — ERA5-Land (2018–2023 average)

exportCovariate(pet_r,    "24", "PET_PotentialEvapotranspiration_mm");
// Potential evapotranspiration — MODIS MOD16A2 (2018–2023 average)


// ============================================================
// ✅ DONE! ALL 24 EXPORT TASKS HAVE BEEN SUBMITTED
//
//  NEXT STEPS AFTER DOWNLOAD (in R):
//  ─────────────────────────────────
//  library(terra)
//  library(clhs)
//
//  # Load all 24 GeoTIFF files as a raster stack
//  files <- list.files("path/to/GEE_Exports_Covariates/",
//                       pattern = "*.tif", full.names = TRUE)
//  r <- rast(files)
//
//  # Sample a large number of pixels for cLHS input
//  s <- spatSample(r, size = 50000, method = "regular",
//                  na.rm = TRUE, as.df = TRUE)
//
//  # Run cLHS — set size = number of field sites you want
//  result <- clhs(s, size = 150, progress = TRUE, iter = 10000)
//
//  # Extract XY coordinates of selected sample points
//  pts <- spatSample(r, size = 50000, method = "regular",
//                    na.rm = TRUE, xy = TRUE)
//  sample_pts <- pts[result$index_samples, ]
//
//  # Save as shapefile for field use
//  library(sf)
//  sf_pts <- st_as_sf(sample_pts, coords = c("x","y"), crs = 32644)
//  st_write(sf_pts, "cLHS_Sampling_Points.shp")
//
//  Reference: Minasny & McBratney (2006)
//             doi:10.1016/j.geoderma.2005.12.009
// ============================================================
