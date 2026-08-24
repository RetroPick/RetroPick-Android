package com.retropick.core.network;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.retropick.app.BuildConfig;

@CapacitorPlugin(name = "RuntimeConfig")
public class RuntimeConfigPlugin extends Plugin {
    @PluginMethod
    public void getConfig(PluginCall call) {
        JSObject result = new JSObject();
        result.put("environment", BuildConfig.DEBUG ? "development" : "production");
        try {
            BffRuntimeConfig config = BffRuntimeConfig.fromBuildConfig();
            result.put("available", config.isAvailable());
            result.put("demoSimulation", config.demoSimulation);
            if (config.isAvailable()) {
                result.put("httpUrl", config.httpUrl);
                result.put("wsUrl", config.webSocketUrl);
            }
        } catch (IllegalArgumentException error) {
            result.put("available", false);
            result.put("demoSimulation", false);
        }
        call.resolve(result);
    }
}
