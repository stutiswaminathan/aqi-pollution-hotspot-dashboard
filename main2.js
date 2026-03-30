const WAQI_TOKEN = 'e32669151b057025ab1948b3e5c0a447e2d5d9a5';
const cityConfig = {
    "munnar":     { slug: "munnar",     lat: 10.0889, lng: 77.0595, name: "Munnar, Kerala",        status: "OPTIMAL",    fallbackAQI: 45  },
    "delhi":      { slug: "delhi",      lat: 28.7041, lng: 77.1025, name: "New Delhi, NCR",         status: "TOXIC",      fallbackAQI: 310 },
    "mumbai":     { slug: "mumbai",     lat: 19.0760, lng: 72.8777, name: "Mumbai, Maharashtra",   status: "DISTRESSED", fallbackAQI: 120 },
    "bengaluru":  { slug: "bengaluru",  lat: 12.9716, lng: 77.5946, name: "Bengaluru, Karnataka",  status: "MODERATE",   fallbackAQI: 95  },
    "hyderabad":  { slug: "hyderabad",  lat: 17.3850, lng: 78.4867, name: "Hyderabad, Telangana",  status: "DISTRESSED", fallbackAQI: 160 },
    "kolkata":    { slug: "kolkata",    lat: 22.5726, lng: 88.3639, name: "Kolkata, West Bengal",  status: "DISTRESSED", fallbackAQI: 175 },
    "chennai":    { slug: "chennai",    lat: 13.0827, lng: 80.2707, name: "Chennai, Tamil Nadu",   status: "MODERATE",   fallbackAQI: 75  },
    "pune":       { slug: "pune",       lat: 18.5204, lng: 73.8567, name: "Pune, Maharashtra",     status: "MODERATE",   fallbackAQI: 80  },
    "ahmedabad":  { slug: "ahmedabad",  lat: 23.0225, lng: 72.5714, name: "Ahmedabad, Gujarat",    status: "DISTRESSED", fallbackAQI: 190 },
    "jaipur":     { slug: "jaipur",     lat: 26.9124, lng: 75.7873, name: "Jaipur, Rajasthan",     status: "DISTRESSED", fallbackAQI: 200 },
    "lucknow":    { slug: "lucknow",    lat: 26.8467, lng: 80.9462, name: "Lucknow, Uttar Pradesh",status: "TOXIC",      fallbackAQI: 260 },
    "patna":      { slug: "patna",      lat: 25.5941, lng: 85.1376, name: "Patna, Bihar",          status: "TOXIC",      fallbackAQI: 290 },
    "ghaziabad":  { slug: "ghaziabad",  lat: 28.6692, lng: 77.4538, name: "Ghaziabad, UP",         status: "TOXIC",      fallbackAQI: 340 },
    "nagpur":     { slug: "nagpur",     lat: 21.1458, lng: 79.0882, name: "Nagpur, Maharashtra",   status: "DISTRESSED", fallbackAQI: 145 },
    "bhopal":     { slug: "bhopal",     lat: 23.2599, lng: 77.4126, name: "Bhopal, Madhya Pradesh",status: "MODERATE",   fallbackAQI: 110 }
};

function getAQIColor(aqi) {
    if (aqi > 300) return '#7f1d1d';   // Hazardous  — dark red
    if (aqi > 200) return '#a855f7';   // Very Unhealthy — purple
    if (aqi > 150) return '#ef4444';   // Unhealthy  — red
    if (aqi > 100) return '#fb923c';   // Cautionary — orange
    if (aqi > 50)  return '#facc15';   // Acceptable — yellow
    return '#10b981';                  // Stable     — green
}

function getAQIStatus(aqi) {
    if (aqi > 300) return { label: "Hazardous",      cssHex: 0x7f1d1d };
    if (aqi > 200) return { label: "Very Unhealthy", cssHex: 0xa855f7 };
    if (aqi > 150) return { label: "Unhealthy",      cssHex: 0xef4444 };
    if (aqi > 100) return { label: "Cautionary",     cssHex: 0xfb923c };
    if (aqi > 50)  return { label: "Acceptable",     cssHex: 0xfacc15 };
    return              { label: "Optimal",          cssHex: 0x10b981 };
}

