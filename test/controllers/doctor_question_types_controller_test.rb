require "test_helper"

class DoctorQuestionTypesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @doctor_question_type = doctor_question_types(:health_concern)
  end

  test "should get index" do
    get doctor_question_types_url
    assert_response :success
  end

  test "should get new" do
    get new_doctor_question_type_url
    assert_response :success
  end

  test "should create doctor_question_type" do
    assert_difference("DoctorQuestionType.count") do
      post doctor_question_types_url, params: { doctor_question_type: { name: "Medication" } }
    end

    assert_redirected_to doctor_question_type_url(DoctorQuestionType.last)
  end

  test "should show doctor_question_type" do
    get doctor_question_type_url(@doctor_question_type)
    assert_response :success
  end

  test "should get edit" do
    get edit_doctor_question_type_url(@doctor_question_type)
    assert_response :success
  end

  test "should update doctor_question_type" do
    patch doctor_question_type_url(@doctor_question_type), params: { doctor_question_type: { name: @doctor_question_type.name } }
    assert_redirected_to doctor_question_type_url(@doctor_question_type)
  end

  test "should destroy doctor_question_type" do
    assert_difference("DoctorQuestionType.count", -1) do
      delete doctor_question_type_url(doctor_question_types(:unused))
    end

    assert_redirected_to doctor_question_types_url
  end
end
