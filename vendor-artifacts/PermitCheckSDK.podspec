Pod::Spec.new do |s|
  s.name             = 'PermitCheckSDK'
  s.version          = '1.0.0'
  s.summary          = 'Sample third-party permit-check SDK.'
  s.description      = 'Binary vendor SDK used to exercise Native SDK codegen.'
  s.homepage         = 'https://example.com/permit-check-sdk'
  s.license          = { :type => 'Proprietary', :text => 'Sample vendor SDK.' }
  s.author           = { 'Permit Vendor' => 'sdk@example.com' }
  s.source           = { :http => 'https://example.com/PermitCheckSDK-1.0.0.zip' }
  s.platform         = :ios, '13.0'
  s.vendored_frameworks = 'PermitCheckSDK.xcframework'
end
