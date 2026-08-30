require "test_helper"

class MedicationTypeTest < ActiveSupport::TestCase
  test "requires a name" do
    assert_not MedicationType.new.valid?
  end

  test "leaves its medications behind when destroyed" do
    medication = medications(:one)

    medication.medication_type.destroy

    assert_nil medication.reload.medication_type_id
  end
end
