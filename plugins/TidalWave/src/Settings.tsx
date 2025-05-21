import { useEffect, useState } from "react"
import React from "react"
import { ReactiveStore } from "@luna/core"
import { generateQRCode } from "./native/qrHelper.native"

// Load plugin settings
export const settings = await ReactiveStore.getPluginStorage("TidalWave", {
  enabled: true,
  webPort: 80,
})

export const Settings = () => {
  const [webPort, setWebPort] = useState(settings.webPort)
  const [qrCode, setQrCode] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const code = await generateQRCode()
      setQrCode(code.startsWith("data:image") ? code : `data:image/png;base64,${code}`)
    })()
  }, [])

  return (
    <div
      style={{
        background: "#1a1a2e",
        borderRadius: "16px",
        padding: "32px",
        boxShadow: "0 8px 32px rgba(255, 105, 180, 0.15)",
        maxWidth: "480px",
        margin: "40px auto",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        color: "#fff",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "4px",
          background: "linear-gradient(90deg, #ff69b4, #da70d6)",
        }}
      />

      <h2
        style={{
          fontSize: "1.75rem",
          marginBottom: "16px",
          textAlign: "center",
          color: "#ff69b4",
          fontWeight: "600",
        }}
      >
        TidalWave
      </h2>

      <p
        style={{
          fontSize: "0.95rem",
          lineHeight: "1.6",
          marginBottom: "24px",
          textAlign: "center",
          color: "rgba(255, 255, 255, 0.8)",
        }}
      >
        TidalWave lets you share the Tidal player with multiple people — no more fighting over the aux cable. Everyone
        must be on the same WiFi as this computer. Scan the QR code below.
      </p>

      <div
        style={{
          background: "#fff",
          borderRadius: "12px",
          padding: "16px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {qrCode ? (
          <img
            src={qrCode || "/placeholder.svg"}
            alt="QR Code"
            style={{
              width: "100%",
              maxWidth: "250px",
              height: "auto",
            }}
          />
        ) : (
          <p style={{ textAlign: "center", color: "#555" }}>Generating QR code…</p>
        )}
      </div>

      <div>
        <label
          style={{
            display: "block",
            fontSize: "0.9rem",
            marginBottom: "8px",
            color: "rgba(255, 255, 255, 0.7)",
          }}
        >
          Web Port
        </label>
        <input
          type="number"
          value={webPort}
          onChange={(e) => setWebPort(Number(e.target.value))}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: "8px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backgroundColor: "rgba(255, 255, 255, 0.05)",
            color: "#fff",
            fontSize: "1rem",
            outline: "none",
            transition: "border-color 0.2s, box-shadow 0.2s",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "rgba(255, 105, 180, 0.5)"
            e.target.style.boxShadow = "0 0 0 2px rgba(255, 105, 180, 0.2)"
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "rgba(255, 255, 255, 0.1)"
            e.target.style.boxShadow = "none"
          }}
        />
      </div>
    </div>
  )
}
