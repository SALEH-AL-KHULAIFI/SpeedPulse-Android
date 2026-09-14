const fs = require('fs');
const path = require('path');
const {
  withAndroidManifest,
  withDangerousMod,
  withMainApplication,
} = require('@expo/config-plugins');

const packageName = 'com.speedpulse.indicator';
const javaPackage = 'com.speedpulse';
const javaPath = 'android/app/src/main/java/com/speedpulse';

const moduleJava = `package ${javaPackage};

import android.content.Context;
import android.content.Intent;
import android.net.TrafficStats;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;

public class SpeedOverlayModule extends ReactContextBaseJavaModule {
  private long lastRx = -1;
  private long lastTx = -1;
  private long lastAt = -1;

  SpeedOverlayModule(ReactApplicationContext context) { super(context); }

  @Override public String getName() { return "SpeedOverlay"; }

  @ReactMethod public void isOverlayPermissionGranted(Promise promise) {
    promise.resolve(Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(getReactApplicationContext()));
  }

  @ReactMethod public void openOverlaySettings(Promise promise) {
    try {
      Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:" + getReactApplicationContext().getPackageName()));
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getReactApplicationContext().startActivity(intent);
      promise.resolve(null);
    } catch (Exception e) { promise.reject("SETTINGS_ERROR", e); }
  }

  @ReactMethod public void startOverlay(Promise promise) {
    try {
      Intent intent = new Intent(getReactApplicationContext(), SpeedOverlayService.class);
      if (Build.VERSION.SDK_INT >= 26) getReactApplicationContext().startForegroundService(intent);
      else getReactApplicationContext().startService(intent);
      promise.resolve(null);
    } catch (Exception e) { promise.reject("OVERLAY_START_ERROR", e); }
  }

  @ReactMethod public void stopOverlay(Promise promise) {
    getReactApplicationContext().stopService(new Intent(getReactApplicationContext(), SpeedOverlayService.class));
    promise.resolve(null);
  }

  @ReactMethod public void getCurrentSpeed(Promise promise) {
    long now = System.currentTimeMillis();
    long rx = TrafficStats.getTotalRxBytes();
    long tx = TrafficStats.getTotalTxBytes();
    double down = 0;
    double up = 0;
    if (lastAt > 0 && now > lastAt) {
      double seconds = (now - lastAt) / 1000d;
      down = Math.max(0, ((rx - lastRx) / seconds) / 1024d);
      up = Math.max(0, ((tx - lastTx) / seconds) / 1024d);
    }
    lastRx = rx; lastTx = tx; lastAt = now;
    WritableMap map = Arguments.createMap();
    map.putDouble("downKbps", down);
    map.putDouble("upKbps", up);
    map.putDouble("totalBytes", Math.max(0, rx + tx));
    promise.resolve(map);
  }
}
`;

const packageJava = `package ${javaPackage};

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class SpeedOverlayPackage implements ReactPackage {
  @Override public List<NativeModule> createNativeModules(ReactApplicationContext context) {
    List<NativeModule> modules = new ArrayList<>();
    modules.add(new SpeedOverlayModule(context));
    return modules;
  }
  @Override public List<ViewManager> createViewManagers(ReactApplicationContext context) {
    return Collections.emptyList();
  }
}
`;

