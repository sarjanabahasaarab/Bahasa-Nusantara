package id.nusantara.mobile.security;

import java.net.IDN;
import java.util.List;
import java.util.concurrent.TimeUnit;
import okhttp3.CertificatePinner;
import okio.ByteString;
import okhttp3.OkHttpClient;

/**
 * Enforces SHA-256 SubjectPublicKeyInfo pins for explicitly configured hosts.
 * OkHttp retains the platform TLS chain and hostname verification in addition to pinning.
 */
public final class NativeNetworkSecurity {
    private NativeNetworkSecurity() {}

    public static OkHttpClient createPinnedClient(String hostname, List<String> sha256Pins) {
        if (hostname == null || hostname.trim().isEmpty() || sha256Pins == null || sha256Pins.isEmpty()) {
            throw new IllegalArgumentException("A hostname and at least one SPKI pin are required.");
        }
        final String host;
        try {
            host = IDN.toASCII(hostname.trim()).toLowerCase(java.util.Locale.ROOT);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Invalid TLS hostname.", ex);
        }
        if (host.contains("/") || host.contains(":") || host.contains("*")) {
            throw new IllegalArgumentException("Only exact DNS hostnames are accepted for pin configuration.");
        }
        CertificatePinner.Builder pins = new CertificatePinner.Builder();
        for (String pin : sha256Pins) {
            if (pin == null || !pin.matches("^sha256/[A-Za-z0-9+/]{43}=$")) {
                throw new IllegalArgumentException("SPKI pin must use sha256/<base64-32-byte-digest> format.");
            }
            byte[] digest;
            try {
                ByteString decoded = ByteString.decodeBase64(pin.substring("sha256/".length()));
                if (decoded == null) throw new IllegalArgumentException("SPKI pin is not valid Base64.");
                digest = decoded.toByteArray();
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("SPKI pin is not valid Base64.", ex);
            }
            if (digest.length != 32) throw new IllegalArgumentException("SPKI SHA-256 digest must be exactly 32 bytes.");
            pins.add(host, pin);
        }
        return new OkHttpClient.Builder()
            .certificatePinner(pins.build())
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build();
    }
}
