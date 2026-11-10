// Lien d’itinéraire : Apple Plans sur iPhone, application GPS par défaut sur Android, Google Maps ailleurs.
export function mapsUrl(e) {
  const q = encodeURIComponent([e.address, e.city].filter(Boolean).join(', '));
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return `https://maps.apple.com/?q=${q}`;
  if (/Android/.test(ua)) return `geo:0,0?q=${q}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
