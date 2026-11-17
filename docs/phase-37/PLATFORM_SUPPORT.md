# Platform Support — Phase 37 (Mobile Framework)

| Capability / Target | Linux (Current Host) | Android SDK / Device | iOS / Xcode (macOS) |
| :--- | :--- | :--- | :--- |
| Core Runtime, UI Tree, Layout, Navigation, State | **PASS** (Verified 40/40) | Source & bridge generated | Source & bridge generated |
| `std:mobile` Interpreter Execution (7 demo apps) | **PASS** (Verified) | Uses Kotlin host bridge | Uses Swift host bridge |
| Loopback Preview Host (`127.0.0.1` HTTP + WebSocket) | **PASS** (Verified) | N/A | N/A |
| Native Bridge Source Generation (`.kt`, `.swift`, Gradle, `Info.plist`, `Podfile`) | **PASS** (Verified + SHA256SUMS) | **NOT_VERIFIED** (`ANDROID_HOME`/`javac`/`gradle`/`adb` absent) | **NOT_VERIFIED** (Non-macOS host; `xcodebuild`/`simctl` absent) |
| Physical Device / Emulator Launch (`EMU_DEVICE_UNAVAILABLE` / `IOS_SIMULATOR_UNAVAILABLE`) | Honest skip message | **NOT_VERIFIED** locally | **NOT_VERIFIED** locally |
