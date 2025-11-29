document.getElementById("captureBtn").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    document.getElementById("status").innerText = "Capturing...";

    chrome.tabs.sendMessage(tab.id, { action: "extract_page" }, async (response) => {
        if (response && response.text) {
            // Send to background to handle API call
            // For now, just log
            console.log("Captured:", response.text.substring(0, 50) + "...");
            document.getElementById("status").innerText = "Sent to VibeKnowing!";

            // In real implementation, we would message background.js to send the data
        } else {
            document.getElementById("status").innerText = "Failed to capture.";
        }
    });
});
