import type { LunaUnload } from "@luna/core";
import { redux, MediaItem, PlayState, ipcRenderer } from "@luna/lib";
import uwuify from "uwuify";

const uwuifier = new uwuify();

const unloads = new Set<LunaUnload>();
unloads.add(() => {
    document.location.reload();
});

// Track already-uwuified text to prevent re-processing
const uwuifiedNodes = new WeakSet<Node>();

function safeUwuify(text: string): string {
    try {
        return uwuifier.uwuify(text);
    } catch {
        return text;
    }
}

function uwuifyTextNodes(root: Node) {
    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                if (
                    uwuifiedNodes.has(node) ||
                    !node.parentElement ||
                    ["SCRIPT", "STYLE", "TEXTAREA", "INPUT"].includes(node.parentElement.tagName)
                ) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    while (walker.nextNode()) {
        const textNode = walker.currentNode as Text;
        textNode.textContent = safeUwuify(textNode.textContent || "");
        uwuifiedNodes.add(textNode);
    }
}

// Initial uwuification
uwuifyTextNodes(document.body);

// Debounced batch update
let pending = false;
const observer = new MutationObserver(() => {
    if (pending) return;
    pending = true;
    requestIdleCallback(() => {
        uwuifyTextNodes(document.body);
        pending = false;
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
});
