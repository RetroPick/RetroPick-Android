package com.retropick.core.network;

import com.retropick.app.BuildConfig;
import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;
import java.util.Locale;
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
        if (production && isForbiddenProductionHost(uri.getHost())) throw new IllegalArgumentException(label + " cannot use a loopback, wildcard, or localhost host in production");
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }

    private static boolean isForbiddenProductionHost(String hostname) {
        if (hostname == null) return true;
        String host = hostname.toLowerCase(Locale.ROOT);
        if (host.startsWith("[") && host.endsWith("]")) host = host.substring(1, host.length() - 1);
        if (host.endsWith(".")) host = host.substring(0, host.length() - 1);
        if (host.equals("*") || host.equals("localhost") || host.endsWith(".localhost")) return true;

        long ipv4 = parseIpv4(host);
        if (ipv4 >= 0) return ipv4 == 0 || (ipv4 >>> 24) == 127;
        if (!host.contains(":")) return false;
        try {
            InetAddress address = InetAddress.getByName(host);
            byte[] bytes = address.getAddress();
            if (address.isLoopbackAddress() || address.isAnyLocalAddress()) return true;
            if (bytes.length == 4) {
                int firstOctet = bytes[0] & 0xff;
                return firstOctet == 0 || firstOctet == 127;
            }
            return false;
        } catch (UnknownHostException error) {
            return true;
        }
    }

    private static long parseIpv4(String host) {
        String[] octets = host.split("\\.", -1);
        if (octets.length != 4) return -1;
        long value = 0;
        try {
            for (String octet : octets) {
                if (octet.isEmpty()) return -1;
                int parsed = Integer.parseInt(octet);
                if (parsed < 0 || parsed > 255) return -1;
                value = (value << 8) | parsed;
            }
            return value;
        } catch (NumberFormatException error) {
            return -1;
        }
    }

    private static String blankToNull(String value) { return value == null || value.isBlank() ? null : value; }
}
