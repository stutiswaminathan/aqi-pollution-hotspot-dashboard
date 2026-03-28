let scene, camera, renderer, lungs, particles, currentAQI = 45;
let ekgPath = document.querySelector('.ekg-line');
let points = []; let x = 0;

let map, mapMarker;
const locationsData = {
    "45":  { lat: 10.0889, lng: 77.0595, name: "Munnar, Kerala", status: "OPTIMAL" },
    "165": { lat: 19.0760, lng: 72.8777, name: "Mumbai, Maharashtra", status: "DISTRESSED" },
    "412": { lat: 28.7041, lng: 77.1025, name: "New Delhi, NCR", status: "TOXIC" }
};

function init() {

    scene = new THREE.Scene();
    const container = document.getElementById('canvas-container');
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const lungGroup = new THREE.Group();
    const lungMat = new THREE.MeshPhongMaterial({ color: 0xffffff, wireframe: true, transparent: true, opacity: 0.3 });
    
    const createLobe = (side) => {
        const geom = new THREE.SphereGeometry(1, 48, 48);
        const pos = geom.attributes.position;
        for(let i=0; i<pos.count; i++){
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

    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 1000;
    const posArray = new Float32Array(particleCount * 3);
    for(let i=0; i < particleCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 10;
    }
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
    updateUI();
    animate();
}

function initMap() {
    const startLoc = locationsData["45"];
    map = L.map('hazard-map', {
        zoomControl: false, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, attributionControl: false
    }).setView([startLoc.lat, startLoc.lng], 5);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    mapMarker = L.marker([startLoc.lat, startLoc.lng]).addTo(map);
}

function animate() {
    requestAnimationFrame(animate);
    const breathSpeed = Date.now() * (currentAQI * 0.00005 + 0.001);
    const scale = 0.9 + Math.sin(breathSpeed) * (currentAQI > 300 ? 0.08 : 0.04);
    lungs.scale.set(scale, scale, scale);
    lungs.rotation.y += 0.002;

    const positions = particles.geometry.attributes.position.array;
    const speed = currentAQI * 0.0001;
    for(let i=1; i < positions.length; i+=3) {
        positions[i] += speed; 
        if(positions[i] > 5) positions[i] = -5; 
    }
    particles.geometry.attributes.position.needsUpdate = true;

    updateEKG(scale);
    renderer.render(scene, camera);
}

function updateEKG(scale) {
    x += 3; let y = 50;
    if (scale > 0.96) y = 50 - (Math.random() * 35);
    else if (scale < 0.86) y = 50 + (Math.random() * 15);
    else y = 50 + (Math.random() * 4 - 2);
    points.push(`${x},${y}`);
    if (points.length > 80) points.shift();
    let d = "M" + points.map((p, i) => `${i * 10},${p.split(',')[1]}`).join(" L");
    ekgPath.setAttribute('d', d);
    if (x > 800) x = 0;
}

function startLiveStats() {
    setInterval(() => {
        const jitter = () => (Math.random() * 4 - 2);
        let pm25Val = Math.max(0, (currentAQI * 0.5 + jitter()));
        let pm10Val = Math.max(0, (currentAQI * 0.8 + jitter()));
        let no2Val = Math.max(0, (currentAQI * 0.15 + jitter()));
        let riskVal = Math.min(99, Math.max(1, Math.round((currentAQI > 300 ? 85 : currentAQI > 100 ? 45 : 12) + jitter())));

        document.getElementById('stat-pm25').innerText = pm25Val.toFixed(1);
        document.getElementById('stat-pm10').innerText = pm10Val.toFixed(1);
        document.getElementById('stat-no2').innerText = no2Val.toFixed(1);
        document.getElementById('stat-risk').innerText = riskVal + "%";

        document.getElementById('bar-pm25').style.width = Math.min(100, (pm25Val / 300) * 100) + "%";
        document.getElementById('bar-pm10').style.width = Math.min(100, (pm10Val / 400) * 100) + "%";
        document.getElementById('bar-no2').style.width = Math.min(100, (no2Val / 100) * 100) + "%";
    }, 2000);
}

//module to calculate personal exposure based on user inputs and current AQI
function updateCalculator() {
    const hours = parseFloat(document.getElementById('calc-hours').value);
    const activity = parseFloat(document.getElementById('calc-activity').value);
    const mask = parseFloat(document.getElementById('calc-mask').value);
    const purifier = parseFloat(document.getElementById('calc-purifier').value);
    
    document.getElementById('calc-hours-val').innerText = hours + ' hrs';
    
    const estIntake = (currentAQI * hours * activity * mask * purifier).toFixed(1);
    const cigEquiv = (estIntake / 22).toFixed(2); 
    
    const resultEl = document.getElementById('calc-result');
    const riskEl = document.getElementById('calc-risk');
    
    resultEl.innerText = estIntake + ' µg';
    document.getElementById('calc-cig').innerText = `Equiv: ${cigEquiv} Cigarettes`;
    
    if (estIntake > 800) {
        resultEl.style.color = '#ef4444'; riskEl.style.color = '#ef4444'; riskEl.innerText = 'Severe';
    } else if (estIntake > 300) {
        resultEl.style.color = '#f59e0b'; riskEl.style.color = '#f59e0b'; riskEl.innerText = 'High';
    } else if (estIntake > 100) {
        resultEl.style.color = '#fbbf24'; riskEl.style.color = '#fbbf24'; riskEl.innerText = 'Moderate';
    } else {
        resultEl.style.color = '#10b981'; riskEl.style.color = '#10b981'; riskEl.innerText = 'Low';
    }
}

document.getElementById('calc-hours').addEventListener('input', updateCalculator);
document.getElementById('calc-activity').addEventListener('change', updateCalculator);
document.getElementById('calc-mask').addEventListener('change', updateCalculator);
document.getElementById('calc-purifier').addEventListener('change', updateCalculator);

//aqi forecast module
function updateForecast() {
    const container = document.getElementById('forecast-boxes');
    container.innerHTML = '';
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    let today = new Date().getDay();
    
    for(let i=1; i<=5; i++) {
        let dIdx = (today + i) % 7;
        let dayName = days[dIdx];
        let fAqi = Math.max(10, currentAQI + Math.floor((Math.random() - 0.5) * 60));
        let color = fAqi > 300 ? '#ef4444' : (fAqi > 100 ? '#f59e0b' : '#10b981');
        
        container.innerHTML += `
            <div class="flex flex-col items-center bg-white/5 rounded-lg p-2.5 flex-1 border border-white/5 transition-all hover:bg-white/10">
                <span class="text-[10px] text-slate-400 uppercase font-extrabold tracking-wider mb-1">${dayName}</span>
                <div class="w-full h-1.5 rounded-full my-1.5 bg-[#0a1120] overflow-hidden"><div class="h-full rounded-full" style="width: ${Math.min(100, (fAqi/500)*100)}%; background: ${color}"></div></div>
                <span class="text-xs mono font-black mt-1" style="color:${color}">${fAqi}</span>
            </div>
        `;
    }
}

//module for policy enforcement based on aqi levels
function updatePolicy() {
    const list = document.getElementById('policy-list');
    const dot = document.getElementById('policy-dot');
    let policies = []; let pColor = '';

    if (currentAQI > 300) {
        policies = ['Emergency Health Advisory Issued', 'Construction Operations Halted', 'Odd-Even Traffic Active', 'Schools Transitioned Remote'];
        pColor = '#ef4444';
    } else if (currentAQI > 100) {
        policies = ['Vehicular Emissions Restricted', 'Industrial Output Monitored', 'Dust Sweeping Deployed'];
        pColor = '#f59e0b';
    } else {
        policies = ['Routine Air Monitoring Active', 'No Public Restrictions', 'Ecological Baselines Normal'];
        pColor = '#10b981';
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

//module for report generation
document.getElementById('btn-report').addEventListener('click', () => {
    const nodeName = document.getElementById('stateSelect').options[document.getElementById('stateSelect').selectedIndex].text;
    let exposureText = document.getElementById('calc-result').innerText;
    let riskLevel = document.getElementById('calc-risk').innerText;
    
    let reportText = `======================================\n`;
    reportText += `  THE BREATHING MAP | BIOMETRIC AUDIT \n`;
    reportText += `======================================\n\n`;
    reportText += `DATE GENERATED : ${new Date().toLocaleString('en-IN')}\n`;
    reportText += `SELECTED NODE  : ${nodeName}\n`;
    reportText += `CURRENT AQI    : ${currentAQI}\n`;
    reportText += `HAZARD STATUS  : ${currentAQI > 300 ? 'SEVERE/TOXIC' : currentAQI > 100 ? 'ELEVATED RISK' : 'OPTIMAL'}\n\n`;
    reportText += `--- PERSONAL EXPOSURE ASSESSMENT ---\n`;
    reportText += `Estimated Intake: ${exposureText}\n`;
    reportText += `Calculated Risk : ${riskLevel.toUpperCase()}\n`;
    reportText += `Risk Assessment : ${parseInt(exposureText) > 800 ? 'CRITICAL - Seek indoors immediately.' : 'WITHIN TOLERANCE LIMITS.'}\n\n`;
    reportText += `*** END OF REPORT ***`;
    
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `Health_Audit_${currentAQI}_${Date.now()}.txt`;
    a.click(); URL.revokeObjectURL(url);
    
    const toast = document.getElementById('toast-report');
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 3000);
});

document.getElementById('stateSelect').addEventListener('change', (e) => {
    currentAQI = parseInt(e.target.value);
    updateUI();
});

//global ui updater
function updateUI() {
    document.getElementById('aqiDisplay').innerText = currentAQI;
    
    const root = document.documentElement;
    const statusText = document.getElementById('status-text');
    const alertTitle = document.getElementById('alert-title');
    const alertDesc = document.getElementById('alert-desc');
    const alertIcon = document.getElementById('alert-icon');
    const precautionsList = document.getElementById('precautions-list');

    let colorHex, statusStr, aTitle, aDesc, pList;

    if(currentAQI > 300) {
        colorHex = '#ef4444'; statusStr = "Hazardous";
        aTitle = "Hazardous Air - Action Req.";
        aDesc = "Toxic particulate levels detected. Extreme risk to respiratory system.";
        pList = [ "Evacuate or avoid all outdoor exposure", "Keep windows tightly sealed", "Run HEPA purifiers at max capacity" ];
        lungs.children.forEach(l => l.material.color.setHex(0xef4444));
        particles.material.color.setHex(0xef4444); particles.material.opacity = 0.8;
    } 
    else if (currentAQI > 100) {
        colorHex = '#f59e0b'; statusStr = "Elevated Risk";
        aTitle = "Health Risk Detected";
        aDesc = "Moderate particulate accumulation. Sensitive groups at risk.";
        pList = [ "Limit prolonged outdoor exertion", "Wear an N95 mask outdoors", "Activate indoor air filtration" ];
        lungs.children.forEach(l => l.material.color.setHex(0xf59e0b));
        particles.material.color.setHex(0xf59e0b); particles.material.opacity = 0.4;
    } 
    else {
        colorHex = '#10b981'; statusStr = "Optimal";
        aTitle = "Air Quality Safe";
        aDesc = "Atmospheric conditions are clean and within safe parameters.";
        pList = [ "Outdoor activity is safe", "No respiratory protection required", "Open windows for natural ventilation" ];
        lungs.children.forEach(l => l.material.color.setHex(0x10b981));
        particles.material.color.setHex(0xffffff); particles.material.opacity = 0.1;
    }

    root.style.setProperty('--current-accent', colorHex);
    statusText.innerText = statusStr;
    alertTitle.innerText = aTitle; alertTitle.style.color = colorHex;
    alertIcon.style.backgroundColor = colorHex; alertDesc.innerText = aDesc;

    precautionsList.innerHTML = '';
    pList.forEach((item, index) => {
        const li = document.createElement('li');
        li.className = 'flex items-start gap-3 precaution-item font-semibold';
        li.style.animationDelay = `${index * 0.1}s`;
        li.innerHTML = `<span class="mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0" style="background-color: ${colorHex}; box-shadow: 0 0 8px ${colorHex}"></span><span>${item}</span>`;
        precautionsList.appendChild(li);
    });

    //map update
    const locInfo = locationsData[currentAQI.toString()];
    if (map && mapMarker && locInfo) {
        map.flyTo([locInfo.lat, locInfo.lng], 5, { animate: true, duration: 1.5 });
        mapMarker.setLatLng([locInfo.lat, locInfo.lng]);
        
        const iconHtml = `<div class="relative flex items-center justify-center w-full h-full"><div class="absolute w-full h-full pulse-beacon" style="background-color: ${colorHex};"></div><div class="relative w-3.5 h-3.5 rounded-full border-2 border-white" style="background-color: ${colorHex}; box-shadow: 0 0 12px ${colorHex};"></div></div>`;
        mapMarker.setIcon(L.divIcon({ className: 'custom-map-icon', html: iconHtml, iconSize: [28, 28], iconAnchor: [14, 14] }));

        mapMarker.unbindTooltip();
        mapMarker.bindTooltip(`<div class="text-xs"><strong class="text-white block mb-0.5">${locInfo.name}</strong><span style="color:${colorHex}" class="mono font-black text-sm block mt-1">AQI: ${currentAQI}</span><span class="text-slate-300 font-bold text-[10px] uppercase tracking-widest mt-1 block">Status: ${locInfo.status}</span></div>`, { className: 'glass-tooltip', direction: 'top', offset: [0, -12] });
    }

    // Call Module Updaters
    updateCalculator();
    updateForecast();
    updatePolicy();
}

window.addEventListener('resize', () => {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    if(map) map.invalidateSize();
});
init();
