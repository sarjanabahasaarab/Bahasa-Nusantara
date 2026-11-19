import Foundation
import Security
import CryptoKit

/// URLSession delegate enforcing SHA-256 SPKI pins for configured DNS hosts.
/// The normal Apple trust evaluation is always performed before pin comparison.
public final class NativeNetworkSecurity: NSObject, URLSessionDelegate {
    private let pinsByHost: [String: Set<String>]

    public lazy var session: URLSession = {
        URLSession(configuration: .ephemeral, delegate: self, delegateQueue: nil)
    }()

    public init(hostPins: [String: [String]]) throws {
        var validated: [String: Set<String>] = [:]
        for (host, pins) in hostPins {
            let normalized = host.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            guard !normalized.isEmpty,
                  !normalized.contains("/"),
                  !normalized.contains(":"),
                  !normalized.contains("*"),
                  !pins.isEmpty else {
                throw NSError(domain: "NusantaraSPKI", code: 1, userInfo: [NSLocalizedDescriptionKey: "Exact hostname and at least one SPKI pin are required."])
            }
            for pin in pins {
                guard pin.hasPrefix("sha256/"),
                      let digest = Data(base64Encoded: String(pin.dropFirst(7))),
                      digest.count == 32 else {
                    throw NSError(domain: "NusantaraSPKI", code: 2, userInfo: [NSLocalizedDescriptionKey: "Pin must be sha256/<base64 SHA-256 digest> with exactly 32 decoded bytes."])
                }
            }
            validated[normalized] = Set(pins)
        }
        self.pinsByHost = validated
        super.init()
    }

    public func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let trust = challenge.protectionSpace.serverTrust,
              SecTrustEvaluateWithError(trust, nil) else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }

        let host = challenge.protectionSpace.host.lowercased()
        guard let expectedPins = pinsByHost[host] else {
            // Unconfigured hosts still receive standard system TLS validation.
            completionHandler(.useCredential, URLCredential(trust: trust))
            return
        }

        let count = SecTrustGetCertificateCount(trust)
        for index in 0..<count {
            guard let certificate = SecTrustGetCertificateAtIndex(trust, index),
                  let key = SecCertificateCopyKey(certificate),
                  let spki = Self.subjectPublicKeyInfo(for: key) else { continue }
            let digest = Data(SHA256.hash(data: spki))
            let pin = "sha256/" + digest.base64EncodedString()
            if expectedPins.contains(pin) {
                completionHandler(.useCredential, URLCredential(trust: trust))
                return
            }
        }
        completionHandler(.cancelAuthenticationChallenge, nil)
    }

    private static func subjectPublicKeyInfo(for key: SecKey) -> Data? {
        guard let raw = SecKeyCopyExternalRepresentation(key, nil) as Data?,
              let attributes = SecKeyCopyAttributes(key) as? [CFString: Any],
              let keyType = attributes[kSecAttrKeyType] as? String else { return nil }

        if keyType == (kSecAttrKeyTypeRSA as String) {
            let algorithm = sequence([
                0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01,
                0x05, 0x00
            ])
            return sequence(algorithm + bitString(raw))
        }

        if keyType == (kSecAttrKeyTypeECSECPrimeRandom as String) {
            let bits = attributes[kSecAttrKeySizeInBits] as? Int ?? 0
            let curveOID: [UInt8]
            switch bits {
            case 256: curveOID = [0x06, 0x08, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x03, 0x01, 0x07]
            case 384: curveOID = [0x06, 0x05, 0x2B, 0x81, 0x04, 0x00, 0x22]
            default: return nil
            }
            let algorithm = sequence([0x06, 0x07, 0x2A, 0x86, 0x48, 0xCE, 0x3D, 0x02, 0x01] + curveOID)
            return sequence(algorithm + bitString(raw))
        }
        return nil
    }

    private static func sequence(_ bytes: [UInt8]) -> [UInt8] {
        return tlv(0x30, bytes)
    }

    private static func bitString(_ bytes: Data) -> [UInt8] {
        return tlv(0x03, [0x00] + Array(bytes))
    }

    private static func tlv(_ tag: UInt8, _ bytes: [UInt8]) -> [UInt8] {
        return [tag] + derLength(bytes.count) + bytes
    }

    private static func derLength(_ length: Int) -> [UInt8] {
        if length < 0x80 { return [UInt8(length)] }
        var value = length
        var encoded: [UInt8] = []
        while value > 0 {
            encoded.insert(UInt8(value & 0xFF), at: 0)
            value >>= 8
        }
        return [0x80 | UInt8(encoded.count)] + encoded
    }
}
