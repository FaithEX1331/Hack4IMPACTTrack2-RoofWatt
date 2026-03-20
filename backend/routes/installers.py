from fastapi import APIRouter, Query

router = APIRouter()

# Installer data keyed by normalised city name for O(1) lookup
_INSTALLERS = [
    {"id": 1, "name": "SolarTech Odisha Pvt Ltd", "city": "Bhubaneswar", "rating": 4.7, "mnre_certified": True, "contact": "+91-9876543210", "experience_years": 8},
    {"id": 2, "name": "GreenPower Solutions",      "city": "Bhubaneswar", "rating": 4.5, "mnre_certified": True, "contact": "+91-9123456789", "experience_years": 5},
    {"id": 3, "name": "Surya Energy Systems",      "city": "Cuttack",     "rating": 4.3, "mnre_certified": True, "contact": "+91-9988776655", "experience_years": 6},
    {"id": 4, "name": "EcoSolar India",            "city": "Bhubaneswar", "rating": 4.8, "mnre_certified": True, "contact": "+91-8765432109", "experience_years": 10},
    {"id": 5, "name": "Odisha Solar Works",        "city": "Puri",        "rating": 4.1, "mnre_certified": True, "contact": "+91-7654321098", "experience_years": 4},
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
