require "test_helper"

class DoctorQuestionTest < ActiveSupport::TestCase
  test "requires a question" do
    question = DoctorQuestion.new(doctor_question_type: doctor_question_types(:health_concern))

    assert_not question.valid?
    assert_includes question.errors[:question], "can't be blank"
  end

  # belongs_to is required by default, so this passes with no validation of our
  # own - and matches the null: false on the column.
  test "requires a type" do
    question = DoctorQuestion.new(question: "Anything I should watch for?")

    assert_not question.valid?
    assert_includes question.errors[:doctor_question_type], "must exist"
  end

  test "rejects a question longer than 1000 characters" do
    question = DoctorQuestion.new(
      question: "a" * 1001,
      doctor_question_type: doctor_question_types(:health_concern)
    )

    assert_not question.valid?
    assert_includes question.errors[:question], "is too long (maximum is 1000 characters)"
  end

  test "accepts a question of exactly 1000 characters" do
    question = DoctorQuestion.new(
      question: "a" * 1000,
      doctor_question_type: doctor_question_types(:health_concern)
    )

    assert question.valid?
  end
end
