require "test_helper"

class MedicationTest < ActiveSupport::TestCase
  test "requires a name" do
    assert_not Medication.new(side_effects: "Nausea").valid?
  end

  test "does not require a medication type" do
    assert Medication.new(name: "Aspirin").valid?
  end

  test "refuses to be destroyed while a prescription points at it" do
    medication = medications(:one)

    assert_not medication.destroy
    assert medication.errors.any?
  end
end
