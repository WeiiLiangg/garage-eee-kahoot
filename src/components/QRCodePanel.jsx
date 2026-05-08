import { useEffect, useState } from "react";
import QRCode from "qrcode";

export default function QRCodePanel({ value, label }) {
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    if (!value) {
      setQrCodeUrl("");
      return undefined;
    }

    QRCode.toDataURL(value, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#162a3a",
        light: "#ffffff",
      },
    })
      .then((nextUrl) => {
        if (isMounted) {
          setQrCodeUrl(nextUrl);
          setError("");
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("QR code could not be generated.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [value]);

  return (
    <div className="qr-panel">
      <div>
        <span>{label}</span>
        <strong>Scan to join</strong>
      </div>
      {qrCodeUrl ? (
        <img src={qrCodeUrl} alt="Quiz join QR code" />
      ) : (
        <p className="muted">{error || "Preparing QR code..."}</p>
      )}
    </div>
  );
}
