package com.efremandrei.kaplanquest;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.JavascriptInterface;
import android.webkit.WebSettings;
import android.webkit.WebView;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

public final class MainActivity extends Activity {
    private static final int PICK_MAP = 41;
    private WebView game;

    private final class ImportBridge {
        @JavascriptInterface public void importMap() {
            runOnUiThread(() -> {
                Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"application/json", "text/plain"});
                startActivityForResult(intent, PICK_MAP);
            });
        }
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        game = new WebView(this);
        game.setBackgroundColor(0xff101a28);
        game.setWebChromeClient(new WebChromeClient());
        WebSettings settings = game.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        game.addJavascriptInterface(new ImportBridge(), "NativeGame");
        game.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(game);
        game.loadUrl("file:///android_asset/index.html?android=1");
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != PICK_MAP || resultCode != RESULT_OK || data == null || game == null) return;
        Uri uri = data.getData();
        if (uri == null) return;
        try (InputStream input = getContentResolver().openInputStream(uri);
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            if (input == null) throw new IllegalArgumentException("Could not read map file");
            byte[] buffer = new byte[8192];
            int length;
            while ((length = input.read(buffer)) != -1) {
                if (output.size() + length > 1000000) throw new IllegalArgumentException("Map file is too large");
                output.write(buffer, 0, length);
            }
            String json = new String(output.toByteArray(), StandardCharsets.UTF_8);
            game.evaluateJavascript("window.kaplanApplyMap(" + JSONObject.quote(json) + ")", null);
        } catch (Exception error) {
            game.evaluateJavascript("document.getElementById('mapStatus').textContent=" +
                JSONObject.quote(error.getMessage() == null ? "Map import failed" : error.getMessage()), null);
        }
    }

    @Override public void onBackPressed() {
        if (game != null) game.evaluateJavascript("window.kaplanBack && window.kaplanBack()", null);
    }

    @Override public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_DPAD_CENTER || keyCode == KeyEvent.KEYCODE_BUTTON_A) {
            game.evaluateJavascript("window.kaplanAction && window.kaplanAction()", null);
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override public void onDestroy() {
        if (game != null) {
            game.destroy();
            game = null;
        }
        super.onDestroy();
    }
}
