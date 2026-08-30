require "test_helper"

class PrescriptionTest < ActiveSupport::TestCase
  test "requires a medication" do
    assert_not Prescription.new(dosage: "10 mg").valid?
  end

  test "starts out active" do
    assert Prescription.new(medication: medications(:one)).active?
  end

  test "does not require a form" do
    assert Prescription.new(medication: medications(:one)).valid?
  end
end