function getAQIAlert(aqi) {
    if (aqi > 300) return {
        title: "Hazardous Air — Action Required",
        desc:  "Emergency toxicological status. Immediate risk of pulmonary damage.",
        protocols: ["Cease all outdoor activity immediately", "Full deployment of indoor air scrubbers", "Follow emergency authority advisories"]
    };
    if (aqi > 200) return {
        title: "Very Unhealthy — Health Emergency",
        desc:  "High probability of acute respiratory incidents across all age groups.",
        protocols: ["Avoid all outdoor exertion", "Seal windows and use air purification", "Wear N95 mask if outdoor transit is essential"]
    };
    if (aqi > 150) return {
        title: "Unhealthy Air Detected",
        desc:  "Observable respiratory aggravation. Significant stress for sensitive groups.",
        protocols: ["Restrict prolonged outdoor exposure", "Wear N95 mask outdoors", "Activate indoor air filtration"]
    };
    if (aqi > 100) return {
        title: "Cautionary Levels",
        desc:  "Elevated concentrations. Children and elderly are at risk.",
        protocols: ["Limit outdoor exertion for vulnerable groups", "Consider wearing a surgical mask", "Monitor local AQI updates"]
    };
    if (aqi > 50) return {
        title: "Acceptable Air Quality",
        desc:  "Manageable levels. Sensitive individuals may notice mild irritation.",
        protocols: ["Sensitive groups should evaluate exertion", "General public can proceed normally", "Keep windows open for ventilation"]
    };
    return {
        title: "Air Quality Safe",
        desc:  "Atmospheric conditions are clean and within safe parameters.",
        protocols: ["Outdoor activity is safe", "No respiratory protection required", "Open windows for natural ventilation"]
    };
}

function getAQIParticleOpacity(aqi) {
    if (aqi > 300) return 0.95;
    if (aqi > 200) return 0.75;
    if (aqi > 150) return 0.6;
    if (aqi > 100) return 0.4;
    if (aqi > 50)  return 0.2;
    return 0.05;
}

let scene, camera, renderer, lungs, particles, currentAQI = 45;
let ekgPath = document.querySelector('.ekg-line');
let points = []; let x = 0;
let map, mapMarker;
let currentCityKey = 'munnar';

async function fetchAQI(cityKey) {
    const city = cityConfig[cityKey];
    const url = `https://api.waqi.info/feed/${city.slug}/?token=${WAQI_TOKEN}`;

    try {
        const res  = await fetch(url);
        const data = await res.json();

        if (data.status === 'ok' && data.data && data.data.aqi !== '-') {
            const aqi  = parseInt(data.data.aqi);
            const iaqi = data.data.iaqi || {};

            currentAQI = isNaN(aqi) ? city.fallbackAQI : aqi;

            if (iaqi.pm25) updateStatBar('pm25', iaqi.pm25.v, 300);
            if (iaqi.pm10) updateStatBar('pm10', iaqi.pm10.v, 400);
            if (iaqi.no2)  updateStatBar('no2',  iaqi.no2.v,  100);

            // Update status string in config from live data
            city.status = getAQIStatus(currentAQI).label.toUpperCase();

            showAPIBadge(true);
        } else {
            currentAQI = city.fallbackAQI;
            showAPIBadge(false);
        }
    } catch (err) {
        currentAQI = city.fallbackAQI;
        showAPIBadge(false);
        console.warn('WAQI fetch failed, using fallback AQI:', err);
    }

    updateUI();
}

function updateStatBar(id, value, max) {
    const rounded = parseFloat(value).toFixed(1);
    document.getElementById(`stat-${id}`).innerText = rounded;
    document.getElementById(`bar-${id}`).style.width = Math.min(100, (value / max) * 100) + "%";
}

function showAPIBadge(isLive) {
    let badge = document.getElementById('api-badge');
    if (!badge) {
        badge = document.createElement('p');
        badge.id = 'api-badge';
        badge.className = 'text-[9px] mono font-bold uppercase tracking-widest mt-1';
        document.getElementById('aqiDisplay').insertAdjacentElement('afterend', badge);
    }
    badge.innerText = isLive ? '⬤ Live Feed' : '⬤ Fallback Data';
    badge.style.color = isLive ? '#10b981' : '#f59e0b';
}

function startAPIRefresh() {
    setInterval(() => fetchAQI(currentCityKey), 5 * 60 * 1000);
}

