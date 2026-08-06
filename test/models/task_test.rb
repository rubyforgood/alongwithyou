require "test_helper"

class TaskTest < ActiveSupport::TestCase
  test "requires a title" do
    task = Task.new(title: " ")

    assert_not task.valid?
    assert_includes task.errors[:title], "can't be blank"
  end

  test "rejects an overlong title" do
    assert_not Task.new(title: "a" * 256).valid?
    assert Task.new(title: "a" * 255).valid?
  end

  test "defaults to incomplete" do
    assert_not Task.create!(title: "Something").completed
  end

  test "rejects a completed flag that is neither true nor false" do
    task = Task.new(title: "Something", completed: nil)

    assert_not task.valid?
    assert_includes task.errors[:completed], "must be true or false"
  end

  test "accepts anything that casts to a boolean" do
    assert Task.new(title: "Something", completed: "1").valid?
    assert Task.new(title: "Something", completed: "0").valid?
  end

  test "newest_first orders by creation time descending" do
    older = Task.create!(title: "Older", created_at: 2.days.ago)
    newer = Task.create!(title: "Newer", created_at: 1.day.ago)

    ordered = Task.where(id: [ older.id, newer.id ]).newest_first

    assert_equal [ newer, older ], ordered.to_a
  end
end
