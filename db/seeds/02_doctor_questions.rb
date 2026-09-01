# Questions a patient might want to take into an appointment, grouped by the
# type they belong to. The hash defines the types too - there is no separate
# list to keep in step with this one.
#
# Order matters: questions are created in the order written here, and the index
# falls back to created_at within a type, so this is the order a patient sees.
questions_by_type = {
  "Health concern" => [
    "What is my diagnosis?",
    "Do I need any more tests to confirm the diagnosis?",
    "What is changing?",
    "What are my treatment options? What are the benefits of each option? What are the side effects or complications of each option?",
    "What if I choose to do nothing?",
    "How soon do I need to make a decision?",
    "What will the medicine you are prescribing do? How do I take it? Are there any side effects? How long will I need to take the medicine?",
    "Why do I need surgery? Are there other ways to treat my condition? How often do you perform this surgery?",
    "What are the costs involved in the treatment?",
    "Do I need to change my daily routine? Do I need special help at home? Can I drive?",
    "What is the outlook for my future?"
  ],

  "Diagnostic tests" => [
    "What is the test for?",
    "How is the test done?",
    "How accurate is the test?",
    "What are the possible complications?",
    "Is the test the only way to find out that information?",
    "What do I need to do to prepare for the test?",
    "Will I be able to drive myself home after the test?",
    "When will I get the results?",
    "What will the results tell me?",
    "What is the next step after the tests?"
  ],

  "Surgery" => [
    "Why do I need the surgery?",
    "What does the surgery involve?",
    "What are the potential complications?",
    "Is there some other way to treat my condition?",
    "Who will do the surgery? How many times have they done this surgery?",
    "Which hospital is best for the surgery?",
    "Will I need anesthesia?",
    "How long will it take me to recover?",
    "How long will I be in the hospital?",
    "What will happen after the surgery? Will I need special help at home? Will I be able to drive?",
    "What will happen if I wait or do not have the surgery?"
  ],

  "Insurance" => [
    "Is this visit/procedure/test covered by my insurance plan? Do you anticipate any problems with my insurance?",
    "Is this provider in-network for both the health care provider and the facility/hospital?",
    "Do I need a referral or prior authorization before this visit/test/procedure? If authorization is needed, will your office handle it, or do I need to contact my insurer first?"
  ],

  "Costs" => [
    "What is the estimated total cost for the visit/procedure/test?",
    "What portion is typically deductible, copay or coinsurance?",
    "What is my estimated out-of-pocket cost specifically?",
    "Is there anything else about cost that patients are usually surprised by in this situation?"
  ]
}

questions_by_type.each do |type_name, questions|
  type = DoctorQuestionType.find_or_create_by!(name: type_name)

  questions.each do |question|
    type.doctor_questions.find_or_create_by!(question: question)
  end
end
