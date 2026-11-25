// The listed city nearest to a point (the visitor's request.cf position), for the hub's "your city" card and the
// home page's "Full timetable" link. Pure; haversine distance in km.
const rad = (d) => (d * Math.PI) / 180;
export function distanceKm(a, b) {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

/** @returns {{city:object, km:number}|null} null when no point, or nothing within maxKm */
export function nearestCity(cities, lat, lon, maxKm = Infinity) {
  lat = Number(lat); lon = Number(lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  let best = null;
  for (const city of cities) {
    const km = distanceKm({ lat, lon }, city);
    if (!best || km < best.km) best = { city, km };
  }
  return best && best.km <= maxKm ? best : null;
}
