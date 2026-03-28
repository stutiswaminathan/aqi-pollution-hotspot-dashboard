const citySelect = document.getElementById("citySelect");
const aqiDisplay = document.getElementById("aqiDisplay");
const leftLung = document.getElementById("leftLung");
const rightLung = document.getElementById("rightLung");
const mapMarker = document.getElementById("mapMarker");
const statusText = document.getElementById("statusText");
const alertText = document.getElementById("alertText");
const alertBox = document.getElementById("alertBox");
const riskText = document.getElementById("riskText");

citySelect.addEventListener("change", function() {

    let aqi = parseInt(this.value);
    aqiDisplay.innerText = aqi;

    let color, status, risk;

    if (aqi > 300) {
        color = "#ef4444";
        status = "Hazardous";
        risk = "Respiratory Risk: 85%";
    } else if (aqi > 100) {
        color = "#f59e0b";
        status = "Elevated Risk";
        risk = "Respiratory Risk: 45%";
    } else {
        color = "#10b981";
        status = "Optimal";
        risk = "Respiratory Risk: 18%";
    }

    leftLung.setAttribute("fill", color);
    rightLung.setAttribute("fill", color);
    mapMarker.setAttribute("fill", color);

    statusText.innerText = status;
    statusText.style.color = color;

    alertText.innerText = status;
    alertText.style.color = color;
    alertBox.style.borderColor = color;

    riskText.innerText = risk;
    riskText.style.color = color;
});
