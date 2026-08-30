require "test_helper"

class MedicationTypesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @medication_type = medication_types(:one)
  end

  test "should get index" do
    get medication_types_url
    assert_response :success
  end

  test "should get new" do
    get new_medication_type_url
    assert_response :success
  end

  test "should create medication_type" do
    assert_difference("MedicationType.count") do
      post medication_types_url, params: { medication_type: { name: @medication_type.name } }
    end

    assert_redirected_to medication_type_url(MedicationType.last)
  end

  test "should show medication_type" do
    get medication_type_url(@medication_type)
    assert_response :success
  end

  test "should get edit" do
    get edit_medication_type_url(@medication_type)
    assert_response :success
  end

  test "should update medication_type" do
    patch medication_type_url(@medication_type), params: { medication_type: { name: @medication_type.name } }
    assert_redirected_to medication_type_url(@medication_type)
  end

  test "should destroy medication_type" do
    assert_difference("MedicationType.count", -1) do
      delete medication_type_url(@medication_type)
    end

    assert_redirected_to medication_types_url
  end
end
