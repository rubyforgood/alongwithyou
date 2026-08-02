require "test_helper"

module Api
  module V1
    class TasksControllerTest < ActionDispatch::IntegrationTest
      setup do
        @task = tasks(:pending_task)
      end

      test "index returns every task, newest first" do
        get api_v1_tasks_url, as: :json

        assert_response :success
        body = response.parsed_body
        assert_equal Task.count, body.size
        assert_equal body.map { |task| task["created_at"] }.sort.reverse, body.map { |task| task["created_at"] }
      end

      test "show returns a single task" do
        get api_v1_task_url(@task), as: :json

        assert_response :success
        assert_equal @task.title, response.parsed_body["title"]
      end

      test "show returns a json 404 for an unknown id" do
        get api_v1_task_url(id: 0), as: :json

        assert_response :not_found
        assert_equal "not_found", response.parsed_body["error"]
      end

      test "create persists a task" do
        assert_difference "Task.count", 1 do
          post api_v1_tasks_url, params: { task: { title: "Ship it" } }, as: :json
        end

        assert_response :created
        assert_equal "Ship it", response.parsed_body["title"]
        assert_not response.parsed_body["completed"]
      end

      test "create reports validation errors per field" do
        assert_no_difference "Task.count" do
          post api_v1_tasks_url, params: { task: { title: "" } }, as: :json
        end

        assert_response :unprocessable_entity
        body = response.parsed_body
        assert_equal "unprocessable_entity", body["error"]
        assert_includes body["errors"]["title"], "can't be blank"
      end

      # ActionController::ParamsWrapper nests bare JSON under the model name, so
      # the client may send either { title: ... } or { task: { title: ... } }.
      test "create accepts an unwrapped payload" do
        assert_difference "Task.count", 1 do
          post api_v1_tasks_url, params: { title: "Ship it" }, as: :json
        end

        assert_response :created
        assert_equal "Ship it", response.parsed_body["title"]
      end

      test "create returns a json 400 when no attributes are given" do
        assert_no_difference "Task.count" do
          post api_v1_tasks_url, params: {}, as: :json
        end

        assert_response :bad_request
        assert_equal "bad_request", response.parsed_body["error"]
      end

      test "create ignores attributes that are not permitted" do
        post api_v1_tasks_url, params: { task: { title: "Ship it", id: 12345 } }, as: :json

        assert_response :created
        assert_not_equal 12345, response.parsed_body["id"]
      end

      test "update changes completion" do
        patch api_v1_task_url(@task), params: { task: { completed: true } }, as: :json

        assert_response :success
        assert @task.reload.completed
      end

      test "update reports validation errors" do
        patch api_v1_task_url(@task), params: { task: { title: "" } }, as: :json

        assert_response :unprocessable_entity
        assert_equal "Wire up the Expo client", @task.reload.title
      end

      test "destroy removes the task" do
        assert_difference "Task.count", -1 do
          delete api_v1_task_url(@task), as: :json
        end

        assert_response :no_content
      end
    end
  end
end
