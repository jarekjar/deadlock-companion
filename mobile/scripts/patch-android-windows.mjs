/**
 * Applies the Windows-specific Android build fixes after `expo prebuild`.
 * The android/ folder is generated (not committed), so these patches must be
 * re-applied whenever it is regenerated:
 *
 * 1. Build only arm64-v8a + x86_64 (32-bit ABIs are legacy and double build time).
 * 2. Stage CMake builds under C:\b\cxx — object paths from the repo's deep
 *    .cxx dirs exceed CMake's 250-char Windows limit and trip ninja's
 *    "manifest still dirty" regeneration loop.
 * 3. Pin CMake 3.31.6 from the SDK (3.22.1 has the ninja regen bug).
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const androidDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'android')
if (!fs.existsSync(androidDir)) {
  console.error('android/ not found — run `npx expo prebuild --platform android` first')
  process.exit(1)
}

// 1. ABIs
const propsPath = path.join(androidDir, 'gradle.properties')
let props = fs.readFileSync(propsPath, 'utf8')
props = props.replace(
  /^reactNativeArchitectures=.*$/m,
  'reactNativeArchitectures=arm64-v8a,x86_64',
)
fs.writeFileSync(propsPath, props)
console.log('patched gradle.properties (ABIs)')

// 2. Short CMake staging dirs
const buildGradlePath = path.join(androidDir, 'build.gradle')
let buildGradle = fs.readFileSync(buildGradlePath, 'utf8')
if (!buildGradle.includes('buildStagingDirectory')) {
  const anchor = "maven { url 'https://www.jitpack.io' }\n  }\n}"
  const staging = `maven { url 'https://www.jitpack.io' }
  }

  // Windows: object-file paths from the repo's deep .cxx dirs exceed CMake's
  // 250-char limit and trip ninja's regeneration loop. Stage native builds
  // under a short path instead.
  afterEvaluate { project ->
    if (project.hasProperty('android')) {
      project.android.externalNativeBuild.cmake.buildStagingDirectory =
        new File("C:/b/cxx/\${project.name}")
    }
  }
}`
  buildGradle = buildGradle.replace(anchor, staging)
  if (!buildGradle.includes('buildStagingDirectory')) {
    console.error('could not find the allprojects repositories block to patch')
    process.exit(1)
  }
  fs.writeFileSync(buildGradlePath, buildGradle)
  console.log('patched build.gradle (CMake staging dirs)')
} else {
  console.log('build.gradle already patched')
}

// 3. SDK + CMake pins
const sdkDir = process.env.ANDROID_HOME ?? 'C:\\Users\\Jared\\AppData\\Local\\Android\\Sdk'
const escaped = sdkDir.replace(/\\/g, '\\\\').replace(/:/g, '\\:')
const cmake = fs
  .readdirSync(path.join(sdkDir, 'cmake'))
  .filter((v) => v.startsWith('3.3'))
  .sort()
  .pop()
const lines = [`sdk.dir=${escaped}`]
if (cmake) lines.push(`cmake.dir=${escaped}\\\\cmake\\\\${cmake}`)
fs.writeFileSync(path.join(androidDir, 'local.properties'), lines.join('\n') + '\n')
console.log(`wrote local.properties (cmake ${cmake ?? 'default'})`)
