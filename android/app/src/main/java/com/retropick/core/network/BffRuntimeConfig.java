package com.retropick.core.network;

import com.retropick.app.BuildConfig;
import java.net.URI;
import java.util.Set;

public final class BffRuntimeConfig {
    public final String httpUrl;
    public final String webSocketUrl;
    public final boolean demoSimulation;

    private BffRuntimeConfig(String httpUrl, String webSocketUrl, boolean demoSimulation) {
        this.httpUrl = httpUrl;
        this.webSocketUrl = webSocketUrl;
        this.demoSimulation = demoSimulation;
    }

    public boolean isAvailable() { return httpUrl != null && webSocketUrl != null; }

    public static BffRuntimeConfig fromBuildConfig() {
        return resolve(blankToNull(BuildConfig.BFF_HTTP_URL), blankToNull(BuildConfig.BFF_WS_URL), !BuildConfig.DEBUG, BuildConfig.DEMO_SIMULATION);
    }

    public static BffRuntimeConfig resolve(String httpUrl, String webSocketUrl, boolean production, boolean demoSimulation) {
        if (production && demoSimulation) throw new IllegalArgumentException("Demo simulation is forbidden in production");
        return new BffRuntimeConfig(
            validate(httpUrl, production ? Set.of("https") : Set.of("http", "https"), production, "BFF HTTP URL"),
            validate(webSocketUrl, production ? Set.of("wss") : Set.of("ws", "wss"), production, "BFF WebSocket URL"),
            demoSimulation
        );
    }

    private static String validate(String value, Set<String> schemes, boolean production, String label) {
        if (value == null || value.isBlank()) return null;
        final URI uri;
        try { uri = URI.create(value); } catch (IllegalArgumentException error) { throw new IllegalArgumentException(label + " must be an absolute URL", error); }
        if (!uri.isAbsolute() || !schemes.contains(uri.getScheme())) throw new IllegalArgumentException(label + " must use " + String.join(" or ", schemes));
        if (production && Set.of("localhost", "127.0.0.1", "10.0.2.2").contains(uri.getHost())) throw new IllegalArgumentException(label + " cannot use localhost in production");
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value; }
}
