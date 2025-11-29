// Content script

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extract_page") {
        // Simple extraction: get all text from body
        // In a real app, we might use Readability.js here
        const text = document.body.innerText;
        sendResponse({ text: text });
    }
});
