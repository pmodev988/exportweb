// Baseline: Unicode CLDR 48; trade-navigation adjustments documented in MARKET-DATA.md.
(function(root){'use strict';
const groups=[
  {
    "id": "north-america",
    "zh": "北美",
    "en": "North America",
    "subgroups": [
      {
        "id": "northern",
        "zh": "北美主要市场",
        "en": "Northern America",
        "markets": [
          "BM",
          "CA",
          "GL",
          "MX",
          "PM",
          "US"
        ]
      },
      {
        "id": "central",
        "zh": "中美洲",
        "en": "Central America",
        "markets": [
          "BZ",
          "CR",
          "GT",
          "HN",
          "NI",
          "PA",
          "SV"
        ]
      },
      {
        "id": "caribbean",
        "zh": "加勒比",
        "en": "Caribbean",
        "markets": [
          "AG",
          "AI",
          "AW",
          "BB",
          "BL",
          "BQ",
          "BS",
          "CU",
          "CW",
          "DM",
          "DO",
          "GD",
          "GP",
          "HT",
          "JM",
          "KN",
          "KY",
          "LC",
          "MF",
          "MQ",
          "MS",
          "PR",
          "SX",
          "TC",
          "TT",
          "VC",
          "VG",
          "VI"
        ]
      }
    ]
  },
  {
    "id": "south-america",
    "zh": "南美",
    "en": "South America",
    "subgroups": [
      {
        "id": "south-america-all",
        "zh": "南美",
        "en": "South America",
        "markets": [
          "AR",
          "BO",
          "BR",
          "BV",
          "CL",
          "CO",
          "EC",
          "FK",
          "GF",
          "GS",
          "GY",
          "PE",
          "PY",
          "SR",
          "UY",
          "VE"
        ]
      }
    ]
  },
  {
    "id": "europe",
    "zh": "欧洲",
    "en": "Europe",
    "subgroups": [
      {
        "id": "western-europe",
        "zh": "西欧",
        "en": "Western Europe",
        "markets": [
          "AT",
          "BE",
          "CH",
          "DE",
          "FR",
          "LI",
          "LU",
          "MC",
          "NL"
        ]
      },
      {
        "id": "northern-europe",
        "zh": "北欧",
        "en": "Northern Europe",
        "markets": [
          "AX",
          "CQ",
          "DK",
          "EE",
          "FI",
          "FO",
          "GB",
          "GG",
          "IE",
          "IM",
          "IS",
          "JE",
          "LT",
          "LV",
          "NO",
          "SE",
          "SJ"
        ]
      },
      {
        "id": "southern-europe",
        "zh": "南欧",
        "en": "Southern Europe",
        "markets": [
          "AD",
          "AL",
          "BA",
          "CY",
          "ES",
          "GI",
          "GR",
          "HR",
          "IT",
          "ME",
          "MK",
          "MT",
          "PT",
          "RS",
          "SI",
          "SM",
          "VA",
          "XK"
        ]
      },
      {
        "id": "eastern-europe",
        "zh": "东欧",
        "en": "Eastern Europe",
        "markets": [
          "BG",
          "BY",
          "CZ",
          "HU",
          "MD",
          "PL",
          "RO",
          "RU",
          "SK",
          "UA"
        ]
      }
    ]
  },
  {
    "id": "asia",
    "zh": "亚洲",
    "en": "Asia",
    "subgroups": [
      {
        "id": "northeast-asia",
        "zh": "东北亚",
        "en": "Northeast Asia",
        "markets": [
          "CN",
          "HK",
          "JP",
          "KP",
          "KR",
          "MN",
          "MO",
          "TW"
        ]
      },
      {
        "id": "southeast-asia",
        "zh": "东南亚",
        "en": "Southeast Asia",
        "markets": [
          "BN",
          "ID",
          "KH",
          "LA",
          "MM",
          "MY",
          "PH",
          "SG",
          "TH",
          "TL",
          "VN"
        ]
      },
      {
        "id": "south-asia",
        "zh": "南亚",
        "en": "South Asia",
        "markets": [
          "AF",
          "BD",
          "BT",
          "IN",
          "LK",
          "MV",
          "NP",
          "PK"
        ]
      },
      {
        "id": "central-asia",
        "zh": "中亚",
        "en": "Central Asia",
        "markets": [
          "KG",
          "KZ",
          "TJ",
          "TM",
          "UZ"
        ]
      },
      {
        "id": "middle-east",
        "zh": "中东",
        "en": "Middle East",
        "markets": [
          "AE",
          "BH",
          "IL",
          "IQ",
          "IR",
          "JO",
          "KW",
          "LB",
          "OM",
          "PS",
          "QA",
          "SA",
          "SY",
          "TR",
          "YE"
        ]
      },
      {
        "id": "caucasus",
        "zh": "高加索",
        "en": "Caucasus",
        "markets": [
          "AM",
          "AZ",
          "GE"
        ]
      }
    ]
  },
  {
    "id": "africa",
    "zh": "非洲",
    "en": "Africa",
    "subgroups": [
      {
        "id": "north-africa",
        "zh": "北非",
        "en": "Northern Africa",
        "markets": [
          "DZ",
          "EA",
          "EG",
          "EH",
          "IC",
          "LY",
          "MA",
          "SD",
          "TN"
        ]
      },
      {
        "id": "west-africa",
        "zh": "西非",
        "en": "Western Africa",
        "markets": [
          "BF",
          "BJ",
          "CI",
          "CV",
          "GH",
          "GM",
          "GN",
          "GW",
          "LR",
          "ML",
          "MR",
          "NE",
          "NG",
          "SH",
          "SL",
          "SN",
          "TG"
        ]
      },
      {
        "id": "east-africa",
        "zh": "东非",
        "en": "Eastern Africa",
        "markets": [
          "BI",
          "DJ",
          "ER",
          "ET",
          "IO",
          "KE",
          "KM",
          "MG",
          "MU",
          "MW",
          "MZ",
          "RE",
          "RW",
          "SC",
          "SO",
          "SS",
          "TF",
          "TZ",
          "UG",
          "YT",
          "ZM",
          "ZW"
        ]
      },
      {
        "id": "central-africa",
        "zh": "中非",
        "en": "Middle Africa",
        "markets": [
          "AO",
          "CD",
          "CF",
          "CG",
          "CM",
          "GA",
          "GQ",
          "ST",
          "TD"
        ]
      },
      {
        "id": "south-africa",
        "zh": "南部非洲",
        "en": "Southern Africa",
        "markets": [
          "BW",
          "LS",
          "NA",
          "SZ",
          "ZA"
        ]
      },
      {
        "id": "africa-territories",
        "zh": "其他地区",
        "en": "Other areas",
        "markets": [
          "AC",
          "TA"
        ]
      }
    ]
  },
  {
    "id": "oceania",
    "zh": "大洋洲",
    "en": "Oceania",
    "subgroups": [
      {
        "id": "australasia",
        "zh": "澳大利亚与新西兰",
        "en": "Australia and New Zealand",
        "markets": [
          "AU",
          "CC",
          "CX",
          "HM",
          "NF",
          "NZ"
        ]
      },
      {
        "id": "pacific",
        "zh": "太平洋岛屿",
        "en": "Pacific Islands",
        "markets": [
          "AS",
          "CK",
          "FJ",
          "FM",
          "GU",
          "KI",
          "MH",
          "MP",
          "NC",
          "NR",
          "NU",
          "PF",
          "PG",
          "PN",
          "PW",
          "SB",
          "TK",
          "TO",
          "TV",
          "UM",
          "VU",
          "WF",
          "WS"
        ]
      },
      {
        "id": "oceania-territories",
        "zh": "其他地区",
        "en": "Other areas",
        "markets": [
          "CP",
          "DG"
        ]
      }
    ]
  },
  {
    "id": "other",
    "zh": "其他地区",
    "en": "Other areas",
    "subgroups": [
      {
        "id": "other-all",
        "zh": "其他地区",
        "en": "Other areas",
        "markets": [
          "AQ"
        ]
      }
    ]
  }
];
const api={groups};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LGAMarketRegions=api;
})(typeof globalThis!=='undefined'?globalThis:this);