function init() {
    scene = new THREE.Scene();
    const container = document.getElementById('canvas-container');
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const lungGroup = new THREE.Group();
    const lungMat   = new THREE.MeshPhongMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.3 });

    const createLobe = (side) => {
        const geom = new THREE.SphereGeometry(1, 48, 48);
        const pos  = geom.attributes.position;
        for (let i = 0; i < pos.count; i++) {
            let px = pos.getX(i), py = pos.getY(i);
            pos.setY(i, py * (1.4 + py * 0.2));
            pos.setX(i, px * (0.8 + py * 0.3));
        }
        const lobe = new THREE.Mesh(geom, lungMat);
        lobe.position.x = side * 1.1; lobe.rotation.z = side * 0.1;
        return lobe;
    };

    lungGroup.add(createLobe(-1), createLobe(1));
    scene.add(lungGroup); lungs = lungGroup;

    const particleGeo   = new THREE.BufferGeometry();
    const particleCount = 1000;
    const posArray      = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) posArray[i] = (Math.random() - 0.5) * 10;
    particleGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const particleMat = new THREE.PointsMaterial({ size: 0.02, color: 0xffffff, transparent: true, opacity: 0.5 });
    particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    const light = new THREE.PointLight(0xffffff, 2);
    light.position.set(5, 5, 5); scene.add(light);
    camera.position.z = 4.5;

    initMap();

    setInterval(() => {
        document.getElementById('clock').innerText = new Date().toLocaleTimeString('en-US', { hour12: false }) + " IST";
    }, 1000);

    startLiveStats();
    animate();

    fetchAQI(currentCityKey);
    startAPIRefresh();
}

