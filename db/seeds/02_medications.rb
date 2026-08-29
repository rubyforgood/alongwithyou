# The medication catalog from issue #164. Looked up by name so re-seeding an
# existing database tops it up instead of duplicating it.
[
  "Prescription",
  "Over-the-counter",
  "Vitamin or supplement",
  "Herbal or natural"
].each { |name| MedicationType.find_or_create_by!(name: name) }

[
  "Capsule",
  "Liquid",
  "Suspension",
  "Syrup",
  "Chewable tablet",
  "Dissolvable tablet",
  "Powder",
  "Injection",
  "Inhaler",
  "Nebulizer solution",
  "Patch",
  "Cream",
  "Ointment",
  "Gel",
  "Drops",
  "Suppository",
  "Spray"
].each { |name| MedicationForm.find_or_create_by!(name: name) }

{
  "Lisinopril" => "Dry cough, dizziness, headache",
  "Atorvastatin" => "Muscle aches, nausea, joint pain",
  "Metformin" => "Nausea, diarrhea, stomach upset",
  "Levothyroxine" => "Weight changes, insomnia, tremor",
  "Amlodipine" => "Swollen ankles, flushing, fatigue",
  "Metoprolol" => "Fatigue, dizziness, slow heartbeat",
  "Omeprazole" => "Headache, gas, constipation",
  "Albuterol" => "Jitteriness, rapid heartbeat, headache",
  "Gabapentin" => "Drowsiness, dizziness, coordination problems",
  "Sertraline" => "Nausea, insomnia, dry mouth",
  "Ibuprofen" => "Stomach upset, heartburn, dizziness",
  "Acetaminophen" => "Nausea, rash",
  "Amoxicillin" => "Diarrhea, nausea, rash",
  "Prednisone" => "Increased appetite, insomnia, mood changes",
  "Warfarin" => "Easy bruising, bleeding, nausea"
}.each do |name, side_effects|
  Medication.find_or_create_by!(name: name) { |medication| medication.side_effects = side_effects }
end
