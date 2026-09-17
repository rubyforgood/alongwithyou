require "test_helper"

# Every path under /api must answer in JSON, including the namespace root
# itself: a client that hits the bare prefix should get the same body it can
# parse for any other typo, not the HTML 404 page.
class ApiUnmatchedRouteTest < ActionDispatch::IntegrationTest
  [ "/api", "/api/", "/api/v1", "/api/nope" ].each do |path|
    test "GET #{path} returns a json 404" do
      get path, as: :json

      assert_response :not_found
      assert_equal "application/json", response.media_type
      assert_equal "not_found", response.parsed_body["error"]
      assert_equal "No route matches GET #{path.delete_suffix("/")}", response.parsed_body["message"]
    end
  end

  test "POST /api returns a json 404" do
    post "/api", as: :json

    assert_response :not_found
    assert_equal "application/json", response.media_type
    assert_equal "not_found", response.parsed_body["error"]
  end
end
