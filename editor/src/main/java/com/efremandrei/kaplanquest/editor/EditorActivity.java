package com.efremandrei.kaplanquest.editor;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

public final class EditorActivity extends Activity {
    private static final int OPEN_MAP = 51;
    private static final int SAVE_MAP = 52;
    private WebView editor;
    private String pendingExport;

    private final class FileBridge {
        @JavascriptInterface public void importMap() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain"});
                startActivityForResult(intent, OPEN_MAP);
            });
        }

        @JavascriptInterface public void exportMap(String json) {
            if (json == null || json.length() > 1000000) {
                tellEditor("Map is too large to export.");
                return;
            }
            runOnUiThread(() -> {
                pendingExport = json;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE, "PetahTikva-Map.json");
                startActivityForResult(intent, SAVE_MAP);
            });
        }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        editor = new WebView(this);
        editor.setBackgroundColor(0xff101a28);
        editor.setWebChromeClient(new WebChromeClient());
        WebSettings settings = editor.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        editor.addJavascriptInterface(new FileBridge(), "NativeEditor");
        editor.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(editor);
        editor.loadUrl("file:///android_asset/editor.html?android=1");
    }

    private void tellEditor(String message) {
        runOnUiThread(() -> {
            if (editor != null)
                editor.evaluateJavascript("window.editorFileMessage(" + JSONObject.quote(message) + ")", null);
        });
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (editor == null || (requestCode != OPEN_MAP && requestCode != SAVE_MAP)) return;
        if (resultCode != RESULT_OK || data == null || data.getData() == null) {
            pendingExport = null;
            return;
        }
        Uri uri = data.getData();
        try {
            if (requestCode == SAVE_MAP) {
                if (pendingExport == null) return;
                try (OutputStream output = getContentResolver().openOutputStream(uri)) {
                    if (output == null) throw new IllegalArgumentException("Could not write map file");
                    output.write(pendingExport.getBytes(StandardCharsets.UTF_8));
                }
                pendingExport = null;
                tellEditor("Map exported. Import this JSON file in Kaplan Quest.");
            } else {
                try (InputStream input = getContentResolver().openInputStream(uri);
                     ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                    if (input == null) throw new IllegalArgumentException("Could not read map file");
                    byte[] buffer = new byte[8192];
                    int length;
                    while ((length = input.read(buffer)) != -1) {
                        if (output.size() + length > 1000000)
                            throw new IllegalArgumentException("Map file is too large");
                        output.write(buffer, 0, length);
                    }
                    String json = new String(output.toByteArray(), StandardCharsets.UTF_8);
                    editor.evaluateJavascript("window.editorReceiveMap(" + JSONObject.quote(json) + ")", null);
                }
            }
        } catch (Exception error) {
            tellEditor(error.getMessage() == null ? "File operation failed." : error.getMessage());
        }
    }

    @Override public void onBackPressed() {
        if (editor == null) { finish(); return; }
        editor.evaluateJavascript("window.editorBack && window.editorBack()", value -> {
            if (!"true".equals(value)) finish();
        });
    }

    @Override public void onDestroy() {
        if (editor != null) { editor.destroy(); editor = null; }
        super.onDestroy();
    }
}
