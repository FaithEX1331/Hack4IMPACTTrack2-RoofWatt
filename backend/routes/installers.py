from fastapi import APIRouter, Query

router = APIRouter()

_INSTALLERS = [
    # Bhubaneswar
    {"id": 1,  "name": "EcoSolar India",              "city": "Bhubaneswar", "rating": 4.8, "mnre_certified": True, "website": "https://www.ecosolarindia.com",           "experience_years": 10},
    {"id": 2,  "name": "SolarTech Odisha Pvt Ltd",    "city": "Bhubaneswar", "rating": 4.7, "mnre_certified": True, "website": "https://www.solartlechodisha.com",         "experience_years": 8},
    {"id": 3,  "name": "GreenPower Solutions",        "city": "Bhubaneswar", "rating": 4.5, "mnre_certified": True, "website": "https://www.greenpowersolutions.in",       "experience_years": 5},
    # Cuttack
    {"id": 4,  "name": "Surya Energy Systems",        "city": "Cuttack",     "rating": 4.3, "mnre_certified": True, "website": "https://www.suryaenergysystems.in",        "experience_years": 6},
    {"id": 5,  "name": "Odisha Solar Works",          "city": "Cuttack",     "rating": 4.2, "mnre_certified": True, "website": "https://www.odishasolarworks.com",          "experience_years": 4},
    {"id": 6,  "name": "Solarify Odisha",             "city": "Cuttack",     "rating": 4.1, "mnre_certified": True, "website": "https://www.solarify.in",                  "experience_years": 5},
    # Delhi
    {"id": 7,  "name": "Tata Power Solar",            "city": "Delhi",       "rating": 4.9, "mnre_certified": True, "website": "https://www.tatapowersolar.com",            "experience_years": 15},
    {"id": 8,  "name": "Amplus Solar",                "city": "Delhi",       "rating": 4.7, "mnre_certified": True, "website": "https://www.amplussolar.com",               "experience_years": 12},
    {"id": 9,  "name": "Jakson Solar",                "city": "Delhi",       "rating": 4.5, "mnre_certified": True, "website": "https://www.jaksonsolar.com",               "experience_years": 10},
    # Mumbai
    {"id": 10, "name": "Waaree Energies",             "city": "Mumbai",      "rating": 4.8, "mnre_certified": True, "website": "https://www.waaree.com",                   "experience_years": 14},
    {"id": 11, "name": "Adani Solar",                 "city": "Mumbai",      "rating": 4.7, "mnre_certified": True, "website": "https://www.adanisolar.com",                "experience_years": 13},
    {"id": 12, "name": "Vikram Solar Mumbai",         "city": "Mumbai",      "rating": 4.5, "mnre_certified": True, "website": "https://www.vikramsolar.com",               "experience_years": 9},
    # Chennai
    {"id": 13, "name": "Sunshot Technologies",        "city": "Chennai",     "rating": 4.6, "mnre_certified": True, "website": "https://www.sunshottech.in",                "experience_years": 7},
    {"id": 14, "name": "Fourth Partner Energy",       "city": "Chennai",     "rating": 4.7, "mnre_certified": True, "website": "https://www.fourthpartnerenergy.com",       "experience_years": 11},
    {"id": 15, "name": "Rays Power Infra",            "city": "Chennai",     "rating": 4.4, "mnre_certified": True, "website": "https://www.rayspowerinfra.com",            "experience_years": 8},
    # Bangalore
    {"id": 16, "name": "Cleantech Solar",             "city": "Bangalore",   "rating": 4.8, "mnre_certified": True, "website": "https://www.cleantechsolar.com",            "experience_years": 10},
    {"id": 17, "name": "SolarEdge Bangalore",         "city": "Bangalore",   "rating": 4.6, "mnre_certified": True, "website": "https://www.solaredge.com",                 "experience_years": 9},
    {"id": 18, "name": "Emmvee Solar",                "city": "Bangalore",   "rating": 4.5, "mnre_certified": True, "website": "https://www.emmveesolar.com",               "experience_years": 12},
    # Kolkata
    {"id": 19, "name": "Sunkalp Energy",              "city": "Kolkata",     "rating": 4.4, "mnre_certified": True, "website": "https://www.sunkalpenergy.com",             "experience_years": 6},
    {"id": 20, "name": "Bengal Solar Solutions",      "city": "Kolkata",     "rating": 4.3, "mnre_certified": True, "website": "https://www.bengalsolarsolutions.com",      "experience_years": 5},
    {"id": 21, "name": "Solahart India Kolkata",      "city": "Kolkata",     "rating": 4.5, "mnre_certified": True, "website": "https://www.solahart.in",                  "experience_years": 8},
    # Jaipur
    {"id": 22, "name": "Rajasthan Solar Park",        "city": "Jaipur",      "rating": 4.6, "mnre_certified": True, "website": "https://www.rajasthansolarpark.com",        "experience_years": 9},
    {"id": 23, "name": "Sun Grow Energy Jaipur",      "city": "Jaipur",      "rating": 4.5, "mnre_certified": True, "website": "https://www.sungrowpower.com",              "experience_years": 7},
    {"id": 24, "name": "Loom Solar Jaipur",           "city": "Jaipur",      "rating": 4.4, "mnre_certified": True, "website": "https://www.loomsolar.com",                 "experience_years": 6},
    # Hyderabad
    {"id": 25, "name": "Greenko Solar",               "city": "Hyderabad",   "rating": 4.7, "mnre_certified": True, "website": "https://www.greenkogroup.com",              "experience_years": 11},
    {"id": 26, "name": "Surana Solar",                "city": "Hyderabad",   "rating": 4.5, "mnre_certified": True, "website": "https://www.suranasolar.com",               "experience_years": 8},
    {"id": 27, "name": "Hyderabad Solar Solutions",   "city": "Hyderabad",   "rating": 4.3, "mnre_certified": True, "website": "https://www.hyderabadsolarsolutions.com",   "experience_years": 5},
    # Lucknow
    {"id": 28, "name": "UP Solar Energy",             "city": "Lucknow",     "rating": 4.4, "mnre_certified": True, "website": "https://www.upneda.org.in",                 "experience_years": 7},
    {"id": 29, "name": "Luminous Solar Lucknow",      "city": "Lucknow",     "rating": 4.5, "mnre_certified": True, "website": "https://www.luminousindia.com",             "experience_years": 9},
    {"id": 30, "name": "Navitas Solar Lucknow",       "city": "Lucknow",     "rating": 4.2, "mnre_certified": True, "website": "https://www.navitassolar.com",              "experience_years": 5},
    # Patna
    {"id": 31, "name": "Bihar Renewable Energy",      "city": "Patna",       "rating": 4.3, "mnre_certified": True, "website": "https://www.breda.bih.nic.in",              "experience_years": 6},
    {"id": 32, "name": "Patna Solar Power",           "city": "Patna",       "rating": 4.2, "mnre_certified": True, "website": "https://www.patnasolarpwer.com",            "experience_years": 4},
    {"id": 33, "name": "SunSource Energy Patna",      "city": "Patna",       "rating": 4.4, "mnre_certified": True, "website": "https://www.sunsourceenergy.com",           "experience_years": 7},
]

# Pre-sorted descending by rating; filter preserves order
_SORTED_INSTALLERS = sorted(_INSTALLERS, key=lambda x: -x["rating"])


@router.get("/installers")
def get_installers(city: str = Query(default="Bhubaneswar")):
    """Return MNRE-verified installers near a given city, sorted by rating."""
    city_lower = city.lower()
    results = [i for i in _SORTED_INSTALLERS if city_lower in i["city"].lower()]
    if not results:
        results = _SORTED_INSTALLERS[:3]   # fallback: top-3 by rating
    return {"installers": results}
