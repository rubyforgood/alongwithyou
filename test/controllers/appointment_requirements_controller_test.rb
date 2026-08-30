require "test_helper"

class AppointmentRequirementsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @appointment_requirement = appointment_requirements(:one)
  end

  test "should get index" do
    get appointment_requirements_url
    assert_response :success
  end

  test "should get new" do
    get new_appointment_requirement_url
    assert_response :success
  end

  test "should create appointment_requirement" do
    assert_difference("AppointmentRequirement.count") do
      post appointment_requirements_url, params: { appointment_requirement: { name: @appointment_requirement.name } }
    end

    assert_redirected_to appointment_requirement_url(AppointmentRequirement.last)
  end

  test "should show appointment_requirement" do
    get appointment_requirement_url(@appointment_requirement)
    assert_response :success
  end

  test "should get edit" do
    get edit_appointment_requirement_url(@appointment_requirement)
    assert_response :success
  end

  test "should update appointment_requirement" do
    patch appointment_requirement_url(@appointment_requirement), params: { appointment_requirement: { name: @appointment_requirement.name } }
    assert_redirected_to appointment_requirement_url(@appointment_requirement)
  end

  test "should destroy appointment_requirement" do
    assert_difference("AppointmentRequirement.count", -1) do
      delete appointment_requirement_url(@appointment_requirement)
    end

    assert_redirected_to appointment_requirements_url
  end
end
