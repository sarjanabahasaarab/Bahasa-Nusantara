import XCTest
@testable import NusantaraMobile

final class NativeNetworkSecurityTests: XCTestCase {
    func testAcceptsWellFormedSha256SpkiPin() throws {
        let pin = "sha256/" + Data(repeating: 0, count: 32).base64EncodedString()
        let security = try NativeNetworkSecurity(hostPins: ["api.example.com": [pin]])
        XCTAssertNotNil(security.session)
    }

    func testRejectsMalformedPin() {
        XCTAssertThrowsError(try NativeNetworkSecurity(hostPins: ["api.example.com": ["sha256/not-a-pin"]]))
    }

    func testRejectsWildcardHostname() {
        let pin = "sha256/" + Data(repeating: 0, count: 32).base64EncodedString()
        XCTAssertThrowsError(try NativeNetworkSecurity(hostPins: ["*.example.com": [pin]]))
    }

    func testRejectsEmptyPinSet() {
        XCTAssertThrowsError(try NativeNetworkSecurity(hostPins: ["api.example.com": []]))
    }
}
