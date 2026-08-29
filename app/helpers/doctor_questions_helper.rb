module DoctorQuestionsHelper
  # A column heading that links back to the index with the sort it should apply.
  # Clicking the column already sorted flips the direction; clicking any other
  # starts it ascending.
  def doctor_question_sort_link(column, label)
    sorting_by_this = params[:sort].to_s == column
    descending = params[:direction].to_s == "desc"

    direction = sorting_by_this && !descending ? "desc" : "asc"
    arrow = sorting_by_this ? (descending ? " ▼" : " ▲") : ""

    link_to "#{label}#{arrow}", doctor_questions_path(sort: column, direction: direction)
  end
end
