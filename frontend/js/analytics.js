
// ======================================
// SITEGUARD AI - ANALYTICS DASHBOARD
// ======================================


// CHART INSTANCES

let riskChartInstance = null;
let activityChartInstance = null;
let violationChartInstance = null;


// STORED DATA

let allInspections = [];
let detailsCache = {};


// ======================================
// INITIALIZE ANALYTICS
// ======================================

document.addEventListener("DOMContentLoaded", () => {

    const refreshButton = document.getElementById("refreshAnalyticsBtn");

    const exportButton = document.getElementById("exportAnalyticsBtn");

    const dateFilter = document.getElementById("analyticsDateFilter");


    // Refresh Analytics

    if (refreshButton) {

        refreshButton.addEventListener("click", loadAnalytics);

    }


    // Export CSV

    if (exportButton) {

        exportButton.addEventListener("click", exportAnalyticsCSV);

    }


    // Date Filter

    if (dateFilter) {

        dateFilter.addEventListener("change", applyDateFilter);

    }


    // Initial Load

    loadAnalytics();

});


// ======================================
// LOAD INSPECTION DATA
// ======================================

async function loadAnalytics() {

    const message = document.getElementById("analyticsMessage");

    const refreshButton = document.getElementById("refreshAnalyticsBtn");


    if (message) {

        message.textContent = "Loading analytics...";

    }


    if (refreshButton) {

        refreshButton.disabled = true;

    }


    try {

        // Fetch latest inspection records

        const response = await getInspections();

        allInspections = response.inspections || [];


        // Clear old cached inspection details

        detailsCache = {};


        // Apply currently selected date filter

        await applyDateFilter();


    } catch (error) {

        console.error("Analytics loading error:", error);

        if (message) {

            message.textContent =
                "Unable to load analytics. Please check whether the backend is running.";

        }

    } finally {

        if (refreshButton) {

            refreshButton.disabled = false;

        }

    }

}


// ======================================
// APPLY DATE FILTER
// ======================================

async function applyDateFilter() {

    const dateFilter = document.getElementById("analyticsDateFilter");

    const selectedPeriod = dateFilter
        ? dateFilter.value
        : "all";


    const filteredInspections = filterInspections(
        allInspections,
        selectedPeriod
    );


    // Update summary cards

    updateAnalyticsCards(filteredInspections);


    // Update charts

    updateRiskChart(filteredInspections);

    updateActivityChart(filteredInspections);


    const message = document.getElementById("analyticsMessage");


    // Empty data state

    if (filteredInspections.length === 0) {

        updateViolationChart([]);

        if (message) {

            message.textContent =
                "No inspection records found for the selected period.";

        }

        return;

    }


    if (message) {

        message.textContent = "Updating PPE violation analytics...";

    }


    try {

        // Fetch individual inspection details

        const detailResults = await Promise.all(

            filteredInspections.map(async (item) => {

                // Use cached details when available

                if (detailsCache[item.file_id]) {

                    return detailsCache[item.file_id];

                }


                try {

                    const result = await getInspectionDetails(item.file_id);

                    detailsCache[item.file_id] = result;

                    return result;

                } catch (error) {

                    console.error(
                        `Failed to load inspection ${item.file_id}:`,
                        error
                    );

                    return null;

                }

            })

        );


        // Update PPE chart

        updateViolationChart(detailResults);


        if (message) {

            message.textContent =
                `Showing ${filteredInspections.length} inspection records.`;

        }


    } catch (error) {

        console.error("PPE analytics error:", error);

        if (message) {

            message.textContent =
                "Some inspection details could not be loaded.";

        }

    }

}


// ======================================
// FILTER INSPECTIONS BY DATE
// ======================================

function filterInspections(inspections, period) {

    if (period === "all") {

        return inspections;

    }


    const now = new Date();

    const startDate = new Date(now);

    startDate.setHours(0, 0, 0, 0);


    // Last 7 days including today

    if (period === "7days") {

        startDate.setDate(startDate.getDate() - 6);

    }


    // Last 30 days including today

    else if (period === "30days") {

        startDate.setDate(startDate.getDate() - 29);

    }


    return inspections.filter(item => {

        if (!item.created_at) {

            return false;

        }


        const inspectionDate = new Date(item.created_at);


        if (Number.isNaN(inspectionDate.getTime())) {

            return false;

        }


        // Today

        if (period === "today") {

            const endDate = new Date(startDate);

            endDate.setDate(endDate.getDate() + 1);


            return inspectionDate >= startDate &&
                   inspectionDate < endDate;

        }


        return inspectionDate >= startDate &&
               inspectionDate <= now;

    });

}


