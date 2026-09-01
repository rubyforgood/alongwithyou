require "test_helper"

class DoctorQuestionsIndexTest < ActionDispatch::IntegrationTest
  test "index lists questions in a table under one heading" do
    get doctor_questions_url

    assert_response :success
    assert_select "h1", "Questions to be asked"
    assert_select "table tbody tr", count: DoctorQuestion.count
    assert_select "td", text: "Health Concern"
  end

  test "index sorts by type name by default" do
    get doctor_questions_url

    types = css_select("tbody tr td:first-child").map(&:text)
    assert_equal types.sort, types
  end

  test "sort links reverse the order" do
    get doctor_questions_url(sort: "type", direction: "desc")

    types = css_select("tbody tr td:first-child").map(&:text)
    assert_equal types.sort.reverse, types
  end

  # The sort parameter reaches Arel.sql, so it must never reach it as SQL: an
  # unknown column has to fall back to the default rather than be interpolated.
  test "an unknown sort column falls back to the default" do
    get doctor_questions_url(sort: "question; drop table doctor_questions", direction: "asc")

    assert_response :success
    types = css_select("tbody tr td:first-child").map(&:text)
    assert_equal types.sort, types
  end

  test "sorts by the question column" do
    get doctor_questions_url(sort: "question", direction: "asc")

    questions = css_select("tbody tr td:nth-child(2)").map(&:text)
    assert_equal questions.sort, questions

    # The fixtures sort differently by question than by type, so this also
    # proves the question sort is not quietly falling back to the default.
    types = css_select("tbody tr td:first-child").map(&:text)
    assert_not_equal types.sort, types
  end

  test "reverses the question column" do
    get doctor_questions_url(sort: "question", direction: "desc")

    questions = css_select("tbody tr td:nth-child(2)").map(&:text)
    assert_equal questions.sort.reverse, questions
  end
end
