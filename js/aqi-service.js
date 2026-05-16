/**
 * aqi-service.js
 * Handles environmental data enrichment, EPA breakpoints, and heatmap calculations.
 */

// Define standard US EPA breakpoints for coloring metrics
const EPA_BREAKPOINTS = [
    { max: 50,  class: "aqi-good", status: "Good", color: "#00e400", fillOpacity: 0.15 },
    { max: 100, class: "aqi-moderate", status: "Moderate", color: "#ffff00", fillOpacity: 0.25 },
    { max: 150, class: "aqi-unhealthy-sensitive", status: "Unhealthy for Sensitive Groups", color: "#ff7e00", fillOpacity: 0.4 },
    { max: 200, class: "aqi-unhealthy", status: "Unhealthy", color: "#ff0000", fillOpacity: 0.55 },
    { max: 300, class: "aqi-very-unhealthy", status: "Very Unhealthy", color: "#8f3f97", fillOpacity: 0.7 },
    { max: Infinity, class: "aqi-hazardous", status: "Hazardous", color: "#7e0023", fillOpacity: 0.85 }
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
        // Default atmospheric baseline variation
        let aqi = Math.floor(Math.random() * (140 - 12)) + 12;
        
        // Inject high-hazard plumes into historically fire-prone Washington zones for compelling demo assets
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