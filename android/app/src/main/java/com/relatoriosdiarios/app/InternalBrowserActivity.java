package com.relatoriosdiarios.app;

import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.text.TextUtils;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

public class InternalBrowserActivity extends AppCompatActivity {

    public static final String EXTRA_URL = "extra_url";

    private static final String COLOR_BG = "#08140d";
    private static final String COLOR_TOP = "#102319";
    private static final String COLOR_ACCENT = "#d8b35b";
    private static final String COLOR_TEXT = "#f4f8f4";

    private WebView webView;
    private TextView titleView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        String initialUrl = sanitizeUrl(getIntent().getStringExtra(EXTRA_URL));
        if (initialUrl == null) {
          finish();
          return;
        }

        setContentView(createLayout());
        configureWebView();
        webView.loadUrl(initialUrl);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }

    private View createLayout() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.parseColor(COLOR_BG));

        LinearLayout topBar = new LinearLayout(this);
        topBar.setOrientation(LinearLayout.HORIZONTAL);
        topBar.setGravity(Gravity.CENTER_VERTICAL);
        topBar.setPadding(dp(14), dp(14), dp(14), dp(14));
        topBar.setBackgroundColor(Color.parseColor(COLOR_TOP));

        TextView backButton = createButton("Voltar");
        backButton.setOnClickListener((v) -> {
            if (webView != null && webView.canGoBack()) {
                webView.goBack();
            } else {
                finish();
            }
        });

        titleView = new TextView(this);
        titleView.setText("Pagina de download");
        titleView.setTextColor(Color.parseColor(COLOR_TEXT));
        titleView.setTextSize(18);
        titleView.setSingleLine(true);
        titleView.setEllipsize(TextUtils.TruncateAt.END);
        titleView.setPadding(dp(14), 0, dp(14), 0);

        LinearLayout.LayoutParams titleParams =
            new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);

        TextView closeButton = createButton("Fechar");
        closeButton.setOnClickListener((v) -> finish());

        webView = new WebView(this);
        LinearLayout.LayoutParams webViewParams =
            new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0,
                1f
            );

        topBar.addView(backButton);
        topBar.addView(titleView, titleParams);
        topBar.addView(closeButton);

        root.addView(topBar);
        root.addView(webView, webViewParams);
        return root;
    }

    private TextView createButton(String label) {
        TextView button = new TextView(this);
        button.setText(label);
        button.setTextColor(Color.parseColor(COLOR_ACCENT));
        button.setTextSize(14);
        button.setGravity(Gravity.CENTER);
        button.setPadding(dp(14), dp(10), dp(14), dp(10));
        button.setBackgroundColor(Color.TRANSPARENT);
        button.setClickable(true);
        button.setFocusable(true);
        return button;
    }

    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onReceivedTitle(WebView view, String title) {
                if (titleView == null) return;
                titleView.setText(
                    !TextUtils.isEmpty(title) ? title : "Pagina de download"
                );
            }
        });

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return handleUri(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return handleUri(Uri.parse(url));
            }
        });

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(
                String url,
                String userAgent,
                String contentDisposition,
                String mimeType,
                long contentLength
            ) {
                enqueueDownload(url, userAgent, contentDisposition, mimeType);
            }
        });
    }

    private boolean handleUri(Uri uri) {
        String safeUrl = sanitizeUrl(uri != null ? uri.toString() : null);
        if (safeUrl == null) {
            openExternally(uri);
            return true;
        }

        webView.loadUrl(safeUrl);
        return true;
    }

    private void enqueueDownload(
        String url,
        String userAgent,
        String contentDisposition,
        String mimeType
    ) {
        try {
            String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
            DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
            request.setTitle(fileName);
            request.setDescription("Baixando nova versao do aplicativo");
            request.setNotificationVisibility(
                DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
            );
            request.setMimeType(mimeType);
            request.addRequestHeader("User-Agent", userAgent);
            request.setDestinationInExternalPublicDir(
                Environment.DIRECTORY_DOWNLOADS,
                fileName
            );

            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            if (manager != null) {
                manager.enqueue(request);
                Toast.makeText(
                    this,
                    "Download iniciado. Verifique a notificacao do Android.",
                    Toast.LENGTH_LONG
                ).show();
                return;
            }
        } catch (Exception ignored) {}

        openExternally(Uri.parse(url));
    }

    private void openExternally(Uri uri) {
        if (uri == null) return;
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);
        } catch (ActivityNotFoundException ignored) {}
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

    private int dp(int value) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(value * density);
    }
}
