# Verifying on an Android emulator

> Set up 2026-09-12, after the user asked whether anything could verify mobile work without them
> holding a phone. Everything here runs from a shell, so screens can be opened, tapped and
> photographed without a device.

## What is installed

Homebrew's `android-commandlinetools`, plus the emulator, the platform tools and one system image.
Nothing was installed into `/Applications` and no password was needed.

```
brew install --cask android-commandlinetools
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"
sdkmanager "platform-tools" "emulator" "system-images;android-34;google_apis;arm64-v8a"
avdmanager create avd -n nowry -k "system-images;android-34;google_apis;arm64-v8a" -d pixel_6
```

`google_apis` rather than the plain image, deliberately: it carries Play Services, without which
Google sign-in cannot be exercised at all.

## Running it

```
emulator -avd nowry -no-snapshot-save -no-boot-anim &
adb wait-for-device
adb install -r <the development build .apk>          # from an EAS build's artifact URL
adb reverse tcp:8082 tcp:8082                        # the dev server's port — CHECK IT, see below
adb shell am start -a android.intent.action.VIEW \
  -d "com.nowry.app://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8082"
```

**Check the port rather than assuming 8081.** Docker holds 8081 on this machine, so Expo falls
through to 8082 and answers `Unauthorized` on the port you expected — which reads as a broken dev
server and is not one. `lsof -nP -iTCP -sTCP:LISTEN | grep node` says which port is really Metro.

## Driving it

```
adb exec-out screencap -p > shot.png    # what is on screen
adb shell input tap <x> <y>             # a press, in device pixels
adb shell input text "hello"            # typing
adb shell input keyevent 4              # back
adb logcat -s ReactNativeJS:V           # the app's own console
```

The screenshot is 1080×2400; a screenshot scaled for reading has to be scaled back before its
coordinates mean anything to `input tap`.

## What it cannot do

**It cannot sign in.** Credentials are the account holder's to type, so a session has to be started
by a person once per emulator; after that it persists and every screen behind the gate is reachable.

It is also not a phone: no real network changes, no real keyboard quirks, no real GPU. It catches
crashes, layout, strings, empty states and flow — which is most of what has gone wrong so far — and
it does not replace the device pass before a release.
