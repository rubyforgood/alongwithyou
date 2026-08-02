# Be sure to restart your server when you modify this file.
#
# Cross-Origin Resource Sharing (CORS) for the Expo client.
#
# Note that CORS is a *browser* mechanism. Native iOS/Android builds are not
# subject to it, so this only really matters for `npx expo start --web`, which
# runs the app as React Native Web in a real browser. It is still worth getting
# right so the web target does not silently break.

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    # In development the Expo web bundler serves from an arbitrary localhost
    # port, so accept anything. In production, list the origins explicitly via
    # CORS_ORIGINS (comma separated), e.g. "https://app.example.com".
    if Rails.env.local?
      origins "*"
    else
      origins ENV.fetch("CORS_ORIGINS", "").split(",").map(&:strip).reject(&:empty?)
    end

    resource "/api/*",
      headers: :any,
      methods: [ :get, :post, :patch, :put, :delete, :options, :head ],
      expose: [ "Authorization" ],
      max_age: 600
  end
end
