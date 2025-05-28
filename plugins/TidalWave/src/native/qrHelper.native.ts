import os from "os";
import QRCode from "qrcode";

/**
 * Categorizes an IP into a preference tier.
 * Lower index = higher priority.
 */
function getIPPriority(ip: string): number {
    if (ip.startsWith("10.")) return 0;
    if (ip.startsWith("192.168.")) return 1;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(ip)) return 2;
    return 3; // other external IPv4
}

/**
 * Selects the most preferred local IPv4 based on ordered ranges.
 */
function getPreferredLocalIPv4(): string {
    const interfaces = os.networkInterfaces();
    const candidates: { ip: string; priority: number }[] = [];

    for (const ifaceList of Object.values(interfaces)) {
        if (!ifaceList) continue;
        for (const iface of ifaceList) {
            if (iface.family === "IPv4" && !iface.internal) {
                candidates.push({ ip: iface.address, priority: getIPPriority(iface.address) });
            }
        }
    }

    if (candidates.length === 0) return "localhost";

    candidates.sort((a, b) => a.priority - b.priority);
    return candidates[0].ip;
}

/**
 * Generates a QR Code (Data URL) pointing to the preferred IP and port.
 */
export function generateQRCode(port: number): Promise<string> {
    const ipAddress = getPreferredLocalIPv4();
    const url = `http://${ipAddress}:${port}`;
    console.log("URL encoded in QR:", url);

    return QRCode.toDataURL(url, {
        errorCorrectionLevel: "H",
        type: "image/png",
    });
}
