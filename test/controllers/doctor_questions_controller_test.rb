require "test_helper"

class DoctorQuestionsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @doctor_question = doctor_questions(:diagnosis)
  end

  test "should get index" do
    get doctor_questions_url
    assert_response :success
  end

  test "should get new" do
    get new_doctor_question_url
    assert_response :success
  end

  test "should create doctor_question" do
    assert_difference("DoctorQuestion.count") do
      post doctor_questions_url, params: { doctor_question: { doctor_question_type_id: @doctor_question.doctor_question_type_id, question: @doctor_question.question } }
    end

    assert_redirected_to doctor_question_url(DoctorQuestion.last)
  end

  test "should show doctor_question" do
    get doctor_question_url(@doctor_question)
    assert_response :success
  end

  test "should get edit" do
    get edit_doctor_question_url(@doctor_question)
    assert_response :success
  end

  test "should update doctor_question" do
    patch doctor_question_url(@doctor_question), params: { doctor_question: { doctor_question_type_id: @doctor_question.doctor_question_type_id, question: @doctor_question.question } }
    assert_redirected_to doctor_question_url(@doctor_question)
  end

  test "should destroy doctor_question" do
    assert_difference("DoctorQuestion.count", -1) do
      delete doctor_question_url(@doctor_question)
    end

    assert_redirected_to doctor_questions_url
  end
end
