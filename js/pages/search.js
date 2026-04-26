// /search is retired — redirect to /listings preserving any query params
const params = new URLSearchParams(location.search);
const q = params.get('q');
location.replace(q ? `/listings?q=${encodeURIComponent(q)}` : '/listings');
