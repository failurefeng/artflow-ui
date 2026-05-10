package com.artflow.ui;

import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "MainActivity";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // 注册自定义插件
        registerPlugin(ScreenOrientationPlugin.class);
    }
    
    @CapacitorPlugin(name = "ScreenOrientation")
    public static class ScreenOrientationPlugin extends Plugin {
        @PluginMethod
        public void lock(PluginCall call) {
            String orientation = call.getString("orientation", "auto");
            Log.d(TAG, "Locking screen orientation: " + orientation);
            
            final MainActivity activity = (MainActivity) getActivity();
            if (activity == null) {
                call.reject("Activity is null");
                return;
            }
            
            activity.runOnUiThread(() -> {
                try {
                    switch (orientation) {
                        case "portrait":
                            activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
                            break;
                        case "landscape":
                            activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
                            break;
                        case "auto":
                        default:
                            activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                            break;
                    }
                    call.resolve();
                } catch (Exception e) {
                    Log.e(TAG, "Failed to lock screen orientation", e);
                    call.reject("Failed to lock screen orientation: " + e.getMessage());
                }
            });
        }
        
        @PluginMethod
        public void unlock(PluginCall call) {
            Log.d(TAG, "Unlocking screen orientation");
            
            final MainActivity activity = (MainActivity) getActivity();
            if (activity == null) {
                call.reject("Activity is null");
                return;
            }
            
            activity.runOnUiThread(() -> {
                try {
                    activity.setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
                    call.resolve();
                } catch (Exception e) {
                    Log.e(TAG, "Failed to unlock screen orientation", e);
                    call.reject("Failed to unlock screen orientation: " + e.getMessage());
                }
            });
        }
    }
}
