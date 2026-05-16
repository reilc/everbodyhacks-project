/**
 * aqi-service.js
 * Handles environmental data enrichment, severity color spectrums, and map heatmaps.
 */

// Custom color palette graduating smoothly from Cool Blue (Good) to Deep Dark Red (Hazardous)
const EPA_BREAKPOINTS = [
    { max: 50,  class: "aqi-good", status: "Good", color: "#2f80ed", fillOpacity: 0.15 },               // Cool Blue
    { max: 100, class: "aqi-moderate", status: "Moderate", color: "#6baed6", fillOpacity: 0.25 },       // Light Ice Blue
    { max: 150, class: "aqi-unhealthy-sensitive", status: "Elevated Risk", color: "#fcae91", fillOpacity: 0.4 }, // Soft Peach/Coral
    { max: 200, class: "aqi-unhealthy", status: "Unhealthy", color: "#fb6a4a", fillOpacity: 0.55 },       // Bright Orange-Red
    { max: 300, class: "aqi-very-unhealthy", status: "Very Unhealthy", color: "#de2d26", fillOpacity: 0.7 },  // Crimson Red
    { max: Infinity, class: "aqi-hazardous", status: "Hazardous Severe", color: "#a50f15", fillOpacity: 0.85 } // Deep Dark Maroon Red
];

/**
 * Determines environmental styles and status text based on an AQI rating.
 */
function getAQIMetrics(aqi) {
    return EPA_BREAKPOINTS.find(breakpoint => aqi <= breakpoint.max);
}

/**
 * Enriches a raw list of cities with random/situational AQI indices and emergency stocks.
 */
function enrichLocationData(basePlaces) {
    return basePlaces.map(place => {
        let aqi = Math.floor(Math.random() * (140 - 12)) + 12;
        
        const highRiskZones = ["Chelan", "Winthrop", "Cle Elum", "Wenatchee", "Leavenworth", "Brewster", "Pateros", "Twisp"];
        if (highRiskZones.includes(place.name)) {
            aqi = Math.floor(Math.random() * (340 - 160)) + 160; 
        }

        return {
            ...place,
            aqi: aqi,
            resources: {
                masks: aqi > 150 ? Math.floor(Math.random() * 1500) + 400 : Math.floor(Math.random() * 150),
                water: Math.floor(Math.random() * 500) + 60,
                beds: ["Seattle", "Spokane", "Tacoma", "Yakima"].includes(place.name) ? Math.floor(Math.random() * 100) + 30 : Math.floor(Math.random() * 12),
                purifiers: Math.floor(Math.random() * 30)
            }
        };
    });
}