// ======================================
// SUMMARY CARDS
// ======================================

function updateAnalyticsCards(inspections) {


    // Total Inspections

    const totalInspections = inspections.length;


    // Total Detections

    const totalDetections = inspections.reduce(

        (sum, item) => sum + (item.total_detections || 0),

        0

    );


    // Potential Violations

    const totalViolations = inspections.reduce(

        (sum, item) => sum + (item.potential_violations || 0),

        0

    );


    // High Risk Inspections

    const highRisk = inspections.filter(

        item => item.risk_level === "HIGH"

    ).length;


    // Update HTML

    setAnalyticsValue("analyticsTotal", totalInspections);

    setAnalyticsValue("analyticsDetections", totalDetections);

    setAnalyticsValue("analyticsViolations", totalViolations);

    setAnalyticsValue("analyticsHighRisk", highRisk);

}


// ======================================
// UPDATE HTML VALUES
// ======================================

function setAnalyticsValue(id, value) {

    const element = document.getElementById(id);

    if (element) {

        element.textContent = value;

    }

}


// ======================================
// RISK DISTRIBUTION CHART
// ======================================

function updateRiskChart(inspections) {

    const canvas = document.getElementById("riskChart");

    if (!canvas) return;


    const riskCounts = {

        LOW: 0,

        MEDIUM: 0,

        HIGH: 0

    };


    inspections.forEach(item => {

        const risk = (item.risk_level || "").toUpperCase();

        if (Object.prototype.hasOwnProperty.call(riskCounts, risk)) {

            riskCounts[risk]++;

        }

    });


    // Destroy previous chart

    if (riskChartInstance) {

        riskChartInstance.destroy();

    }


    riskChartInstance = new Chart(canvas, {

        type: "doughnut",

        data: {

            labels: [

                "Low Risk",

                "Medium Risk",

                "High Risk"

            ],

            datasets: [{

                data: [

                    riskCounts.LOW,

                    riskCounts.MEDIUM,

                    riskCounts.HIGH

                ],

                backgroundColor: [

                    "#22C55E",

                    "#F59E0B",

                    "#EF4444"

                ],

                borderWidth: 0,

                hoverOffset: 8

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {

                    position: "bottom",

                    labels: {

                        color: "#CBD5E1",

                        padding: 20,

                        usePointStyle: true

                    }

                }

            },

            cutout: "68%"

        }

    });

}


// ======================================
// INSPECTION ACTIVITY CHART
// ======================================

function updateActivityChart(inspections) {

    const canvas = document.getElementById("activityChart");

    if (!canvas) return;


    const dailyCounts = {};


    inspections.forEach(item => {

        if (!item.created_at) return;


        const date = new Date(item.created_at);

        if (Number.isNaN(date.getTime())) return;


        // Consistent date key

        const dateKey = [

            date.getFullYear(),

            String(date.getMonth() + 1).padStart(2, "0"),

            String(date.getDate()).padStart(2, "0")

        ].join("-");


        dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;

    });


    // Sort dates

    const sortedDates = Object.keys(dailyCounts).sort();


    const labels = sortedDates.map(dateKey => {

        const [year, month, day] = dateKey.split("-");

        return new Date(

            Number(year),

            Number(month) - 1,

            Number(day)

        ).toLocaleDateString("en-IN", {

            day: "2-digit",

            month: "short"

        });

    });


    const values = sortedDates.map(date => dailyCounts[date]);


    // Destroy previous chart

    if (activityChartInstance) {

        activityChartInstance.destroy();

    }


    activityChartInstance = new Chart(canvas, {

        type: "line",

        data: {

            labels: labels,

            datasets: [{

                label: "Inspections",

                data: values,

                borderColor: "#36A9F5",

                backgroundColor: "rgba(54, 169, 245, 0.15)",

                borderWidth: 3,

                fill: true,

                tension: 0.35,

                pointRadius: 4,

                pointHoverRadius: 6

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {

                    labels: {

                        color: "#CBD5E1"

                    }

                }

            },

            scales: {

                x: {

                    ticks: {

                        color: "#91A4BD"

                    },

                    grid: {

                        display: false

                    }

                },

                y: {

                    beginAtZero: true,

                    ticks: {

                        color: "#91A4BD",

                        precision: 0

                    },

                    grid: {

                        color: "rgba(145, 164, 189, 0.12)"

                    }

                }

            }

        }

    });

}


// ======================================
// PPE VIOLATION CHART
// ======================================

function updateViolationChart(details) {

    const canvas = document.getElementById("violationChart");

    if (!canvas) return;


    const violationCounts = {

        "No Helmet": 0,

        "No Vest": 0,

        "No Gloves": 0,

        "No Boots": 0,

        "No Goggles": 0

    };


    // Model class mapping

    const classMapping = {

        no_helmet: "No Helmet",

        no_vest: "No Vest",

        no_gloves: "No Gloves",

        no_boots: "No Boots",

        no_goggle: "No Goggles"

    };


    details.forEach(result => {

        if (!result) return;


        const inspection = result.inspection || result;


        const detections =

            result.detections ||

            inspection.detections ||

            [];


        detections.forEach(detection => {

            const className = (detection.class_name || "").toLowerCase();


            if (classMapping[className]) {

                violationCounts[classMapping[className]]++;

            }

        });

    });


    // Destroy previous chart

    if (violationChartInstance) {

        violationChartInstance.destroy();

    }


    violationChartInstance = new Chart(canvas, {

        type: "bar",

        data: {

            labels: Object.keys(violationCounts),

            datasets: [{

                label: "Recorded detections",

                data: Object.values(violationCounts),

                backgroundColor: [

                    "#36A9F5",

                    "#2587D8",

                    "#1D70B8",

                    "#175B99",

                    "#104775"

                ],

                borderRadius: 6,

                maxBarThickness: 48

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {

                    labels: {

                        color: "#CBD5E1"

                    }

                }

            },

            scales: {

                x: {

                    ticks: {

                        color: "#91A4BD"

                    },

                    grid: {

                        display: false

                    }

                },

                y: {

                    beginAtZero: true,

                    ticks: {

                        color: "#91A4BD",

                        precision: 0

                    },

                    grid: {

                        color: "rgba(145, 164, 189, 0.12)"

                    }

                }

            }

        }

    });

}


// ======================================
// EXPORT ANALYTICS AS CSV
// ======================================

function exportAnalyticsCSV() {


    // Get selected date filter

    const dateFilter = document.getElementById("analyticsDateFilter");

    const selectedPeriod = dateFilter

        ? dateFilter.value

        : "all";


    // Filter records

    const inspections = filterInspections(

        allInspections,

        selectedPeriod

    );


    // Check for empty records

    if (inspections.length === 0) {

        alert("No inspection records available to export.");

        return;

    }


    // CSV Headers

    const headers = [

        "Inspection ID",

        "Filename",

        "Inspection Date",

        "Risk Level",

        "Risk Score",

        "Total Detections",

        "People Detected",

        "Equipment Detected",

        "PPE Detections",

        "Potential Violations",

        "Inspection Status"

    ];


    // CSV Rows

    const rows = inspections.map(item => [

        item.id,

        item.filename,

        item.created_at,

        item.risk_level,

        item.risk_score,

        item.total_detections,

        item.people_detected,

        item.equipment_detected,

        item.ppe_detections,

        item.potential_violations,

        item.inspection_status

    ]);


    // Convert values into CSV format

    const csvContent = [

        headers,

        ...rows

    ].map(row =>

        row.map(value =>

            `"${String(value ?? "").replace(/"/g, '""')}"`

        ).join(",")

    ).join("\r\n");


    // Create downloadable file

    const blob = new Blob(

        ["\uFEFF" + csvContent],

        {

            type: "text/csv;charset=utf-8;"

        }

    );


    const url = URL.createObjectURL(blob);


    const link = document.createElement("a");


    link.href = url;


    link.download = `SiteGuard_Analytics_${new Date()

        .toISOString()

        .slice(0, 10)}.csv`;


    document.body.appendChild(link);


    link.click();


    document.body.removeChild(link);


    URL.revokeObjectURL(url);

}
