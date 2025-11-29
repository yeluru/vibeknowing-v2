// Background script

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "analyze-selection",
        title: "Analyze selection with VibeKnowing",
        contexts: ["selection"]
    });

    chrome.contextMenus.create({
        id: "analyze-page",
        title: "Analyze this page with VibeKnowing",
        contexts: ["page"]
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "analyze-selection") {
        sendToVibeKnowing(info.selectionText, tab.url, "text");
    } else if (info.menuItemId === "analyze-page") {
        // Ask content script to extract full page text
        chrome.tabs.sendMessage(tab.id, { action: "extract_page" }, (response) => {
            if (response && response.text) {
                sendToVibeKnowing(response.text, tab.url, "web");
            }
        });
    }
});

async function sendToVibeKnowing(content, url, type) {
    // TODO: Get user token from storage
    const token = "dummy_token";

    try {
        const response = await fetch("http://localhost:8000/ingest/extension", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                content: content,
                url: url,
                type: type
            })
        });

        if (response.ok) {
            console.log("Content sent to VibeKnowing!");
        } else {
            console.error("Failed to send content");
        }
    } catch (error) {
        console.error("Error sending content:", error);
    }
}
