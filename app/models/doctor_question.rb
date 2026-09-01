class DoctorQuestion < ApplicationRecord
  belongs_to :doctor_question_type

  validates :question, presence: true, length: { maximum: 1000 }

  # A whitelist, not a lookup table: params never reach the Arel.sql below.
  SORT_COLUMNS = {
    "type" => "doctor_question_types.name",
    "question" => "doctor_questions.question"
  }.freeze

  DEFAULT_SORT = "type"

  scope :sorted_by, ->(column, direction) {
    column = SORT_COLUMNS.fetch(column) { SORT_COLUMNS.fetch(DEFAULT_SORT) }
    direction = direction == "desc" ? "desc" : "asc"

    # references forces the LEFT JOIN that ordering on the types table needs;
    # includes on its own would load them in a second query with nothing to sort
    # on. created_at settles rows the chosen column ties on, so questions stay
    # in the order they were added within a type rather than an arbitrary one.
    includes(:doctor_question_type)
      .references(:doctor_question_types)
      .order(Arel.sql("#{column} #{direction}"))
      .order(:created_at)
  }
end
