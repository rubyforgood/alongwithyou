require "test_helper"

class DoctorQuestionsHelperTest < ActionView::TestCase
  test "a column that is not the current sort links to it ascending, with no arrow" do
    link = doctor_question_sort_link("type", "Type")

    assert_includes link, "sort=type"
    assert_includes link, "direction=asc"
    assert_includes link, ">Type</a>"
  end

  test "the column sorted ascending offers descending, and shows an up arrow" do
    params[:sort] = "type"
    params[:direction] = "asc"

    link = doctor_question_sort_link("type", "Type")

    assert_includes link, "direction=desc"
    assert_includes link, "Type ▲"
  end

  test "the column sorted descending offers ascending again, and shows a down arrow" do
    params[:sort] = "type"
    params[:direction] = "desc"

    link = doctor_question_sort_link("type", "Type")

    assert_includes link, "direction=asc"
    assert_includes link, "Type ▼"
  end

  # The arrow marks which column is sorted, so it must not appear on the others.
  test "other columns show no arrow while one column is sorted" do
    params[:sort] = "type"
    params[:direction] = "desc"

    link = doctor_question_sort_link("question", "Question")

    assert_includes link, ">Question</a>"
    assert_includes link, "direction=asc"
  end
end
