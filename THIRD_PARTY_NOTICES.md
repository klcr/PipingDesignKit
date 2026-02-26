# Third-Party Notices

This document lists the third-party data sources used in PipingDesignKit, their licenses, and attribution requirements.

---

## Licensed Data Sources

### Melinder Glycol Properties (BSD-3-Clause)

**Files**: `data/fluid-properties/melinder-eg-water.json`, `data/fluid-properties/melinder-pg-water.json`

**Source**: LBNL Buildings Library v9.1.0, based on Melinder (2010)

```
Copyright (c) 2013-2023, The Regents of the University of California,
through Lawrence Berkeley National Laboratory (subject to receipt of any
required approvals from the U.S. Dept. of Energy). All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
```

### Laliberté Electrolyte Model Coefficients (MIT)

**File**: `data/fluid-properties/laliberte-coefficients.json`

**Source**: Extracted from CalebBell/chemicals v1.5.1

```
Copyright (c) 2016-2023 Caleb Bell

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

**Original papers**:
- Laliberté, M. & Cooper, W.E. (2004). J. Chem. Eng. Data 49:1141
- Laliberté, M. (2007). J. Chem. Eng. Data 52:321
- Laliberté, M. (2009). J. Chem. Eng. Data 54:1725

### Ethanol-Water Density Data (CC BY 4.0)

**File**: `data/fluid-properties/ethanol-water.json` (density / Redlich-Kister coefficients)

**Source**: Danahy, C. et al. (2018). "Density Determination of Binary Mixtures of Ethanol and Water." Fermentation 4(3):72.

This data is used under the [Creative Commons Attribution 4.0 International License](https://creativecommons.org/licenses/by/4.0/).

---

## Public Domain / Open Access Data Sources

| Data File | Source | Basis |
|-----------|--------|-------|
| `water.json` | IAPWS-IF97 (2012 revision) | International formulation published for industrial use |
| `sucrose-water.json` | NBS Circular 440 (1942), ICUMSA SPS-3 | U.S. government publication (public domain) |
| `methanol-water.json` | Asada (2012), U. of Hawaii thesis | Open access |

---

## Factual / Scientific Data

The following data files contain physical measurements, empirical correlations, or engineering constants that constitute factual data. Under both Japanese copyright law (著作権法 Article 2) and U.S. copyright law (Feist Publications v. Rural Telephone, 1991), facts and measured physical properties are not copyrightable.

| Data File | Source | Nature |
|-----------|--------|--------|
| `seawater.json` | Sharqawy et al. (2010) | Measured thermophysical properties of seawater |
| `ethanol-water.json` (viscosity) | Khattab et al. (2012) | Measured viscosity data |
| `darby-3k.json` | Darby (2001), Chemical Engineering Fluid Mechanics | Empirical fitting coefficients, widely cited |
| `entrance-exit-k.json` | Idelchik (2007), Borda-Carnot analysis | Classical fluid mechanics results |
| `surface-roughness.json` | Moody (1944), Colebrook & White (1937) | Standard pipe roughness values |
| `ansi-b36.10m.json` | ASME B36.10M | Pipe dimensions widely published in manufacturer catalogs |
| `jis-g3452-sgp.json` | JIS G 3452 | Pipe dimensions widely published in manufacturer catalogs |
| `pump-type-classification.json` | Karassik et al., Pump Handbook | General engineering knowledge on pump classification |

Mathematical formulas and equations (Churchill friction factor, Swamee-Jain, Darby 3-K method, etc.) are not subject to copyright protection (Japan: 著作権法 Article 10(3); U.S.: Baker v. Selden, 1879).

---

## Disclaimer

The data in this repository is provided for engineering calculation purposes. While every effort has been made to ensure accuracy by referencing authoritative sources, users should verify critical calculations independently. The authors assume no liability for errors in the data or for consequences arising from its use.
