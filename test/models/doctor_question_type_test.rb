require "test_helper"

class DoctorQuestionTypeTest < ActiveSupport::TestCase
  # Lowercase on purpose: this is what proves case_sensitive: false is doing
  # something. "Health Concern" alone would pass with or without it.
  test "requires a unique name regardless of case" do
    duplicate = DoctorQuestionType.new(name: "health concern")

    assert_not duplicate.valid?
    assert_includes duplicate.errors[:name], "has already been taken"
  end

  test "refuses to be destroyed while questions still use it" do
    type = doctor_question_types(:health_concern)

    assert_not type.destroy
    assert_includes type.errors[:base], "Cannot delete record because dependent doctor questions exist"
  end

  test "can be destroyed when nothing uses it" do
    assert_difference("DoctorQuestionType.count", -1) do
      doctor_question_types(:unused).destroy
    end
  end
end
