
document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
});

async function loadDashboard() {
    try {
        const data = await getInspections();

        if (data.status !== "success") {
            throw new Error("Unable to load inspection records");
        }

        const inspections = data.inspections || [];

        updateStatistics(inspections);
        updateRiskOverview(inspections);
        updateRecentInspections(inspections);

    } catch (error) {
        console.error("Dashboard loading error:", error);

        const table = document.getElementById("recentInspections");

        if (table) {
            table.innerHTML = `
                <tr>
                    <td colspan="5">
                        Unable to load inspection data.
                        Please check your backend connection.
                    </td>
                </tr>
            `;
        }
    }
}

// Update dashboard statistics
function updateStatistics(inspections) {
    const total = inspections.length;

    const people = inspections.reduce(
        (sum, item) => sum + (item.people_detected || 0), 0
    );

    const violations = inspections.reduce(
        (sum, item) => sum + (item.potential_violations || 0), 0
    );

    const equipment = inspections.reduce(
        (sum, item) => sum + (item.equipment_detected || 0), 0
    );

    setText("totalInspections", total);
    setText("totalPeople", people);
    setText("totalViolations", violations);
    setText("totalEquipment", equipment);
}

// Update risk overview
function updateRiskOverview(inspections) {
    const low = inspections.filter(
        item => item.risk_level === "LOW"
    ).length;

    const medium = inspections.filter(
        item => item.risk_level === "MEDIUM"
    ).length;

    const high = inspections.filter(
        item => item.risk_level === "HIGH"
    ).length;

    setText("lowRiskCount", low);
    setText("mediumRiskCount", medium);
    setText("highRiskCount", high);

    const total = inspections.length;

    const lowPercent = total ? (low / total) * 100 : 0;
    const mediumPercent = total ? (medium / total) * 100 : 0;
    const highPercent = total ? (high / total) * 100 : 0;

    setWidth("lowRiskBar", lowPercent);
    setWidth("mediumRiskBar", mediumPercent);
    setWidth("highRiskBar", highPercent);
}

// Display recent inspection records

function updateRecentInspections(inspections) {
    const table = document.getElementById("recentInspections");

    if (!table) return;

    if (inspections.length === 0) {
        table.innerHTML = `
            <tr>
                <td colspan="5">No inspections available yet.</td>
            </tr>
        `;
        return;
    }

    table.innerHTML = inspections.slice(0, 5).map(item => {
        const date = new Date(item.created_at).toLocaleString();

        const riskClass = (item.risk_level || "LOW").toLowerCase();

        return `
            <tr>
                <td>#${item.id}</td>
                <td>${escapeHTML(item.filename)}</td>
                <td>${date}</td>
                <td>${item.people_detected ?? 0}</td>
                <td>
                    <span class="risk-badge ${riskClass}">
                        ${escapeHTML(item.risk_level || "UNKNOWN")}
                    </span>
                </td>
            </tr>
        `;
    }).join("");
}


// Helper functions
function setText(id, value) {
    const element = document.getElementById(id);

    if (element) {
        element.textContent = value;
    }
}

function setWidth(id, percentage) {
    const element = document.getElementById(id);

    if (element) {
        element.style.width = `${percentage}%`;
    }
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}
