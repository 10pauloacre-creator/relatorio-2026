package com.relatoriosdiarios.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.webkit.JavascriptInterface;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().getSettings().setDefaultTextEncodingName("utf-8");
            bridge.getWebView().getSettings().setTextZoom(100);
            bridge.getWebView().addJavascriptInterface(new RelatoriosAppBridge(), "RelatoriosAppBridge");
        }
    }

    public class RelatoriosAppBridge {
        @JavascriptInterface
        public void openInternalUrl(String rawUrl) {
            final String safeUrl = sanitizeUrl(rawUrl);
            if (safeUrl == null) return;

            runOnUiThread(() -> {
                Intent intent = new Intent(MainActivity.this, InternalBrowserActivity.class);
                intent.putExtra(InternalBrowserActivity.EXTRA_URL, safeUrl);
                startActivity(intent);
            });
        }
    }

    private String sanitizeUrl(String rawUrl) {
        if (TextUtils.isEmpty(rawUrl)) return null;

        Uri uri = Uri.parse(rawUrl.trim());
        String scheme = uri.getScheme();
        if (scheme == null) return null;

        String normalizedScheme = scheme.toLowerCase();
        if (!"http".equals(normalizedScheme) && !"https".equals(normalizedScheme)) {
            return null;
        }

        return uri.toString();
    }
}
