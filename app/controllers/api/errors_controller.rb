module Api
  # Answers the catch-all route under /api. It is the only action that route
  # reaches, and it lives here rather than on BaseController so that it is not
  # inherited as a public action by every API controller.
  class ErrorsController < Api::BaseController
    # Anything under /api that does not match a route: a typo, a format the
    # API does not speak, or a client built against a newer version of this
    # API. Still answered in JSON.
    def unmatched_route
      render json: {
        error: "not_found",
        message: "No route matches #{request.request_method} #{request.path}"
      }, status: :not_found
    end
  end
end
