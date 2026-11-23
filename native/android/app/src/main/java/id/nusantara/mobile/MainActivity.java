package id.nusantara.mobile;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.InputType;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Native NUSANTARA Mobile IDE shell.
 *
 * The editor, local project storage and terminal UI are implemented natively.
 * Program execution is deliberately reported as unavailable until the NUSANTARA
 * interpreter/runtime is packaged for Android; the app never pretends to execute code.
 */
public final class MainActivity extends Activity {
    private static final int BG = Color.rgb(11, 18, 32);
    private static final int PANEL = Color.rgb(22, 32, 51);
    private static final int ACCENT = Color.rgb(37, 99, 235);
    private static final int TEXT = Color.rgb(235, 241, 250);
    private static final int MUTED = Color.rgb(151, 164, 184);

    private LinearLayout root;
    private LinearLayout content;
    private EditText editor;
    private TextView terminalOutput;
    private EditText terminalInput;
    private String activeFile = "program.nusantara";
    private final List<String> terminalLines = new ArrayList<>();

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (state != null) {
            activeFile = state.getString("activeFile", activeFile);
        }
        showShell(state == null ? "Beranda" : state.getString("activePage", "Beranda"));
    }

    @Override protected void onSaveInstanceState(Bundle outState) {
        persistEditorDraft();
        outState.putString("activeFile", activeFile);
        outState.putString("activePage", currentPage);
        super.onSaveInstanceState(outState);
    }

    @Override protected void onPause() {
        persistEditorDraft();
        super.onPause();
    }

    private String currentPage = "Beranda";

    private int dp(float value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }

    private TextView text(String value, float size, int color, boolean bold) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        if (bold) view.setTypeface(Typeface.DEFAULT, Typeface.BOLD);
        return view;
    }

    private LinearLayout column() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        return layout;
    }

    private LinearLayout row() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.HORIZONTAL);
        layout.setGravity(Gravity.CENTER_VERTICAL);
        return layout;
    }

    private LinearLayout.LayoutParams lp(int width, int height) {
        return new LinearLayout.LayoutParams(width < 0 ? width : dp(width), height < 0 ? height : dp(height));
    }

    private void showShell(String page) {
        persistEditorDraft();
        currentPage = page;
        root = column();
        root.setBackgroundColor(BG);
        setContentView(root);

        LinearLayout header = column();
        header.setPadding(dp(18), dp(18), dp(18), dp(12));
        header.setBackgroundColor(PANEL);
        header.addView(text("NUSANTARA", 23, TEXT, true));
        TextView subtitle = text("Mobile IDE  •  Android", 12, MUTED, false);
        header.addView(subtitle);
        root.addView(header, lp(-1, -2));

        content = column();
        content.setPadding(dp(16), dp(16), dp(16), dp(12));
        ScrollView scroll = new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.addView(content);
        root.addView(scroll, new LinearLayout.LayoutParams(-1, 0, 1));

        LinearLayout nav = row();
        nav.setPadding(dp(6), dp(8), dp(6), dp(8));
        nav.setBackgroundColor(PANEL);
        addNav(nav, "Beranda", page);
        addNav(nav, "Editor", page);
        addNav(nav, "Terminal", page);
        addNav(nav, "Berkas", page);
        addNav(nav, "Info", page);
        root.addView(nav, lp(-1, 62));

        switch (page) {
            case "Editor": renderEditor(); break;
            case "Terminal": renderTerminal(); break;
            case "Berkas": renderFiles(); break;
            case "Info": renderInfo(); break;
            default: renderHome();
        }
    }

    private void addNav(LinearLayout nav, String label, String active) {
        Button button = new Button(this);
        button.setText(label);
        button.setTextSize(10);
        button.setAllCaps(false);
        button.setTextColor(label.equals(active) ? Color.WHITE : MUTED);
        button.setBackgroundTintList(android.content.res.ColorStateList.valueOf(label.equals(active) ? ACCENT : PANEL));
        nav.addView(button, new LinearLayout.LayoutParams(0, dp(46), 1));
        button.setOnClickListener(v -> showShell(label));
    }

    private void section(String title, String description) {
        content.addView(text(title, 21, TEXT, true), lp(-1, -2));
        TextView desc = text(description, 13, MUTED, false);
        desc.setPadding(0, dp(6), 0, dp(14));
        content.addView(desc, lp(-1, -2));
    }

    private Button action(String label, Runnable task) {
        Button button = new Button(this);
        button.setText(label);
        button.setAllCaps(false);
        button.setOnClickListener(v -> task.run());
        return button;
    }

    private void card(View view) {
        LinearLayout wrapper = column();
        wrapper.setPadding(dp(14), dp(12), dp(14), dp(12));
        wrapper.setBackgroundColor(PANEL);
        wrapper.addView(view);
        LinearLayout.LayoutParams params = lp(-1, -2);
        params.bottomMargin = dp(12);
        content.addView(wrapper, params);
    }

    private void renderHome() {
        section("Selamat datang!", "Lingkungan kerja NUSANTARA di perangkat Android.");
        TextView hero = text("Tulis. Simpan. Jelajahi.", 24, TEXT, true);
        card(hero);
        card(text("Editor kode\nTulis dan simpan berkas .nusantara di penyimpanan privat aplikasi.", 15, TEXT, false));
        card(text("Terminal\nGunakan perintah bantuan, info perangkat, dan pengelolaan sesi terminal.", 15, TEXT, false));
        card(text("Status runtime\nEditor dan terminal dasar tersedia. Eksekusi program belum aktif karena interpreter NUSANTARA belum dipaketkan ke APK Android.", 14, MUTED, false));
        content.addView(action("Buka Editor", () -> showShell("Editor")), lp(-1, -2));
        content.addView(action("Buka Terminal", () -> showShell("Terminal")), lp(-1, -2));
    }

    private void renderEditor() {
        section("Editor NUSANTARA", "Berkas: " + activeFile + "  •  Format .nusantara");
        LinearLayout toolbar = row();
        toolbar.addView(action("Simpan", this::saveCurrentFile), new LinearLayout.LayoutParams(0, dp(48), 1));
        toolbar.addView(action("Jalankan", this::requestRun), new LinearLayout.LayoutParams(0, dp(48), 1));
        content.addView(toolbar, lp(-1, -2));

        editor = new EditText(this);
        editor.setGravity(Gravity.TOP | Gravity.START);
        editor.setTextColor(Color.rgb(220, 232, 248));
        editor.setHintTextColor(MUTED);
        editor.setHint("Tulis kode NUSANTARA di sini...");
        editor.setTextSize(13);
        editor.setTypeface(Typeface.MONOSPACE);
        editor.setPadding(dp(12), dp(12), dp(12), dp(12));
        editor.setMinLines(15);
        editor.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE | InputType.TYPE_TEXT_FLAG_CAP_SENTENCES);
        editor.setBackgroundColor(PANEL);
        String saved = readFile(activeFile);
        editor.setText(saved.isEmpty() ? sampleProgram() : saved);
        LinearLayout.LayoutParams editorParams = lp(-1, -2);
        editorParams.topMargin = dp(12);
        content.addView(editor, editorParams);

        TextView note = text("Catatan: tombol Jalankan belum mengeksekusi kode. Integrasi interpreter Android harus diselesaikan dan diuji sebelum fitur eksekusi diaktifkan.", 12, MUTED, false);
        note.setPadding(0, dp(12), 0, 0);
        content.addView(note, lp(-1, -2));
    }

    private String sampleProgram() {
        return "program HaloNusantara\nmulai\n  tampilkan(\"Halo dari NUSANTARA!\")\nselesai\n";
    }

    private void requestRun() {
        new AlertDialog.Builder(this)
            .setTitle("Runtime belum tersedia")
            .setMessage("Editor sudah aktif, tetapi interpreter NUSANTARA belum terhubung ke APK Android. Kode tidak dijalankan dan tidak ada hasil palsu yang ditampilkan.")
            .setPositiveButton("Buka Terminal", (d, w) -> showShell("Terminal"))
            .setNegativeButton("Mengerti", null)
            .show();
    }

    private boolean isValidProjectFileName(String name) {
        return name != null
            && !name.isEmpty()
            && !name.equals(".nusantara")
            && !name.contains("/")
            && !name.contains("\\")
            && !name.contains("..")
            && name.length() <= 120;
    }

    private void persistEditorDraft() {
        if (editor == null) return;
        String name = activeFile.endsWith(".nusantara") ? activeFile : activeFile + ".nusantara";
        if (!isValidProjectFileName(name)) return;
        writeProjectFile(name, editor.getText().toString());
        activeFile = name;
    }

    private void saveCurrentFile() {
        if (editor == null) return;
        String name = activeFile.trim();
        if (!name.endsWith(".nusantara")) name += ".nusantara";
        if (!isValidProjectFileName(name)) {
            Toast.makeText(this, "Nama berkas tidak valid.", Toast.LENGTH_SHORT).show();
            return;
        }
        if (writeProjectFile(name, editor.getText().toString())) {
            activeFile = name;
            Toast.makeText(this, "Berkas tersimpan: " + name, Toast.LENGTH_SHORT).show();
        } else {
            Toast.makeText(this, "Gagal menyimpan berkas.", Toast.LENGTH_LONG).show();
        }
    }

    private boolean writeProjectFile(String name, String contents) {
        try (FileOutputStream output = openFileOutput(name, MODE_PRIVATE)) {
            output.write(contents.getBytes(StandardCharsets.UTF_8));
            output.flush();
            return true;
        } catch (Exception error) {
            android.util.Log.e("NusantaraMobile", "Tidak dapat menyimpan " + name, error);
            return false;
        }
    }

    private String readFile(String name) {
        try (FileInputStream input = openFileInput(name)) {
            java.io.ByteArrayOutputStream output = new java.io.ByteArrayOutputStream();
            byte[] buffer = new byte[4096];
            int count;
            while ((count = input.read(buffer)) != -1) {
                output.write(buffer, 0, count);
            }
            return new String(output.toByteArray(), StandardCharsets.UTF_8);
        } catch (Exception ignored) {
            return "";
        }
    }

    private void renderTerminal() {
        section("Terminal", "Terminal aplikasi dengan perintah lokal terbatas.");
        terminalOutput = text(terminalLines.isEmpty()
            ? "Terminal NUSANTARA Mobile\nKetik 'help' untuk melihat perintah.\n"
            : joinLines(), 12, Color.rgb(151, 245, 176), false);
        terminalOutput.setTypeface(Typeface.MONOSPACE);
        terminalOutput.setPadding(dp(12), dp(12), dp(12), dp(12));
        terminalOutput.setBackgroundColor(Color.rgb(3, 8, 15));
        content.addView(terminalOutput, lp(-1, 280));

        LinearLayout inputRow = row();
        terminalInput = new EditText(this);
        terminalInput.setSingleLine(true);
        terminalInput.setTextColor(TEXT);
        terminalInput.setHintTextColor(MUTED);
        terminalInput.setHint("Perintah...");
        terminalInput.setTextSize(13);
        terminalInput.setTypeface(Typeface.MONOSPACE);
        inputRow.addView(terminalInput, new LinearLayout.LayoutParams(0, dp(52), 1));
        inputRow.addView(action("Kirim", this::submitTerminalCommand), lp(92, 52));
        content.addView(inputRow, lp(-1, -2));
    }

    private String joinLines() {
        StringBuilder value = new StringBuilder();
        for (String line : terminalLines) value.append(line).append('\n');
        return value.toString();
    }

    private void submitTerminalCommand() {
        if (terminalInput == null || terminalOutput == null) return;
        String command = terminalInput.getText().toString();
        TerminalCommandProcessor.Result result = TerminalCommandProcessor.execute(command);
        if (result.clear) terminalLines.clear();
        else {
            terminalLines.add("$ " + command);
            if (!result.output.isEmpty()) terminalLines.addAll(result.output);
            while (terminalLines.size() > 100) terminalLines.remove(0);
        }
        terminalOutput.setText(terminalLines.isEmpty() ? "Terminal dibersihkan." : joinLines());
        terminalInput.setText("");
    }

    private void renderFiles() {
        section("Berkas proyek", "Berkas disimpan di ruang privat aplikasi dan tidak memerlukan izin penyimpanan umum.");
        File directory = getFilesDir();
        File[] files = directory.listFiles((dir, name) -> name.endsWith(".nusantara"));
        if (files == null || files.length == 0) {
            card(text("Belum ada berkas. Buka Editor lalu tekan Simpan.", 14, MUTED, false));
        } else {
            for (File file : files) {
                Button item = action(file.getName() + "  •  " + file.length() + " byte", () -> {
                    activeFile = file.getName();
                    showShell("Editor");
                });
                content.addView(item, lp(-1, -2));
            }
        }
        content.addView(action("Buat berkas baru", () -> {
            activeFile = "program-" + System.currentTimeMillis() + ".nusantara";
            showShell("Editor");
        }), lp(-1, -2));
    }

    private void renderInfo() {
        section("Tentang NUSANTARA Mobile", "Informasi build dan kemampuan aplikasi.");
        card(text("Versi aplikasi: 0.50.0\nPackage: id.nusantara.aplikasi\nAndroid minimum: API 24\nPenyimpanan: privat aplikasi", 14, TEXT, false));
        card(text("Tersedia: navigasi native, editor teks, simpan/buka .nusantara, terminal perintah dasar.\nBelum tersedia: eksekusi kode, debugger interaktif, integrasi API perangkat penuh.", 14, MUTED, false));
    }

    @Override public void onBackPressed() {
        showShell("Beranda");
    }
}
