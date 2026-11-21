
document.addEventListener("DOMContentLoaded", () => {

    const tableBody = document.getElementById("historyTableBody");
    const message = document.getElementById("historyMessage");
    const refreshButton = document.getElementById("refreshHistoryBtn");

    const searchInput = document.getElementById("historySearch");
    const riskFilter = document.getElementById("historyRiskFilter");
    const dateFilter = document.getElementById("historyDateFilter");
    const clearButton = document.getElementById("clearHistoryFilters");

    let allInspections = [];


    // LOAD INSPECTION HISTORY
    async function loadHistory() {

        tableBody.innerHTML = `
            <tr><td colspan="8">Loading inspection records...</td></tr>
        `;

        message.textContent = "Fetching records from database...";

        refreshButton.disabled = true;

        try {

            const response = await getInspections();

            allInspections = Array.isArray(response)
                ? response
                : response.inspections || [];

            // Sort newest inspections first
            allInspections.sort((a, b) => {
                return new Date(b.created_at) - new Date(a.created_at);
            });

            updateStatistics(allInspections);
            applyHistoryFilters();

        } catch (error) {

            console.error("History loading error:", error);

            allInspections = [];

            tableBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        Unable to load inspection records.
                    </td>
                </tr>
            `;

            message.textContent =
                "Could not connect to the SiteGuard AI backend.";

        } finally {

            refreshButton.disabled = false;

            if (window.lucide) {
                lucide.createIcons();
            }
        }
    }


    // UPDATE STATISTICS USING ALL DATABASE RECORDS
    function updateStatistics(inspections) {

        document.getElementById("historyTotal").textContent =
            inspections.length;

        document.getElementById("historyLow").textContent =
            inspections.filter(item =>
                (item.risk_level || "").toUpperCase() === "LOW"
            ).length;

        document.getElementById("historyMedium").textContent =
            inspections.filter(item =>
                (item.risk_level || "").toUpperCase() === "MEDIUM"
            ).length;

        document.getElementById("historyHigh").textContent =
            inspections.filter(item =>
                (item.risk_level || "").toUpperCase() === "HIGH"
            ).length;
    }


    // APPLY SEARCH, RISK AND DATE FILTERS
    function applyHistoryFilters() {

        const searchTerm = searchInput.value.trim().toLowerCase();
        const selectedRisk = riskFilter.value;
        const selectedDate = dateFilter.value;

        let filteredInspections = [...allInspections];


        // SEARCH BY INSPECTION ID OR FILENAME
        if (searchTerm) {

            filteredInspections = filteredInspections.filter(item => {

                const id = String(item.id || "").toLowerCase();
                const filename = String(item.filename || "").toLowerCase();

                return id.includes(searchTerm) ||
                       `#${id}`.includes(searchTerm) ||
                       filename.includes(searchTerm);
            });
        }


        // FILTER BY RISK LEVEL
        if (selectedRisk !== "all") {

            filteredInspections = filteredInspections.filter(item =>
                (item.risk_level || "").toUpperCase() === selectedRisk
            );
        }


        // FILTER BY DATE
        filteredInspections = filterByDate(
            filteredInspections,
            selectedDate
        );


        displayHistory(filteredInspections);

        message.textContent =
            `Showing ${filteredInspections.length} of ${allInspections.length} inspection record(s).`;
    }


    // DATE FILTER LOGIC
    function filterByDate(inspections, period) {

        if (period === "all") {
            return inspections;
        }

        const now = new Date();

        const startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);

        if (period === "7days") {
            startDate.setDate(startDate.getDate() - 6);
        }

        if (period === "30days") {
            startDate.setDate(startDate.getDate() - 29);
        }

        const endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);

        return inspections.filter(item => {

            if (!item.created_at) return false;

            const inspectionDate = new Date(item.created_at);

            if (Number.isNaN(inspectionDate.getTime())) {
                return false;
            }

            return inspectionDate >= startDate &&
                   inspectionDate <= endDate;
        });
    }


    // DISPLAY INSPECTION TABLE
    function displayHistory(inspections) {

        if (inspections.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="8">
                        No inspections match your search or filters.
                    </td>
                </tr>
            `;

            return;
        }


        tableBody.innerHTML = inspections.map(item => {

            const date = item.created_at
                ? new Date(item.created_at).toLocaleString()
                : "N/A";

            const risk = (item.risk_level || "UNKNOWN").toLowerCase();

            return `
                <tr>
                    <td>#${escapeHTML(item.id)}</td>

                    <td>
                        ${escapeHTML(item.filename || "N/A")}
                    </td>

                    <td>
                        ${escapeHTML(date)}
                    </td>

                    <td>${item.people_detected ?? 0}</td>

                    <td>${item.total_detections ?? 0}</td>

                    <td>${item.potential_violations ?? 0}</td>

                    <td>
                        <span class="risk-badge ${escapeHTML(risk)}">
                            ${escapeHTML(item.risk_level || "UNKNOWN")}
                        </span>
                    </td>

                    <td>
                        <button
                            class="view-inspection-btn"
                            data-file-id="${escapeHTML(item.file_id || "")}"
                            type="button"
                        >
                            View
                        </button>
                    </td>
                </tr>
            `;

        }).join("");


        // VIEW SAVED INSPECTION
        document.querySelectorAll(".view-inspection-btn").forEach(button => {

            button.addEventListener("click", () => {

                const fileId = button.dataset.fileId;

                if (!fileId) return;

                window.location.href =
                    `inspection.html?file_id=${encodeURIComponent(fileId)}`;

            });

        });
    }


    // CLEAR ALL FILTERS
    function clearFilters() {

        searchInput.value = "";
        riskFilter.value = "all";
        dateFilter.value = "all";

        applyHistoryFilters();
    }


    // HTML ESCAPE HELPER
    function escapeHTML(value) {

        return String(value).replace(/[&<>"']/g, character => {

            const entities = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return entities[character];

        });
    }


    // EVENT LISTENERS
    searchInput.addEventListener("input", applyHistoryFilters);

    riskFilter.addEventListener("change", applyHistoryFilters);

    dateFilter.addEventListener("change", applyHistoryFilters);

    clearButton.addEventListener("click", clearFilters);

    refreshButton.addEventListener("click", loadHistory);


    // INITIAL LOAD
    loadHistory();

});