const serviceJava = `package ${javaPackage};

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.net.TrafficStats;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.annotation.Nullable;

public class SpeedOverlayService extends Service {
  private WindowManager windowManager;
  private LinearLayout bubble;
  private TextView reading;
  private Handler handler;
  private long lastRx = -1;
  private long lastTx = -1;
  private long lastAt = -1;

  private final Runnable ticker = new Runnable() {
    @Override public void run() {
      updateReading();
      if (handler != null) handler.postDelayed(this, 1000);
    }
  };

  @Override public void onCreate() {
    super.onCreate();
    createChannel();
    Notification notification = new Notification.Builder(this, "speedpulse")
      .setContentTitle("SpeedPulse")
      .setContentText("Internet speed indicator is active")
      .setSmallIcon(android.R.drawable.stat_sys_download_done)
      .setOngoing(true).build();
    startForeground(7001, notification);
    if (Build.VERSION.SDK_INT >= 23 && !android.provider.Settings.canDrawOverlays(this)) { stopSelf(); return; }
    windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
    bubble = new LinearLayout(this);
    bubble.setGravity(Gravity.CENTER);
    bubble.setPadding(12, 3, 12, 3);
    GradientDrawable background = new GradientDrawable();
    background.setColor(Color.rgb(7, 17, 31));
    background.setCornerRadius(22);
    bubble.setBackground(background);
    reading = new TextView(this);
    reading.setTextColor(Color.WHITE);
    reading.setTextSize(11);
    reading.setTypeface(null, 1);
    bubble.addView(reading);
    int type = Build.VERSION.SDK_INT >= 26 ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY : WindowManager.LayoutParams.TYPE_PHONE;
    WindowManager.LayoutParams params = new WindowManager.LayoutParams(
      WindowManager.LayoutParams.WRAP_CONTENT, 34, type,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE,
      PixelFormat.TRANSLUCENT);
    params.gravity = Gravity.TOP | Gravity.RIGHT;
    params.y = 5;
    params.x = 8;
    windowManager.addView(bubble, params);
    handler = new Handler();
    handler.post(ticker);
  }

  private void updateReading() {
    long now = System.currentTimeMillis();
    long rx = TrafficStats.getTotalRxBytes();
    long tx = TrafficStats.getTotalTxBytes();
    double down = 0;
    double up = 0;
    if (lastAt > 0 && now > lastAt) {
      double seconds = (now - lastAt) / 1000d;
      down = Math.max(0, ((rx - lastRx) / seconds) / 1024d);
      up = Math.max(0, ((tx - lastTx) / seconds) / 1024d);
    }
    lastRx = rx; lastTx = tx; lastAt = now;
    if (reading != null) reading.setText(String.format(java.util.Locale.US, "↓ %.1f  ↑ %.1f MB/s", down / 1024, up / 1024));
  }

  private void createChannel() {
    if (Build.VERSION.SDK_INT >= 26) {
      NotificationChannel channel = new NotificationChannel("speedpulse", "SpeedPulse", NotificationManager.IMPORTANCE_LOW);
      ((NotificationManager) getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(channel);
    }
  }
  @Override public int onStartCommand(Intent intent, int flags, int startId) { return START_STICKY; }
  @Override public void onDestroy() {
    if (handler != null) handler.removeCallbacksAndMessages(null);
    if (bubble != null && windowManager != null) windowManager.removeView(bubble);
    super.onDestroy();
  }
  @Nullable @Override public IBinder onBind(Intent intent) { return null; }
}
`;

module.exports = function withSpeedOverlay(config) {
  config = withAndroidManifest(config, (mod) => {
    const permissions = mod.modResults.manifest['uses-permission'] || [];
    const required = [
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.ACCESS_NETWORK_STATE',
    ];
    required.forEach((name) => {
      if (!permissions.some((permission) => permission.$?.['android:name'] === name)) {
        permissions.push({ $: { 'android:name': name } });
      }
    });
    mod.modResults.manifest['uses-permission'] = permissions;
    mod.modResults.manifest.application[0].service = mod.modResults.manifest.application[0].service || [];
    mod.modResults.manifest.application[0].service.push({
      $: {
        'android:name': 'com.speedpulse.SpeedOverlayService',
        'android:exported': 'false',
        'android:foregroundServiceType': 'dataSync',
      },
    });
    return mod;
  });

  config = withMainApplication(config, (mod) => {
    const marker = 'new com.speedpulse.SpeedOverlayPackage()';
    if (!mod.modResults.contents.includes(marker)) {
      const target = 'List<ReactPackage> packages = new PackageList(this).getPackages();';
      mod.modResults.contents = mod.modResults.contents.replace(
        target,
        `${target}\n    packages.add(${marker});`,
      );
    }
    return mod;
  });

  return withDangerousMod(config, ['android', async (mod) => {
    const root = mod.modRequest.platformProjectRoot;
    const directory = path.join(root, 'app', 'src', 'main', 'java', 'com', 'speedpulse');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'SpeedOverlayModule.java'), moduleJava);
    fs.writeFileSync(path.join(directory, 'SpeedOverlayPackage.java'), packageJava);
    fs.writeFileSync(path.join(directory, 'SpeedOverlayService.java'), serviceJava);
    return mod;
  }]);
};