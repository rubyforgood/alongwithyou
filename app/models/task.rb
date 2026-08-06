# Example resource, wired end to end to the Expo app in mobile/.
# Rename or replace it once the real domain model takes shape.
class Task < ApplicationRecord
  validates :title, presence: true, length: { maximum: 255 }

  # The column is NOT NULL, so a client sending an explicit null - or anything
  # that casts to nil, like "" - would otherwise reach the database and raise
  # ActiveRecord::NotNullViolation, which is a 500 in HTML rather than a 422 in
  # JSON.
  validates :completed, inclusion: { in: [ true, false ], message: "must be true or false" }

  scope :newest_first, -> { order(created_at: :desc) }
end
