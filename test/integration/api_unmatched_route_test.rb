require "test_helper"

# Every path under /api must answer in JSON, including the namespace root
# itself and a format the API does not speak: a client that hits the bare
# prefix or asks for .xml should get the same body it can parse for any other
# typo, not the HTML 404 page or a JSON body pretending to be XML.
class ApiUnmatchedRouteTest < ActionDispatch::IntegrationTest
  [ "/api", "/api/", "/api/v1", "/api/nope" ].each do |path|
    test "GET #{path} returns a json 404" do
      get path, as: :json

      assert_json_not_found "GET", path
    end
  end

  test "POST /api returns a json 404" do
    post "/api", as: :json

    assert_json_not_found "POST", "/api"
  end

  test "GET /api/v1/tasks.xml returns a json 404" do
    get "/api/v1/tasks.xml"

    assert_json_not_found "GET", "/api/v1/tasks.xml"
  end

  test "GET /api/v1/tasks/:id.xml returns a json 404 for an existing task" do
    path = "/api/v1/tasks/#{tasks(:pending_task).id}.xml"
    get path

    assert_json_not_found "GET", path
  end

  test "POST /api/v1/tasks.xml does not create a task" do
    assert_no_difference "Task.count" do
      post "/api/v1/tasks.xml", params: { task: { title: "Ship it" } }, as: :json
    end

    assert_json_not_found "POST", "/api/v1/tasks.xml"
  end

  test "GET /api/v1/tasks.json still answers" do
    get "/api/v1/tasks.json"

    assert_response :success
    assert_equal "application/json", response.media_type
  end

  test "the catch-all is not an action on every API controller" do
    assert_not_includes Api::V1::TasksController.action_methods, "unmatched_route"
    assert_includes Api::ErrorsController.action_methods, "unmatched_route"
  end

  private
    def assert_json_not_found(method, path)
      assert_response :not_found
      assert_equal "application/json", response.media_type
      assert_equal "not_found", response.parsed_body["error"]
      # Rails drops a trailing slash from request.path before it reaches the
      # controller, so /api/ reports itself as /api.
      assert_equal "No route matches #{method} #{path.delete_suffix("/")}", response.parsed_body["message"]
    end
end
