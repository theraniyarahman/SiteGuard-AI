
const API_BASE_URL = "http://127.0.0.1:8004";

async function getInspections() {
    const response = await fetch(
        `${API_BASE_URL}/api/inspections`
    );

    if (!response.ok) {
        throw new Error("Failed to fetch inspections");
    }

    return await response.json();
}

async function getInspectionDetails(fileId) {
    const response = await fetch(
        `${API_BASE_URL}/api/inspections/${fileId}`
    );

    if (!response.ok) {
        throw new Error("Failed to fetch inspection details");
    }

    return await response.json();
}

async function uploadInspection(file) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(
        `${API_BASE_URL}/api/inspect`,
        {
            method: "POST",
            body: formData
        }
    );

    if (!response.ok) {
        throw new Error("Inspection upload failed");
    }

    return await response.json();
}
