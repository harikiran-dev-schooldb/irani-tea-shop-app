# Load this file from the android directory with:
#   source .zshrc

irani-tea-install-apk() {
  local adb="$1"
  local package="$2"
  local apk="$3"

  if [[ ! -x "$adb" ]]; then
    echo "❌ adb was not found or is not executable: $adb"
    return 1
  fi

  if [[ ! -f "$apk" ]]; then
    echo "❌ APK was not found: $apk"
    return 1
  fi

  local install_output
  install_output="$("$adb" install -r "$apk" 2>&1)"
  local install_status=$?
  echo "$install_output"

  if (( install_status != 0 )); then
    if [[ "$install_output" == *"INSTALL_FAILED_UPDATE_INCOMPATIBLE"* ]]; then
      echo "❌ Installed $package has a different signature. Retry with: irani-tea-release --fresh"
    elif [[ "$install_output" == *"INSTALL_FAILED_VERSION_DOWNGRADE"* ]]; then
      echo "❌ The device has a newer version of $package. Retry with: irani-tea-release --fresh"
    elif [[ "$install_output" == *"no devices/emulators found"* ]]; then
      echo "❌ No Android device or emulator is connected."
    elif [[ "$install_output" == *"device unauthorized"* ]]; then
      echo "❌ The Android device is unauthorized. Approve USB debugging on the device and retry."
    fi

    return "$install_status"
  fi
}

irani-tea-release() {
  local project="/Users/harikiran/Documents/GitHub/irani-tea-shop-app"
  local adb="/Users/harikiran/Library/Android/sdk/platform-tools/adb"
  local app_dir="$project/android"
  local package="com.iraniteashop.mobile"
  local counter_file="$app_dir/.version-code"
  local fresh_install="${1:-}"

  if [[ -n "$fresh_install" && "$fresh_install" != "--fresh" ]]; then
    echo "Usage: irani-tea-release [--fresh]"
    return 2
  fi

  # The Gradle project's current versionCode is 5, so automatic releases start at 6.
  if [[ ! -f "$counter_file" ]]; then
    echo "6" > "$counter_file"
  fi

  local version_code
  version_code="$(cat "$counter_file")"

  case "$version_code" in
    (''|*[!0-9]*)
      echo "❌ Invalid version code in $counter_file: $version_code"
      return 1
      ;;
  esac

  if [[ ! -x "$adb" ]]; then
    echo "❌ adb was not found or is not executable: $adb"
    return 1
  fi

  if [[ ! -x "$app_dir/gradlew" ]]; then
    echo "❌ Gradle wrapper was not found or is not executable: $app_dir/gradlew"
    return 1
  fi

  if [[ ! -f "$app_dir/keystore.properties" ]]; then
    echo "❌ Release signing configuration was not found: $app_dir/keystore.properties"
    return 1
  fi

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "▶ Irani Tea Shop Release"
  echo "▶ versionCode: $version_code"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  (
    cd "$app_dir" || return 1

    echo "▶ Building APK + AAB..."

    ./gradlew clean assembleRelease bundleRelease \
      -PVERSION_CODE="$version_code" \
      -PIRANI_TEA_API_BASE_URL=https://tea.schooldb.co.in/ \
      || return 1
  ) || return 1

  local apk="$app_dir/app/build/outputs/apk/release/app-release.apk"
  local aab="$app_dir/app/build/outputs/bundle/release/app-release.aab"

  if [[ "$fresh_install" == "--fresh" ]]; then
    echo "▶ Removing existing Irani Tea Shop app..."
    "$adb" uninstall "$package" >/dev/null 2>&1 || true
  fi

  echo "▶ Installing Irani Tea Shop..."
  irani-tea-install-apk \
    "$adb" \
    "$package" \
    "$apk" || return 1

  echo "▶ Launching Irani Tea Shop..."
  "$adb" shell am force-stop "$package"

  "$adb" shell am start \
    -W \
    -n "$package/.MainActivity" \
    || return 1

  # Increment only after a successful build, install, and launch.
  echo $((version_code + 1)) > "$counter_file"

  echo ""
  echo "✅ Irani Tea Shop released successfully"
  echo "✅ Built versionCode: $version_code"
  echo "✅ Next versionCode: $((version_code + 1))"
  echo "✅ APK: $apk"
  echo "✅ AAB: $aab"
}
