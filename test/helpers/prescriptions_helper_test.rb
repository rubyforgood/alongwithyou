require "test_helper"

class PrescriptionsHelperTest < ActionView::TestCase
  # The four states the sub-note under the Started column has to cover. The
  # last one is the one that used to render blank, which read as a broken cell
  # rather than as a missing stop date.
  test "still being taken, with no end in sight" do
    assert_equal "ongoing", prescription_stopped(prescription(active: true, stop_date: nil))
  end

  test "still being taken, with an end already planned" do
    assert_equal "until Jan 19, 2026",
      prescription_stopped(prescription(active: true, stop_date: Date.new(2026, 1, 19)))
  end

  test "no longer being taken, and we know when it ended" do
    assert_equal "stopped Jan 19, 2026",
      prescription_stopped(prescription(active: false, stop_date: Date.new(2026, 1, 19)))
  end

  test "no longer being taken, and nobody wrote down when" do
    assert_equal "no stop date recorded",
      prescription_stopped(prescription(active: false, stop_date: nil))
  end

  test "a missing start date is dashed rather than left blank" do
    assert_equal "—", prescription_started(prescription(start_date: nil))
  end

  test "status says the word, not the boolean" do
    assert_match "Active", prescription_status(prescription(active: true))
    assert_match "Stopped", prescription_status(prescription(active: false))
  end

  private
    def prescription(**attributes)
      Prescription.new(attributes.reverse_merge(medication: medications(:one)))
    end
end
