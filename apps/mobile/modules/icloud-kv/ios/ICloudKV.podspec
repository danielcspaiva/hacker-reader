Pod::Spec.new do |s|
  s.name           = 'ICloudKV'
  s.version        = '1.0.0'
  s.summary        = 'NSUbiquitousKeyValueStore for Hacker Reader'
  s.description    = 'Thin Expo module around iCloud key-value storage.'
  s.license        = 'MIT'
  s.author         = 'Hacker Reader'
  s.homepage       = 'https://github.com/danielcspaiva/hacker-reader'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
