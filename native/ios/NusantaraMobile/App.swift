import SwiftUI

@main
struct NusantaraMobileApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    var body: some View {
        VStack(spacing: 16) {
            Text("NUSANTARA")
                .font(.largeTitle).bold()
            Text("Native iOS host — simulator lifecycle verification")
                .multilineTextAlignment(.center)
        }
        .padding(32)
        .accessibilityIdentifier("nusantara-native-host")
    }
}
