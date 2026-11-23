package id.nusantara.mobile;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Locale;

/** Safe, deterministic command parser for the in-app terminal. */
public final class TerminalCommandProcessor {
    public static final class Result {
        public final List<String> output;
        public final boolean clear;
        Result(List<String> output, boolean clear) {
            this.output = Collections.unmodifiableList(output);
            this.clear = clear;
        }
    }

    private TerminalCommandProcessor() {}

    public static Result execute(String rawCommand) {
        String command = rawCommand == null ? "" : rawCommand.trim();
        List<String> lines = new ArrayList<>();
        if (command.isEmpty()) return new Result(lines, false);

        String lower = command.toLowerCase(Locale.ROOT);
        if ("clear".equals(lower) || "bersihkan".equals(lower)) {
            return new Result(lines, true);
        }
        if ("help".equals(lower) || "bantuan".equals(lower)) {
            lines.add("Perintah tersedia:");
            lines.add("  help / bantuan  - daftar perintah");
            lines.add("  version         - versi aplikasi");
            lines.add("  device          - info Android dasar");
            lines.add("  pwd             - direktori privat aplikasi (disamarkan)");
            lines.add("  echo <teks>     - tampilkan teks");
            lines.add("  clear           - bersihkan terminal");
            lines.add("  run              - belum tersedia; runtime belum tertanam");
            return new Result(lines, false);
        }
        if ("version".equals(lower)) {
            lines.add("NUSANTARA Mobile IDE 0.50.0");
            return new Result(lines, false);
        }
        if ("device".equals(lower)) {
            lines.add("Gunakan halaman Info untuk detail build Android.");
            return new Result(lines, false);
        }
        if ("pwd".equals(lower)) {
            lines.add("[direktori privat aplikasi]");
            return new Result(lines, false);
        }
        if (lower.startsWith("echo ")) {
            lines.add(command.substring(5));
            return new Result(lines, false);
        }
        if ("run".equals(lower) || lower.startsWith("run ")) {
            lines.add("Runtime interpreter belum terhubung ke APK Android; program tidak dieksekusi.");
            return new Result(lines, false);
        }
        lines.add("Perintah tidak dikenal. Ketik 'help'.");
        return new Result(lines, false);
    }
}
