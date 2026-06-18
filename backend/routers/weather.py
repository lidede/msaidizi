from fastapi import APIRouter, HTTPException
import httpx
import os

router = APIRouter(prefix="/api/weather", tags=["weather"])

_CITY = "Haarlem,NL"
_OWM = "https://api.openweathermap.org/data/2.5"


def _key():
    k = os.getenv("OPENWEATHER_API_KEY")
    if not k:
        raise HTTPException(503, "OPENWEATHER_API_KEY not configured — get a free key at openweathermap.org")
    return k


@router.get("/current")
def current_weather():
    r = httpx.get(f"{_OWM}/weather", params={"q": _CITY, "appid": _key(), "units": "metric"})
    if r.status_code != 200:
        raise HTTPException(502, f"Weather API error: {r.text}")
    d = r.json()
    return {
        "city": d["name"],
        "temp": round(d["main"]["temp"]),
        "feels_like": round(d["main"]["feels_like"]),
        "humidity": d["main"]["humidity"],
        "description": d["weather"][0]["description"],
        "icon": d["weather"][0]["icon"],
        "wind_kph": round(d["wind"]["speed"] * 3.6),
    }


@router.get("/forecast")
def forecast():
    r = httpx.get(f"{_OWM}/forecast", params={"q": _CITY, "appid": _key(), "units": "metric", "cnt": 40})
    if r.status_code != 200:
        raise HTTPException(502, f"Weather API error: {r.text}")
    days: dict = {}
    for item in r.json()["list"]:
        date = item["dt_txt"][:10]
        if date not in days:
            days[date] = {
                "date": date,
                "temp_min": item["main"]["temp_min"],
                "temp_max": item["main"]["temp_max"],
                "description": item["weather"][0]["description"],
                "icon": item["weather"][0]["icon"],
            }
        else:
            days[date]["temp_min"] = min(days[date]["temp_min"], item["main"]["temp_min"])
            days[date]["temp_max"] = max(days[date]["temp_max"], item["main"]["temp_max"])
    return {"forecast": list(days.values())[:5]}