function initMap() {
    const startLoc = cityConfig['munnar'];
    map = L.map('hazard-map', {
        zoomControl: false, dragging: false, scrollWheelZoom: false,
        doubleClickZoom: false, attributionControl: false
    }).setView([startLoc.lat, startLoc.lng], 5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    mapMarker = L.marker([startLoc.lat, startLoc.lng]).addTo(map);
}

function animate() {
    requestAnimationFrame(animate);
    const breathSpeed = Date.now() * (currentAQI * 0.00005 + 0.001);
    const scale       = 0.9 + Math.sin(breathSpeed) * (currentAQI > 300 ? 0.08 : 0.04);
    lungs.scale.set(scale, scale, scale);
    lungs.rotation.y += 0.002;

    const positions = particles.geometry.attributes.position.array;
    const speed     = currentAQI * 0.0001;
    for (let i = 1; i < positions.length; i += 3) {
        positions[i] += speed;
        if (positions[i] > 5) positions[i] = -5;
    }
    particles.geometry.attributes.position.needsUpdate = true;

    updateEKG(scale);
    renderer.render(scene, camera);
}

function updateEKG(scale) {
    x += 3; let y = 50;
    if (scale > 0.96)      y = 50 - (Math.random() * 35);
    else if (scale < 0.86) y = 50 + (Math.random() * 15);
    else                   y = 50 + (Math.random() * 4 - 2);
    points.push(`${x},${y}`);
    if (points.length > 80) points.shift();
    let d = "M" + points.map((p, i) => `${i * 10},${p.split(',')[1]}`).join(" L");
    ekgPath.setAttribute('d', d);
    if (x > 800) x = 0;
}

function startLiveStats() {
    setInterval(() => {
        const jitter  = () => (Math.random() * 4 - 2);
        const pm25El  = document.getElementById('stat-pm25');

        if (pm25El.innerText === '--') {
            updateStatBar('pm25', currentAQI * 0.5 + jitter(), 300);
            updateStatBar('pm10', currentAQI * 0.8 + jitter(), 400);
            updateStatBar('no2',  currentAQI * 0.15 + jitter(), 100);
        }

        const riskBase = currentAQI > 300 ? 90 : currentAQI > 200 ? 75 :
                         currentAQI > 150 ? 60 : currentAQI > 100 ? 45 :
                         currentAQI > 50  ? 25 : 12;
        const riskVal  = Math.min(99, Math.max(1, Math.round(riskBase + jitter())));
        document.getElementById('stat-risk').innerText = riskVal + "%";
    }, 2000);
}

function updateCalculator() {
    const hours    = parseFloat(document.getElementById('calc-hours').value);
    const activity = parseFloat(document.getElementById('calc-activity').value);
    const mask     = parseFloat(document.getElementById('calc-mask').value);
    const purifier = parseFloat(document.getElementById('calc-purifier').value);

    document.getElementById('calc-hours-val').innerText = hours + ' hrs';

    const estIntake = (currentAQI * hours * activity * mask * purifier).toFixed(1);
    const cigEquiv  = (estIntake / 22).toFixed(2);

    const resultEl = document.getElementById('calc-result');
    const riskEl   = document.getElementById('calc-risk');

    resultEl.innerText = estIntake + ' µg';
    document.getElementById('calc-cig').innerText = `Equiv: ${cigEquiv} Cigarettes`;

    if      (estIntake > 1200) { resultEl.style.color = '#7f1d1d'; riskEl.style.color = '#7f1d1d'; riskEl.innerText = 'Hazardous'; }
    else if (estIntake > 800)  { resultEl.style.color = '#a855f7'; riskEl.style.color = '#a855f7'; riskEl.innerText = 'Severe'; }
    else if (estIntake > 500)  { resultEl.style.color = '#ef4444'; riskEl.style.color = '#ef4444'; riskEl.innerText = 'Unhealthy'; }
    else if (estIntake > 300)  { resultEl.style.color = '#fb923c'; riskEl.style.color = '#fb923c'; riskEl.innerText = 'High'; }
    else if (estIntake > 100)  { resultEl.style.color = '#facc15'; riskEl.style.color = '#facc15'; riskEl.innerText = 'Moderate'; }
    else                       { resultEl.style.color = '#10b981'; riskEl.style.color = '#10b981'; riskEl.innerText = 'Low'; }
}

document.getElementById('calc-hours').addEventListener('input', updateCalculator);
document.getElementById('calc-activity').addEventListener('change', updateCalculator);
document.getElementById('calc-mask').addEventListener('change', updateCalculator);
document.getElementById('calc-purifier').addEventListener('change', updateCalculator);

function updateForecast() {
    const container = document.getElementById('forecast-boxes');
    container.innerHTML = '';
    const days  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const today = new Date().getDay();

    for (let i = 1; i <= 5; i++) {
        const dIdx    = (today + i) % 7;
        const dayName = days[dIdx];
        const fAqi    = Math.max(10, currentAQI + Math.floor((Math.random() - 0.5) * 60));
        const color   = getAQIColor(fAqi);

        container.innerHTML += `
            <div class="flex flex-col items-center bg-white/5 rounded-lg p-2.5 flex-1 border border-white/5 transition-all hover:bg-white/10">
                <span class="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider mb-1">${dayName}</span>
                <div class="w-full h-1.5 rounded-full my-1.5 bg-[#0a1120] overflow-hidden">
                    <div class="h-full rounded-full" style="width: ${Math.min(100, (fAqi/500)*100)}%; background: ${color}"></div>
                </div>
                <span class="text-xs mono font-black mt-1" style="color:${color}">${fAqi}</span>
            </div>
        `;
    }
}

function updatePolicy() {
    const list = document.getElementById('policy-list');
    const dot  = document.getElementById('policy-dot');
    const pColor = getAQIColor(currentAQI);
    let policies = [];

    if (currentAQI > 300) {
        policies = ['Emergency Health Advisory Issued', 'Construction Operations Halted', 'Odd-Even Traffic Active', 'Schools Transitioned Remote'];
    } else if (currentAQI > 200) {
        policies = ['Public Gatherings Restricted', 'Vehicular Emergency Protocols Active', 'Industrial Units on Shutdown Notice'];
    } else if (currentAQI > 150) {
        policies = ['Vehicular Emissions Restricted', 'Industrial Output Monitored', 'Dust Sweeping Deployed'];
    } else if (currentAQI > 100) {
        policies = ['Enhanced Air Quality Monitoring', 'Advisory for Sensitive Groups Issued', 'Construction Dust Controls Active'];
    } else if (currentAQI > 50) {
        policies = ['Routine Air Monitoring Active', 'Standard Emission Guidelines Apply'];
    } else {
        policies = ['Routine Air Monitoring Active', 'No Public Restrictions', 'Ecological Baselines Normal'];
    }

    dot.style.backgroundColor = pColor;
    dot.previousElementSibling.style.backgroundColor = pColor;

    list.innerHTML = policies.map((p, i) => `
        <li class="flex items-center gap-3 text-xs text-slate-200 precaution-item font-semibold" style="animation-delay: ${i*0.1}s">
            <span class="w-1.5 h-1.5 rounded-full" style="background-color: ${pColor}; box-shadow: 0 0 8px ${pColor}"></span>
            ${p}
        </li>
    `).join('');
}

document.getElementById('btn-report').addEventListener('click', () => {
    const nodeName   = document.getElementById('stateSelect').options[document.getElementById('stateSelect').selectedIndex].text;
    const exposureText = document.getElementById('calc-result').innerText;
    const riskLevel    = document.getElementById('calc-risk').innerText;
    const badgeEl      = document.getElementById('api-badge');
    const dataSource   = badgeEl ? badgeEl.innerText : 'Unknown';
    const { label: hazardLabel } = getAQIStatus(currentAQI);

    let reportText  = `======================================\n`;
    reportText     += `     BREATHE SAFE | BIOMETRIC AUDIT   \n`;
    reportText     += `======================================\n\n`;
    reportText     += `DATE GENERATED : ${new Date().toLocaleString('en-IN')}\n`;
    reportText     += `SELECTED NODE  : ${nodeName}\n`;
    reportText     += `CURRENT AQI    : ${currentAQI}\n`;
    reportText     += `DATA SOURCE    : ${dataSource}\n`;
    reportText     += `HAZARD STATUS  : ${hazardLabel.toUpperCase()}\n\n`;
    reportText     += `--- PERSONAL EXPOSURE ASSESSMENT ---\n`;
    reportText     += `Estimated Intake: ${exposureText}\n`;
    reportText     += `Calculated Risk : ${riskLevel.toUpperCase()}\n`;
    reportText     += `Risk Assessment : ${parseInt(exposureText) > 800 ? 'CRITICAL - Seek indoors immediately.' : 'WITHIN TOLERANCE LIMITS.'}\n\n`;
    reportText     += `*** END OF REPORT ***`;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `Health_Audit_${currentAQI}_${Date.now()}.txt`;
    a.click(); URL.revokeObjectURL(url);

    const toast = document.getElementById('toast-report');
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
});

document.getElementById('stateSelect').addEventListener('change', (e) => {
    currentCityKey = e.target.value;

    document.getElementById('stat-pm25').innerText = '--';
    document.getElementById('stat-pm10').innerText = '--';
    document.getElementById('stat-no2').innerText  = '--';

    fetchAQI(currentCityKey);
});

function updateUI() {
    document.getElementById('aqiDisplay').innerText = currentAQI;

    const root            = document.documentElement;
    const colorHex        = getAQIColor(currentAQI);
    const { label: statusStr, cssHex } = getAQIStatus(currentAQI);
    const { title: aTitle, desc: aDesc, protocols: pList } = getAQIAlert(currentAQI);

    const statusText      = document.getElementById('status-text');
    const alertTitle      = document.getElementById('alert-title');
    const alertDesc       = document.getElementById('alert-desc');
    const alertIcon       = document.getElementById('alert-icon');
    const precautionsList = document.getElementById('precautions-list');

    lungs.children.forEach(l => l.material.color.setHex(cssHex));
    particles.material.color.setHex(currentAQI <= 50 ? 0xffffff : cssHex);
    particles.material.opacity = getAQIParticleOpacity(currentAQI);

    root.style.setProperty('--current-accent', colorHex);
    statusText.innerText       = statusStr;
    alertTitle.innerText       = aTitle;
    alertTitle.style.color     = colorHex;
    alertIcon.style.backgroundColor = colorHex;
    alertDesc.innerText        = aDesc;

    precautionsList.innerHTML = '';
    pList.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'flex items-start gap-3 precaution-item font-semibold';
        li.style.animationDelay = `${index * 0.1}s`;
        li.innerHTML = `<span class="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${colorHex}; box-shadow: 0 0 8px ${colorHex}"></span><span>${item}</span>`;
        precautionsList.appendChild(li);
    });

    const locInfo = cityConfig[currentCityKey];
    if (map && mapMarker && locInfo) {
        map.flyTo([locInfo.lat, locInfo.lng], 5, { animate: true, duration: 1.5 });
        mapMarker.setLatLng([locInfo.lat, locInfo.lng]);

        const iconHtml = `<div class="relative flex items-center justify-center w-full h-full"><div class="absolute w-full h-full pulse-beacon" style="background-color: ${colorHex};"></div><div class="relative w-3.5 h-3.5 rounded-full border-2 border-white" style="background-color: ${colorHex}; box-shadow: 0 0 12px ${colorHex};"></div></div>`;
        mapMarker.setIcon(L.divIcon({ className: 'custom-map-icon', html: iconHtml, iconSize: [28, 28], iconAnchor: [14, 14] }));

        mapMarker.unbindTooltip();
        mapMarker.bindTooltip(
            `<div class="text-xs"><strong class="text-white block mb-0.5">${locInfo.name}</strong><span style="color:${colorHex}" class="mono font-black text-sm block mt-1">AQI: ${currentAQI}</span><span class="text-slate-300 font-bold text-[10px] uppercase tracking-widest mt-1 block">Status: ${locInfo.status}</span></div>`,
            { className: 'glass-tooltip', direction: 'top', offset: [0, -12] }
        );
    }

    updateCalculator();
    updateForecast();
    updatePolicy();
}

window.addEventListener('resize', () => {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    if (map) map.invalidateSize();
});

init();