# Example resource, wired end to end to the Expo app in mobile/.
# Rename or replace it once the real domain model takes shape.
class Task < ApplicationRecord
  validates :title, presence: true, length: { maximum: 255 }

  scope :newest_first, -> { order(created_at: :desc) }
end
