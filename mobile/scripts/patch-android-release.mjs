/**
 * Wires the Play Store upload keystore into the generated android/ project
 * after `expo prebuild`, and syncs versionCode/versionName from app.json.
 * Signing credentials live in credentials/keystore.properties (gitignored);
 * when that file is missing the release build falls back to the debug key
 * so local builds keep working without secrets.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const mobileDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const gradlePath = path.join(mobileDir, 'android', 'app', 'build.gradle')
if (!fs.existsSync(gradlePath)) {
  console.error('android/app/build.gradle not found — run `npx expo prebuild --platform android` first')
  process.exit(1)
}
let gradle = fs.readFileSync(gradlePath, 'utf8')

// 1. Version sync from app.json
const appJson = JSON.parse(fs.readFileSync(path.join(mobileDir, 'app.json'), 'utf8'))
const versionName = appJson.expo.version
const versionCode = appJson.expo.android?.versionCode ?? 1
gradle = gradle
  .replace(/^(\s*)versionCode .*$/m, `$1versionCode ${versionCode}`)
  .replace(/^(\s*)versionName .*$/m, `$1versionName "${versionName}"`)

// 2. Release signing from credentials/keystore.properties
if (!gradle.includes('keystorePropertiesFile')) {
  gradle = gradle.replace(
    '\nandroid {',
    `\ndef keystorePropertiesFile = rootProject.file('../credentials/keystore.properties')
def keystoreProperties = new java.util.Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new java.io.FileInputStream(keystorePropertiesFile))
}

android {`,
  )
  gradle = gradle.replace(
    `            keyPassword 'android'
        }
    }`,
    `            keyPassword 'android'
        }
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }`,
  )
  gradle = gradle.replace(
    `            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`,
    `            signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug`,
  )
  if (
    !gradle.includes('signingConfigs.release') ||
    !gradle.includes('keystorePropertiesFile.exists() ? signingConfigs.release')
  ) {
    console.error('could not patch signing config — build.gradle template changed?')
    process.exit(1)
  }
}

fs.writeFileSync(gradlePath, gradle)
console.log(`patched app/build.gradle (v${versionName} #${versionCode}, release signing)`)
