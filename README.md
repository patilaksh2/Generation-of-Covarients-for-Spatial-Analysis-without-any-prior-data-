# 🌍 Environmental Covariate Generator — Google Earth Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Platform: GEE](https://img.shields.io/badge/Platform-Google%20Earth%20Engine-4285F4?logo=google)](https://code.earthengine.google.com)
[![Language: JavaScript](https://img.shields.io/badge/Language-JavaScript-F7DF1E?logo=javascript)](https://code.earthengine.google.com)
[![Data: Free & Public](https://img.shields.io/badge/Data-Free%20%26%20Public-brightgreen)](#data-sources)

> A Google Earth Engine script to generate **24 individual environmental covariates** for any district in India — fully automated, no external data download required. Designed for **cLHS soil survey design** and **Digital Soil Mapping (DSM)**.

---

## 📌 What This Script Does

This script automatically generates and exports **24 environmental covariates** as individual GeoTIFF files for any user-defined study area (district level). All data is sourced from freely available public datasets hosted inside Google Earth Engine — no uploads or downloads are needed before running.

The covariates cover **terrain morphology**, **spectral soil properties**, **land use**, and **climate** — providing a comprehensive environmental characterisation for conditioned Latin Hypercube Sampling (cLHS) and soil mapping workflows.

---

## ✅ Key Features

- Works for **any district in India** — just change 2 lines of code
- **Zero external data needed** — all datasets are in GEE's public catalog
- Exports **24 individual GeoTIFF files** (one per covariate) to Google Drive
- Outputs at **10 m resolution** in UTM projection
- Fully commented — readable by anyone, even without GEE experience
- Ready for direct import into R (`terra`, `clhs`) or QGIS / ArcGIS

---

## 🗂️ Covariates Generated (24 Total)

### Group 1 — Terrain Covariates (01–09)
Source: JAXA ALOS AW3D30 DEM (12.5 m)

| # | File Name | Description |
|---|-----------|-------------|
| 01 | `_01_DEM_Elevation` | Digital Elevation Model (m) |
| 02 | `_02_Slope` | Slope angle in degrees |
| 03 | `_03_Aspect` | Slope facing direction (0–360°) |
| 04 | `_04_TWI` | Topographic Wetness Index |
| 05 | `_05_TPI` | Topographic Position Index |
| 06 | `_06_TRI` | Terrain Ruggedness Index |
| 07 | `_07_VBF` | Valley Bottom Flatness (binary) |
| 08 | `_08_LS_Factor` | Slope Length-Steepness Factor (RUSLE) |
| 09 | `_09_Curvature` | Surface curvature |

### Group 2 — Spectral Covariates (10–20)
Source: Sentinel-2 SR Harmonized (10 m)

| # | File Name | Description |
|---|-----------|-------------|
| 10 | `_10_NDVI` | Normalized Difference Vegetation Index |
| 11 | `_11_EVI` | Enhanced Vegetation Index |
| 12 | `_12_SAVI` | Soil Adjusted Vegetation Index |
| 13 | `_13_BSI` | Bare Soil Index |
| 14 | `_14_ClayMineralIndex` | Clay mineral detection (SWIR1/SWIR2) |
| 15 | `_15_IronOxideIndex` | Iron oxide detection (Red/Blue) |
| 16 | `_16_CarbonateIndex` | Carbonate detection (Green/SWIR1) |
| 17 | `_17_BrightnessIndex` | Overall soil brightness/albedo |
| 18 | `_18_SalinityIndex` | Salt-affected soil detection |
| 19 | `_19_NDWI` | Normalized Difference Water Index |
| 20 | `_20_CIRedEdge` | Red Edge Chlorophyll Index |

### Group 3 — LULC & Climate (21–24)

| # | File Name | Source | Description |
|---|-----------|--------|-------------|
| 21 | `_21_LULC` | ESA WorldCover v200 (10 m) | Land Use / Land Cover classes |
| 22 | `_22_AnnualPrecipitation_mm` | CHIRPS Pentad | Mean annual rainfall (mm/yr) |
| 23 | `_23_MeanAnnualTemperature_C` | ERA5-Land Monthly | Mean annual temperature (°C) |
| 24 | `_24_PET` | MODIS MOD16A2GF | Potential Evapotranspiration (mm) |

---

## 📦 Data Sources — No Downloads Required

All datasets are freely available inside Google Earth Engine. The script loads them automatically.

| Dataset | GEE Catalog ID | Native Resolution |
|---------|---------------|-------------------|
| JAXA ALOS AW3D30 DEM | `JAXA/ALOS/AW3D30/V3_2` | 12.5 m |
| Sentinel-2 SR Harmonized | `COPERNICUS/S2_SR_HARMONIZED` | 10 m |
| ESA WorldCover 2021 | `ESA/WorldCover/v200` | 10 m |
| CHIRPS Pentad Rainfall | `UCSB-CHG/CHIRPS/PENTAD` | ~5.5 km |
| ERA5-Land Monthly Temp | `ECMWF/ERA5_LAND/MONTHLY_AGGR` | ~11 km |
| MODIS PET (MOD16A2GF) | `MODIS/061/MOD16A2GF` | 500 m |
| FAO GAUL Boundaries | `FAO/GAUL/2015/level2` | Vector |

---

## 🚀 How to Use

### Step 1 — Open Google Earth Engine
Go to [code.earthengine.google.com](https://code.earthengine.google.com)
*(You need a free GEE account — sign up at [earthengine.google.com](https://earthengine.google.com))*

### Step 2 — Paste the Script
Copy the contents of `covariate_generator_GEE.js` and paste it into the GEE Code Editor.

### Step 3 — Edit Section 1 Only
Find **SECTION 1** at the top of the script and change these values:

```javascript
var STATE_NAME    = "Your State Name Here";    // e.g. "Maharashtra"
var DISTRICT_NAME = "Your District Name Here"; // e.g. "Nanded"
var S2_START_DATE = "2022-11-01";              // Dry season start
var S2_END_DATE   = "2023-03-31";              // Dry season end
var TARGET_CRS    = "EPSG:32644";              // UTM zone for your area
var EXPORT_FOLDER = "GEE_Exports_Covariates";  // Google Drive folder name
var AREA_PREFIX   = "StudyArea";               // Prefix for output filenames
```

### Step 4 — Run the Script
Click the **Run** button at the top of the Code Editor.

### Step 5 — Start Export Tasks
1. Click the **Tasks** tab in the top-right panel
2. Click the blue **RUN** button next to each of the 24 tasks
3. Confirm the export settings and click **Run** again

### Step 6 — Collect Your Files
All 24 GeoTIFF files will appear in your **Google Drive** at:

```
My Drive/
└── GEE_Exports_Covariates/
    ├── StudyArea_01_DEM_Elevation_10m.tif
    ├── StudyArea_02_Slope_10m.tif
    ├── StudyArea_03_Aspect_10m.tif
    ├── ...
    └── StudyArea_24_PET_10m.tif
```

---

## 🗺️ Finding Your UTM Zone

Use the correct UTM zone CRS for your district:

| Region | States | CRS |
|--------|--------|-----|
| Western India | Gujarat, Rajasthan, MP (west) | `EPSG:32643` |
| Central India | Maharashtra, MP (east), Telangana, AP | `EPSG:32644` |
| Eastern India | West Bengal, Odisha, Bihar, Jharkhand | `EPSG:32645` |

Find your exact zone: [mangomap.com/robertyoung/maps/69585](https://mangomap.com/robertyoung/maps/69585)

---

## 🔬 Applications

- **Conditioned Latin Hypercube Sampling (cLHS)** — optimal field sampling design for soil surveys
- **Digital Soil Mapping (DSM)** — training data and prediction covariates for ML-based soil models
- **Land Degradation Assessment** — mapping erosion, salinity, and waterlogging
- **Precision Agriculture** — variable rate management zone delineation
- **Environmental Modelling** — input layers for hydrological or ecological models

---

## 🧑‍💻 Next Steps in R (cLHS Workflow)

After downloading your 24 GeoTIFF files, run cLHS sampling in R:

```r
library(terra)
library(clhs)
library(sf)

# Load all 24 GeoTIFF files from your Drive folder
files <- list.files("path/to/GEE_Exports_Covariates/",
                     pattern = "*.tif", full.names = TRUE)
r <- rast(files)

# Sample a large grid of pixels as input to cLHS
s <- spatSample(r, size = 50000, method = "regular",
                na.rm = TRUE, as.df = TRUE)

# Run cLHS — size = number of field sampling sites you want
result <- clhs(s, size = 150, progress = TRUE, iter = 10000)

# Extract XY coordinates of selected sample points
pts <- spatSample(r, size = 50000, method = "regular",
                  na.rm = TRUE, xy = TRUE)
sample_pts <- pts[result$index_samples, ]

# Save as shapefile for use in field GPS / QGIS / ArcGIS
sf_pts <- st_as_sf(sample_pts, coords = c("x","y"), crs = 32644)
st_write(sf_pts, "cLHS_Sampling_Points.shp")
```

---

## 📁 Repository Structure

```
gee-covariate-generator/
│
├── README.md                        ← You are here
├── LICENSE                          ← MIT License
├── covariate_generator_GEE.js       ← Main GEE script
│
└── outputs/
    └── sample_output_screenshot.png ← Example map output (optional)
```

---

## 📖 Citation & Reference

If you use this script in your research or reports, please cite:

> Patil, A. B. *Environmental Covariate Generator for Soil Survey using Google Earth Engine*. GitHub. https://github.com/patilaksh2/gee-covariate-generator

**Method reference:**
> Minasny, B., & McBratney, A. B. (2006). A conditioned Latin hypercube method for sampling in the presence of ancillary information. *Computers & Geosciences*, 32(9), 1378–1388. https://doi.org/10.1016/j.geoderma.2005.12.009

---

## 👤 Author

**Akshay Bhagwan Patil**
- GitHub: [@patilaksh2](https://github.com/yourusername)

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
You are free to use, modify, and distribute this script with attribution.
