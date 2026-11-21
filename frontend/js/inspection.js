
document.addEventListener("DOMContentLoaded", () => {

    // ===================================
    // DOM ELEMENTS
    // ===================================

    const imageInput = document.getElementById("imageInput");
    const browseBtn = document.getElementById("browseBtn");
    const uploadArea = document.getElementById("uploadArea");

    const previewContainer = document.getElementById("imagePreviewContainer");
    const imagePreview = document.getElementById("imagePreview");
    const fileName = document.getElementById("selectedFileName");

    const inspectBtn = document.getElementById("inspectBtn");
    const uploadMessage = document.getElementById("uploadMessage");

    const resultsSection = document.getElementById("resultsSection");
    const inspectionResults = document.getElementById("inspectionResults");

    let selectedFile = null;
    let previewURL = null;


    // ===================================
    // CHECK FOR SAVED INSPECTION
    // ===================================

    const urlParams = new URLSearchParams(window.location.search);
    const savedFileId = urlParams.get("file_id");

    if (savedFileId) {
        loadSavedInspection(savedFileId);
    }


    // ===================================
    // LOAD SAVED INSPECTION
    // ===================================

    async function loadSavedInspection(fileId) {

        uploadArea.hidden = true;
        previewContainer.hidden = true;
        resultsSection.hidden = false;

        showMessage("Loading saved inspection from database...");

        inspectionResults.innerHTML = `
            <p>Retrieving inspection details. Please wait...</p>
        `;

        try {

            const result = await getInspectionDetails(fileId);

            console.log("Saved inspection response:", result);

            if (!result || result.status !== "success") {
                throw new Error("Unable to retrieve saved inspection.");
            }

            displayInspectionResults(result);

            showMessage("Saved inspection loaded successfully.");

        } catch (error) {

            console.error("Saved inspection error:", error);

            inspectionResults.innerHTML = `
                <div class="inspection-error">
                    <h3>Unable to Load Inspection</h3>
                    <p>${escapeHTML(error.message || "Unable to retrieve inspection.")}</p>
                    <a href="history.html" class="text-button">
                        Back to Inspection History
                    </a>
                </div>
            `;

            showMessage("Could not retrieve this inspection.");

        }

        refreshIcons();
    }


    // ===================================
    // BROWSE IMAGE
    // ===================================

    browseBtn.addEventListener("click", (event) => {
        event.preventDefault();
        imageInput.click();
    });


    // ===================================
    // FILE SELECTION
    // ===================================

    imageInput.addEventListener("change", (event) => {
        handleFile(event.target.files[0]);
    });


    // ===================================
    // VALIDATE AND PREVIEW IMAGE
    // ===================================

    function handleFile(file) {

        if (!file) return;

        const allowedTypes = ["image/jpeg", "image/png"];

        if (!allowedTypes.includes(file.type)) {
            showMessage("Please select a JPG, JPEG or PNG image.");
            imageInput.value = "";
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            showMessage("Image size must be less than 10 MB.");
            imageInput.value = "";
            return;
        }

        if (previewURL) {
            URL.revokeObjectURL(previewURL);
        }

        selectedFile = file;
        previewURL = URL.createObjectURL(file);

        imagePreview.src = previewURL;
        fileName.textContent = file.name;

        previewContainer.hidden = false;
        uploadArea.hidden = true;
        resultsSection.hidden = true;

        showMessage("Image selected successfully.");
    }


    // ===================================
    // DRAG AND DROP
    // ===================================

    uploadArea.addEventListener("dragover", (event) => {
        event.preventDefault();
        uploadArea.classList.add("dragover");
    });

    uploadArea.addEventListener("dragleave", () => {
        uploadArea.classList.remove("dragover");
    });

    uploadArea.addEventListener("drop", (event) => {

        event.preventDefault();
        uploadArea.classList.remove("dragover");

        const file = event.dataTransfer.files[0];
        handleFile(file);
    });


    // ===================================
    // RUN AI INSPECTION
    // ===================================

    inspectBtn.addEventListener("click", async (event) => {

        event.preventDefault();

        if (!selectedFile) {
            showMessage("Please select an image first.");
            return;
        }

        inspectBtn.disabled = true;
        inspectBtn.textContent = "Processing image...";

        showMessage("AI model is analyzing your image. Please wait...");

        resultsSection.hidden = true;

        try {

            console.log("Sending image to SiteGuard AI backend...");

            const result = await uploadInspection(selectedFile);

            console.log("Backend response:", result);

            if (!result || result.status !== "success") {
                throw new Error("Inspection failed.");
            }

            displayInspectionResults(result);

            resultsSection.hidden = false;

            showMessage("Inspection completed successfully.");

        } catch (error) {

            console.error("Inspection error:", error);

            showMessage(
                error.message ||
                "Unable to complete inspection. Check backend connection."
            );

        } finally {

            inspectBtn.disabled = false;

            inspectBtn.innerHTML = `
                <i data-lucide="scan"></i>
                Run AI Inspection
            `;

            refreshIcons();
        }
    });


    // ===================================
    // DISPLAY INSPECTION RESULTS
    // ===================================

    function displayInspectionResults(result) {

        const inspection = result.inspection || result;

        const detections =
            result.detections ||
            inspection.detections ||
            [];

        const images =
            result.images ||
            inspection.images ||
            {};

        const riskLevel = inspection.risk_level || "UNKNOWN";
        const riskClass = riskLevel.toLowerCase();

        const annotatedPath =
            images.annotated ||
            result.annotated_image ||
            inspection.annotated_image ||
            "";

        const originalPath =
            images.original ||
            result.original_image ||
            inspection.original_image ||
            "";

        const annotatedImage = annotatedPath
            ? getImageURL(annotatedPath)
            : "";

        const originalImage = originalPath
            ? getImageURL(originalPath)
            : "";

        const totalDetections =
            inspection.total_detections ?? detections.length;

        const potentialViolations =
            inspection.potential_violations ?? 0;

        const peopleDetected =
            inspection.people_detected ?? 0;

        const ppeDetections =
            inspection.ppe_detections ??
            detections.filter(item =>
                isPPEClass(item.class_name)
            ).length;

        const inspectionId =
            inspection.id ?? result.id ?? "N/A";

        const inspectionDate = inspection.created_at
            ? new Date(inspection.created_at).toLocaleString()
            : new Date().toLocaleString();

        const filename =
            inspection.filename ||
            result.filename ||
            selectedFile?.name ||
            "N/A";


        // SEPARATE DETECTIONS

        const violationDetections = detections.filter(item =>
            isViolationClass(item.class_name)
        );

        const equipmentDetections = detections.filter(item =>
            isPPEClass(item.class_name) &&
            !isViolationClass(item.class_name)
        );

        const otherDetections = detections.filter(item =>
            !isPPEClass(item.class_name)
        );


        // BUILD DETECTION TABLE

        const detectionRows = detections.length

            ? detections.map(item => {

                const className = item.class_name || "Unknown";
                const confidence = Number(item.confidence || 0);

                const category = isViolationClass(className)
                    ? "Potential Violation"
                    : isPPEClass(className)
                        ? "PPE Equipment"
                        : "Other Object";

                const categoryClass = isViolationClass(className)
                    ? "violation"
                    : isPPEClass(className)
                        ? "equipment"
                        : "other";

                return `
                    <tr>
                        <td>
                            <strong>${escapeHTML(className)}</strong>
                        </td>

                        <td>
                            <span class="detection-category ${categoryClass}">
                                ${category}
                            </span>
                        </td>

                        <td>
                            ${Number.isFinite(confidence)
                                ? (confidence * 100).toFixed(1) + "%"
                                : "N/A"}
                        </td>
                    </tr>
                `;

            }).join("")

            : `
                <tr>
                    <td colspan="3">No objects detected.</td>
                </tr>
            `;


        // BUILD RESULT HTML

        inspectionResults.innerHTML = `

            <!-- BACK NAVIGATION -->

            <div class="result-navigation">
                <a href="history.html" class="text-button">
                    <i data-lucide="arrow-left"></i>
                    Back to Inspection History
                </a>
            </div>


            <!-- REPORT INFORMATION -->

            <div class="inspection-report-header">

                <div>
                    <p class="welcome-label">INSPECTION REPORT</p>

                    <h2>Safety Assessment</h2>

                    <p>
                        Inspection #${escapeHTML(inspectionId)}
                    </p>
                </div>

                <div class="inspection-date">
                    <span>Inspection Date</span>
                    <strong>${escapeHTML(inspectionDate)}</strong>
                </div>

            </div>


            <!-- PDF DOWNLOAD BUTTON -->

            <div class="pdf-download-container">

                <button
                    type="button"
                    id="downloadReportBtn"
                    class="download-report-btn"
                >
                    <i data-lucide="file-down"></i>
                    Download PDF Report
                </button>

            </div>


            <!-- SUMMARY CARDS -->

            <div class="result-summary">

                <div class="result-card">
                    <span>Risk Level</span>
                    <h2>
                        <span class="risk-badge ${escapeHTML(riskClass)}">
                            ${escapeHTML(riskLevel)}
                        </span>
                    </h2>
                </div>

                <div class="result-card">
                    <span>Risk Score</span>
                    <h2>${escapeHTML(inspection.risk_score ?? 0)}</h2>
                </div>

                <div class="result-card">
                    <span>People Detected</span>
                    <h2>${escapeHTML(peopleDetected)}</h2>
                </div>

                <div class="result-card">
                    <span>Total Detections</span>
                    <h2>${escapeHTML(totalDetections)}</h2>
                </div>

            </div>


            <!-- SAFETY ASSESSMENT -->

            <div class="safety-assessment">

                <div class="assessment-heading">

                    <div>
                        <h3>Safety Assessment</h3>
                        <p>AI-based inspection summary</p>
                    </div>

                    <span class="risk-badge ${escapeHTML(riskClass)}">
                        ${escapeHTML(riskLevel)}
                    </span>

                </div>


                <div class="assessment-grid">

                    <div class="assessment-item">
                        <span>Potential Violations</span>
                        <strong class="violation-number">
                            ${escapeHTML(potentialViolations)}
                        </strong>
                    </div>

                    <div class="assessment-item">
                        <span>PPE Detections</span>
                        <strong>${escapeHTML(ppeDetections)}</strong>
                    </div>

                    <div class="assessment-item">
                        <span>Detected Equipment</span>
                        <strong>${equipmentDetections.length}</strong>
                    </div>

                    <div class="assessment-item">
                        <span>Other Objects</span>
                        <strong>${otherDetections.length}</strong>
                    </div>

                </div>


                <div class="inspection-status">
                    <span>Inspection Status</span>
                    <p>
                        ${escapeHTML(
                            inspection.inspection_status ||
                            "Inspection completed"
                        )}
                    </p>
                </div>

            </div>


            <!-- ANNOTATED IMAGE -->

            ${annotatedImage ? `

                <div class="annotated-preview">

                    <div class="result-section-heading">
                        <h3>AI Annotated Image</h3>
                        <p>Objects identified by the detection model.</p>
                    </div>

                    <img
                        src="${escapeHTML(annotatedImage)}"
                        alt="AI annotated inspection result"
                        loading="lazy"
                    >

                </div>

            ` : ""}


            <!-- POTENTIAL VIOLATIONS -->

            <div class="result-detail-section">

                <div class="result-section-heading">
                    <h3>Potential PPE Violations</h3>
                    <p>Missing-PPE classes identified by the AI model.</p>
                </div>

                <div class="result-count-card violation-count-card">
                    <strong>${violationDetections.length}</strong>
                    <span>Missing-PPE detection instance(s)</span>
                </div>

                ${violationDetections.length ? `

                    <div class="detection-tags">

                        ${violationDetections.map(item => `
                            <span class="detection-tag violation-tag">
                                ${escapeHTML(item.class_name)}
                            </span>
                        `).join("")}

                    </div>

                ` : `

                    <p class="empty-result">
                        No missing-PPE classes were detected.
                    </p>

                `}

            </div>


            <!-- PPE EQUIPMENT -->

            <div class="result-detail-section">

                <div class="result-section-heading">
                    <h3>Detected PPE Equipment</h3>
                    <p>Safety equipment classes identified by the model.</p>
                </div>

                <div class="result-count-card equipment-count-card">
                    <strong>${equipmentDetections.length}</strong>
                    <span>PPE detection instance(s)</span>
                </div>

                ${equipmentDetections.length ? `

                    <div class="detection-tags">

                        ${equipmentDetections.map(item => `
                            <span class="detection-tag equipment-tag">
                                ${escapeHTML(item.class_name)}
                            </span>
                        `).join("")}

                    </div>

                ` : `

                    <p class="empty-result">
                        No PPE equipment classes were detected.
                    </p>

                `}

            </div>


            <!-- ALL DETECTIONS -->

            <div class="detection-table">

                <div class="result-section-heading">
                    <h3>Detection Details</h3>
                    <p>Complete list of objects identified by the AI model.</p>
                </div>

                <div class="table-container">

                    <table>

                        <thead>
                            <tr>
                                <th>Detected Class</th>
                                <th>Category</th>
                                <th>Confidence</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${detectionRows}
                        </tbody>

                    </table>

                </div>

            </div>


            <!-- ORIGINAL IMAGE -->

            ${originalImage ? `

                <div class="original-image-preview">

                    <h3>Original Inspection Image</h3>

                    <img
                        src="${escapeHTML(originalImage)}"
                        alt="Original uploaded inspection image"
                        loading="lazy"
                    >

                </div>

            ` : ""}


            <!-- IMPORTANT NOTE -->

            <div class="inspection-disclaimer">

                <i data-lucide="info"></i>

                <p>
                    AI-generated detections are intended to assist safety
                    monitoring. Potential violations should be reviewed
                    and verified by a human safety officer before action
                    is taken. Detection counts do not represent a
                    confirmed worker-level compliance assessment.
                </p>

            </div>

        `;


        // ATTACH PDF BUTTON EVENT

        const downloadButton =
            document.getElementById("downloadReportBtn");

        downloadButton.addEventListener("click", async () => {

            await generatePDFReport({
                inspectionId,
                inspectionDate,
                filename,
                riskLevel,
                riskScore: inspection.risk_score ?? 0,
                peopleDetected,
                totalDetections,
                potentialViolations,
                ppeDetections,
                equipmentCount: equipmentDetections.length,
                otherCount: otherDetections.length,
                inspectionStatus:
                    inspection.inspection_status || "Inspection completed",
                detections,
                annotatedImage
            }, downloadButton);

        });

        refreshIcons();

    }


    // ===================================
    // GENERATE PDF REPORT
    // ===================================

    async function generatePDFReport(report, button) {

        if (!window.jspdf || !window.jspdf.jsPDF) {

            showMessage(
                "PDF library could not be loaded. Check your internet connection and refresh the page."
            );

            return;
        }

        const originalButtonHTML = button.innerHTML;

        button.disabled = true;
        button.textContent = "Generating PDF...";

        showMessage("Generating your inspection PDF report...");

        try {

            const { jsPDF } = window.jspdf;

            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            const margin = 18;
            const contentWidth = pageWidth - margin * 2;

            let y = 44;


            // ===================================
            // PDF HELPER FUNCTIONS
            // ===================================

            function ensurePdfSpace(requiredSpace) {

                if (y + requiredSpace > pageHeight - 22) {

                    pdf.addPage();
                    y = 22;
                }
            }


            function addPdfSection(title) {

                ensurePdfSpace(16);

                y += 4;

                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(11);
                pdf.setTextColor(25, 75, 125);

                pdf.text(title, margin, y);

                y += 7;
            }


            function addPdfText(label, value) {

                const textValue = String(value ?? "N/A");

                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(9);

                const lines = pdf.splitTextToSize(
                    textValue,
                    contentWidth - 48
                );

                const rowHeight = Math.max(7, lines.length * 5);

                ensurePdfSpace(rowHeight);

                pdf.setFont("helvetica", "bold");
                pdf.setFontSize(9);
                pdf.setTextColor(55, 65, 80);

                pdf.text(`${label}:`, margin, y);

                pdf.setFont("helvetica", "normal");
                pdf.text(lines, margin + 48, y);

                y += rowHeight;
            }


            // ===================================
            // PDF HEADER
            // ===================================

            pdf.setFillColor(8, 15, 30);
            pdf.rect(0, 0, pageWidth, 34, "F");

            pdf.setTextColor(255, 255, 255);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(19);

            pdf.text("SITEGUARD AI", margin, 15);

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);

            pdf.text("INDUSTRIAL SAFETY MONITORING", margin, 23);

            pdf.text("INSPECTION REPORT", pageWidth - margin, 23, {
                align: "right"
            });


            // ===================================
            // PDF TITLE
            // ===================================

            pdf.setTextColor(20, 35, 55);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(16);

            pdf.text("Safety Assessment Report", margin, y);

            y += 10;


            // ===================================
            // INSPECTION INFORMATION
            // ===================================

            addPdfSection("Inspection Information");

            addPdfText("Inspection ID", report.inspectionId);
            addPdfText("Filename", report.filename);
            addPdfText("Inspection Date", report.inspectionDate);
            addPdfText("Inspection Status", report.inspectionStatus);


            // ===================================
            // RISK SUMMARY
            // ===================================

            addPdfSection("Risk Summary");

            addPdfText("Risk Level", report.riskLevel);
            addPdfText("Risk Score", report.riskScore);
            addPdfText("People Detected", report.peopleDetected);
            addPdfText("Total Detections", report.totalDetections);
            addPdfText("Potential Violations", report.potentialViolations);
            addPdfText("PPE Detections", report.ppeDetections);
            addPdfText("Detected PPE Equipment", report.equipmentCount);
            addPdfText("Other Objects", report.otherCount);


            // ===================================
            // ANNOTATED IMAGE
            // ===================================

            if (report.annotatedImage) {

                try {

                    const imageData =
                        await fetchImageAsDataURL(report.annotatedImage);

                    if (imageData) {

                        ensurePdfSpace(95);

                        addPdfSection("AI Annotated Image");

                        const imageProperties =
                            pdf.getImageProperties(imageData);

                        const maxWidth = contentWidth;
                        const maxHeight = 75;

                        const ratio = Math.min(
                            maxWidth / imageProperties.width,
                            maxHeight / imageProperties.height
                        );

                        const imageWidth =
                            imageProperties.width * ratio;

                        const imageHeight =
                            imageProperties.height * ratio;

                        const imageType = imageData.startsWith("data:image/png")
                            ? "PNG"
                            : "JPEG";

                        pdf.addImage(
                            imageData,
                            imageType,
                            margin,
                            y,
                            imageWidth,
                            imageHeight
                        );

                        y += imageHeight + 8;
                    }

                } catch (imageError) {

                    console.warn(
                        "Could not add annotated image to PDF:",
                        imageError
                    );

                    ensurePdfSpace(12);

                    pdf.setFontSize(9);
                    pdf.setTextColor(110, 110, 110);

                    pdf.text(
                        "Annotated image could not be included in this report.",
                        margin,
                        y
                    );

                    y += 8;
                }
            }


            // ===================================
            // DETECTION DETAILS TABLE
            // ===================================

            ensurePdfSpace(25);

            addPdfSection("Detection Details");

            const columnX = [
                margin,
                margin + 58,
                margin + 125
            ];

            pdf.setFillColor(230, 238, 248);

            pdf.rect(
                margin,
                y - 5,
                contentWidth,
                9,
                "F"
            );

            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(9);
            pdf.setTextColor(25, 45, 70);

            pdf.text("Detected Class", columnX[0] + 2, y);
            pdf.text("Category", columnX[1] + 2, y);
            pdf.text("Confidence", columnX[2] + 2, y);

            y += 9;

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(8);

            if (!report.detections.length) {

                ensurePdfSpace(10);

                pdf.text("No objects detected.", margin + 2, y);

                y += 8;

            } else {

                report.detections.forEach((item, index) => {

                    const className = String(
                        item.class_name || "Unknown"
                    );

                    const category = isViolationClass(className)
                        ? "Potential Violation"
                        : isPPEClass(className)
                            ? "PPE Equipment"
                            : "Other Object";

                    const confidence = Number(item.confidence || 0);

                    const confidenceText =
                        Number.isFinite(confidence)
                            ? (confidence * 100).toFixed(1) + "%"
                            : "N/A";

                    const classLines = pdf.splitTextToSize(
                        className,
                        52
                    );

                    const categoryLines = pdf.splitTextToSize(
                        category,
                        63
                    );

                    const rowHeight = Math.max(
                        9,
                        classLines.length * 4,
                        categoryLines.length * 4
                    );

                    ensurePdfSpace(rowHeight + 1);

                    if (index % 2 === 0) {

                        pdf.setFillColor(247, 249, 252);

                        pdf.rect(
                            margin,
                            y - 5,
                            contentWidth,
                            rowHeight,
                            "F"
                        );
                    }

                    pdf.setFont("helvetica", "normal");
                    pdf.setFontSize(8);
                    pdf.setTextColor(40, 50, 65);

                    pdf.text(classLines, columnX[0] + 2, y);
                    pdf.text(categoryLines, columnX[1] + 2, y);
                    pdf.text(confidenceText, columnX[2] + 2, y);

                    y += rowHeight;
                });
            }


            // ===================================
            // SAFETY DISCLAIMER
            // ===================================

            ensurePdfSpace(35);

            addPdfSection("Important Safety Notice");

            const disclaimer =
                "AI-generated detections are intended to assist safety monitoring. Potential violations should be reviewed and verified by a human safety officer before action is taken. Detection counts do not represent a confirmed worker-level compliance assessment. The displayed risk score is a preliminary heuristic and is not a calibrated probability of an accident or injury.";

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            pdf.setTextColor(75, 85, 100);

            const disclaimerLines = pdf.splitTextToSize(
                disclaimer,
                contentWidth
            );

            pdf.text(disclaimerLines, margin, y);

            y += disclaimerLines.length * 5 + 10;


            // ===================================
            // FOOTER ON EVERY PAGE
            // ===================================

            const pageCount = pdf.internal.getNumberOfPages();

            for (let page = 1; page <= pageCount; page++) {

                pdf.setPage(page);

                pdf.setDrawColor(210, 220, 230);

                pdf.line(
                    margin,
                    pageHeight - 15,
                    pageWidth - margin,
                    pageHeight - 15
                );

                pdf.setFont("helvetica", "normal");
                pdf.setFontSize(8);
                pdf.setTextColor(120, 130, 145);

                pdf.text(
                    "Generated by SiteGuard AI",
                    margin,
                    pageHeight - 9
                );

                pdf.text(
                    `Page ${page} of ${pageCount}`,
                    pageWidth - margin,
                    pageHeight - 9,
                    { align: "right" }
                );
            }


            // ===================================
            // SAVE PDF
            // ===================================

            const safeId = String(report.inspectionId)
                .replace(/[^a-zA-Z0-9_-]/g, "_");

            pdf.save(`SiteGuard_Inspection_${safeId}.pdf`);

            showMessage("PDF inspection report downloaded successfully.");

        } catch (error) {

            console.error("PDF generation error:", error);

            showMessage(
                "Unable to generate PDF report. Please try again."
            );

        } finally {

            button.disabled = false;
            button.innerHTML = originalButtonHTML;

            refreshIcons();
        }
    }


    // ===================================
    // FETCH IMAGE AS DATA URL FOR PDF
    // ===================================

    async function fetchImageAsDataURL(imageURL) {

        const response = await fetch(imageURL);

        if (!response.ok) {
            throw new Error("Unable to fetch annotated image.");
        }

        const blob = await response.blob();

        return new Promise((resolve, reject) => {

            const reader = new FileReader();

            reader.onload = () => resolve(reader.result);

            reader.onerror = () => reject(
                new Error("Unable to convert image.")
            );

            reader.readAsDataURL(blob);

        });
    }


    // ===================================
    // PPE CLASS IDENTIFICATION
    // ===================================

    function isPPEClass(className) {

        const name = String(className || "").toLowerCase();

        const ppeClasses = [
            "helmet",
            "gloves",
            "vest",
            "boots",
            "goggles",
            "no_helmet",
            "no_goggle",
            "no_gloves",
            "no_boots",
            "no_vest"
        ];

        return ppeClasses.includes(name);
    }


    // ===================================
    // VIOLATION CLASS IDENTIFICATION
    // ===================================

    function isViolationClass(className) {

        const name = String(className || "").toLowerCase();

        return [
            "no_helmet",
            "no_goggle",
            "no_gloves",
            "no_boots",
            "no_vest"
        ].includes(name);
    }


    // ===================================
    // IMAGE URL HELPER
    // ===================================

    function getImageURL(path) {

        if (
            path.startsWith("http://") ||
            path.startsWith("https://")
        ) {
            return path;
        }

        return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
    }


    // ===================================
    // MESSAGE HELPER
    // ===================================

    function showMessage(message) {
        uploadMessage.textContent = message;
    }


    // ===================================
    // HTML ESCAPE
    // ===================================

    function escapeHTML(value) {

        return String(value).replace(/[&<>"']/g, char => ({

            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"

        })[char]);

    }


    // ===================================
    // REFRESH LUCIDE ICONS
    // ===================================

    function refreshIcons() {

        if (window.lucide) {
            lucide.createIcons();
        }
    }

});
