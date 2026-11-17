# Known Limitations — Phase 37 (Mobile Framework)

1. **No Local Android SDK / JDK / ADB Emulator:** Host environment lacks `JAVA_HOME`, `ANDROID_HOME`, `gradle`, and `adb`. Generating Android Kotlin/Gradle artifacts and manifests is verified (`SHA256SUMS`), whereas Gradle APK compilation and emulator deployment remain `NOT_VERIFIED` on this host (`EMU_DEVICE_UNAVAILABLE`).
2. **No macOS / Xcode Toolchain:** Host OS is Linux `x86_64`. Swift `WKWebView` / `WKScriptMessageHandler` sources, `Info.plist`, and `Podfile` are generated and escaped, whereas `xcodebuild` compilation and `xcrun simctl` execution remain `NOT_VERIFIED` (`IOS_SIMULATOR_UNAVAILABLE`).
3. **Synchronous Interpreter Wrapper Behavior:** NUSANTARA `.nusantara` scripts run synchronously inside the interpreter; native bridge calls returning Promises resolve asynchronously in host TypeScript/WebSocket mode, while synchronous NUSANTARA wrappers expose immediate baseline values or state updates.
