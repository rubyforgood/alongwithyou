module Api
  # Base class for every JSON endpoint.
  #
  # Inherits from ActionController::API rather than ApplicationController: the
  # Expo client has no cookies, no CSRF token and no browser, so the view/flash/
  # CSRF layers that ApplicationController pulls in are dead weight here. It
  # also means `allow_browser` does not run, which would otherwise reject
  # requests coming from a phone.
  class BaseController < ActionController::API
    rescue_from ActiveRecord::RecordNotFound, with: :not_found
    rescue_from ActionController::ParameterMissing, with: :bad_request
    # A phone on a flaky connection can truncate a request body. Without this,
    # Rails answers unparseable JSON with an HTML error page, which the client
    # cannot read.
    rescue_from ActionDispatch::Http::Parameters::ParseError, with: :malformed_json

    # Anything under /api that does not match a route: a typo, or a client built
    # against a newer version of this API. Still answered in JSON.
    def unmatched_route
      render json: {
        error: "not_found",
        message: "No route matches #{request.request_method} #{request.path}"
      }, status: :not_found
    end

    private
      def not_found(error)
        render json: { error: "not_found", message: error.message }, status: :not_found
      end

      def bad_request(error)
        render json: { error: "bad_request", message: error.message }, status: :bad_request
      end

      def malformed_json(_error)
        render json: { error: "bad_request", message: "Request body is not valid JSON." }, status: :bad_request
      end

      # Shape validation failures so the client can show a banner *and* mark up
      # individual fields:
      #   {
      #     "error": "unprocessable_entity",
      #     "message": "Title can't be blank",
      #     "errors": { "title": ["can't be blank"] }
      #   }
      def unprocessable(record)
        render json: {
          error: "unprocessable_entity",
          message: record.errors.full_messages.to_sentence,
          errors: record.errors.to_hash
        }, status: :unprocessable_entity
      end
  end
end
