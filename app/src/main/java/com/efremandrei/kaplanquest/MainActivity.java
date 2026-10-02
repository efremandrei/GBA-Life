package com.efremandrei.kaplanquest;

import android.app.Activity;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;

public final class MainActivity extends Activity {
    private WebView game;

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
        game.setOverScrollMode(View.OVER_SCROLL_NEVER);
        setContentView(game);
        game.loadUrl("file:///android_asset/index.html?android=1");
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
