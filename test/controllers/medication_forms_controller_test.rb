require "test_helper"

class MedicationFormsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @medication_form = medication_forms(:one)
  end

  test "should get index" do
    get medication_forms_url
    assert_response :success
  end

  test "should get new" do
    get new_medication_form_url
    assert_response :success
  end

  test "should create medication_form" do
    assert_difference("MedicationForm.count") do
      post medication_forms_url, params: { medication_form: { name: @medication_form.name } }
    end

    assert_redirected_to medication_form_url(MedicationForm.last)
  end

  test "should show medication_form" do
    get medication_form_url(@medication_form)
    assert_response :success
  end

  test "should get edit" do
    get edit_medication_form_url(@medication_form)
    assert_response :success
  end

  test "should update medication_form" do
    patch medication_form_url(@medication_form), params: { medication_form: { name: @medication_form.name } }
    assert_redirected_to medication_form_url(@medication_form)
  end

  test "should destroy medication_form" do
    assert_difference("MedicationForm.count", -1) do
      delete medication_form_url(@medication_form)
    end

    assert_redirected_to medication_forms_url
  end
end
