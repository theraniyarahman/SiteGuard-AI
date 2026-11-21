
document.addEventListener("DOMContentLoaded", () => {

    const isInsidePages = window.location.pathname.includes("/pages/");

    const basePath = isInsidePages ? "../" : "";

    const pages = {
        overviewNav: basePath + "index.html",
        inspectionNav: basePath + "pages/inspection.html",
        historyNav: basePath + "pages/history.html",
        analyticsNav: basePath + "pages/analytics.html",
        settingsNav: basePath + "pages/settings.html"
    };

    Object.entries(pages).forEach(([id, url]) => {

        const link = document.getElementById(id);

        if (!link) return;

        link.addEventListener("click", (event) => {
            event.preventDefault();
            window.location.href = url;
        });

    });

    const newInspectionBtn = document.getElementById("newInspectionBtn");

    if (newInspectionBtn) {
        newInspectionBtn.addEventListener("click", () => {
            window.location.href = "pages/inspection.html";
        });
    }

    const viewAllBtn = document.getElementById("viewAllBtn");

    if (viewAllBtn) {
        viewAllBtn.addEventListener("click", () => {
            window.location.href = "pages/history.html";
        });
    }

});
