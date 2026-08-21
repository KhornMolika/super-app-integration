Pod::Spec.new do |s|
  s.name             = 'SpaBookingSDK'
  s.version          = '1.0.0'
  s.summary          = 'Sample third-party spa booking SDK.'
  s.description      = 'Binary vendor SDK used to exercise native SDK embedding.'
  s.homepage         = 'https://example.com/spa-booking-sdk'
  s.license          = { :type => 'Proprietary', :text => 'Sample vendor SDK.' }
  s.author           = { 'Spa Vendor' => 'sdk@example.com' }
  s.source           = { :http => 'https://example.com/SpaBookingSDK-1.0.0.zip' }
  s.platform         = :ios, '13.0'
  s.vendored_frameworks = 'SpaBookingSDK.xcframework'
end
