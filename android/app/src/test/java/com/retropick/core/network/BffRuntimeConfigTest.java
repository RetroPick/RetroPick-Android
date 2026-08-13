package com.retropick.core.network;

import static org.junit.Assert.*;
import org.junit.Test;

public class BffRuntimeConfigTest {
    @Test public void missingReleaseConfigIsExplicitlyUnavailable() {
        BffRuntimeConfig config = BffRuntimeConfig.resolve(null, null, true, false);
        assertFalse(config.isAvailable());
        assertNull(config.httpUrl);
        assertNull(config.webSocketUrl);
    }

    @Test public void releaseRequiresSecureBffSchemesAndRejectsLocalhost() {
        assertThrows(IllegalArgumentException.class, () -> BffRuntimeConfig.resolve("http://bff.example/api/v1", "wss://bff.example/ws", true, false));
        assertThrows(IllegalArgumentException.class, () -> BffRuntimeConfig.resolve("https://bff.example/api/v1", "ws://bff.example/ws", true, false));
        assertThrows(IllegalArgumentException.class, () -> BffRuntimeConfig.resolve("https://localhost/api/v1", "wss://localhost/ws", true, false));
    }

    @Test public void releaseRejectsLoopbackWildcardAndLocalhostAliasHosts() {
        String[] forbiddenHosts = {
            "127.0.0.2",
            "127.255.255.255",
            "[::1]",
            "[::ffff:127.0.0.1]",
            "[::ffff:7f00:2]",
            "0.0.0.0",
            "[::]",
            "[::ffff:0.0.0.0]",
            "localhost",
            "localhost.",
            "api.localhost",
            "*"
        };

        for (String host : forbiddenHosts) {
            assertThrows(host, IllegalArgumentException.class, () -> BffRuntimeConfig.resolve(
                "https://" + host + "/api/v1",
                "wss://bff.example/api/v1/markets/realtime",
                true,
                false
            ));
            assertThrows(host, IllegalArgumentException.class, () -> BffRuntimeConfig.resolve(
                "https://bff.example/api/v1",
                "wss://" + host + "/api/v1/markets/realtime",
                true,
                false
            ));
        }
    }

    @Test public void debugAllowsEmulatorBffOnlyWhenExplicitlyConfigured() {
        BffRuntimeConfig config = BffRuntimeConfig.resolve("http://10.0.2.2:8080/api/v1/", "ws://10.0.2.2:8080/api/v1/markets/realtime/", false, false);
        assertTrue(config.isAvailable());
        assertEquals("http://10.0.2.2:8080/api/v1", config.httpUrl);
    }

    @Test public void releaseForbidsSimulation() {
        assertThrows(IllegalArgumentException.class, () -> BffRuntimeConfig.resolve("https://bff.example/api/v1", "wss://bff.example/ws", true, true));
    }
}
